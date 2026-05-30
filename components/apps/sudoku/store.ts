import { create } from 'zustand';
import {
  BoardData,
  Difficulty,
  BoardTheme,
  GameState,
  RoomState,
  ProfileStats,
  CustomToast,
} from './types';
import { generatePuzzle, checkBoard, isGameComplete } from './sudoku';

interface StoreState {
  // Toasts
  toasts: CustomToast[];
  addToast: (toast: Omit<CustomToast, 'id' | 'timestamp'>) => void;
  dismissToast: (id: string) => void;

  // Connection
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
  callRpc: ((method: string, params: Record<string, any>) => Promise<any>) | null;
  setCallRpc: (callRpc: (method: string, params: Record<string, any>) => Promise<any>) => void;

  // User Nickname/Avatar
  nickname: string;
  avatar: string;
  setNickname: (nickname: string) => void;

  // Single Player Game
  game: GameState;
  setDifficulty: (diff: Difficulty) => void;
  setGeneratorType: (type: 'local' | 'ai') => void;
  startGame: () => Promise<void>;
  startDailyGame: (dateStr: string) => void;
  selectCell: (row: number, col: number) => void;
  setCellValue: (value: number) => Promise<void>;
  toggleNote: (value: number) => void;
  undo: () => void;
  check: () => void;
  solveGame: () => void;
  resetGame: () => void;
  tickTimer: () => void;

  // Multiplayer
  room: RoomState;
  setRoom: (room: RoomState) => void;
  createRoom: (name: string, difficulty: Difficulty) => Promise<string>;
  joinRoom: (roomId: string, name: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;

  // Profile Stats
  profileStats: ProfileStats;
  loadProfile: () => Promise<void>;
  saveProfile: (stats: ProfileStats) => Promise<void>;
  unlockAchievement: (id: string) => void;

  // Board Theme settings
  boardTheme: BoardTheme;
  setBoardTheme: (theme: BoardTheme) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

const INITIAL_GAME: GameState = {
  board: [],
  initialBoard: [],
  solution: [],
  difficulty: 'Medium',
  status: 'idle',
  timer: 0,
  mistakes: 0,
  selectedCell: null,
  history: [],
  generatorType: 'local',
  themeName: 'Classical Grid',
  techniques: ['Analytical Scanning'],
};

const INITIAL_STATS: ProfileStats = {
  singlePlayer: {
    solved: 0,
    averageTime: 0,
    bestTime: 0,
    totalTime: 0,
    byDifficulty: { 'Very Easy': 0, Easy: 0, Medium: 0, Hard: 0, Expert: 0 },
    totalTimeByDifficulty: { 'Very Easy': 0, Easy: 0, Medium: 0, Hard: 0, Expert: 0 },
  },
  multiplayer: {
    wins: 0,
    losses: 0,
    totalGames: 0,
  },
  achievements: [
    { id: '1', title: 'First Steps', description: 'Solve your first Sudoku puzzle.', icon: '🏆' },
    {
      id: '2',
      title: 'Speed Demon',
      description: 'Solve a puzzle in under 5 minutes.',
      icon: '⚡',
    },
    {
      id: '3',
      title: 'Expert Solver',
      description: 'Solve an Expert difficulty puzzle.',
      icon: '🧠',
    },
    {
      id: '4',
      title: 'Social Butterfly',
      description: 'Play your first multiplayer game.',
      icon: '🦋',
    },
  ],
  recentScores: [],
};

export const useStore = create<StoreState>((set, get) => ({
  // Board Theme settings
  boardTheme:
    (typeof window !== 'undefined'
      ? (localStorage.getItem('durgasos_sudoku_boardTheme') as BoardTheme)
      : null) || 'Classic',
  setBoardTheme: (boardTheme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('durgasos_sudoku_boardTheme', boardTheme);
    }
    set({ boardTheme });
  },

  isMuted:
    typeof window !== 'undefined'
      ? localStorage.getItem('durgasos_sudoku_sound_muted') === 'true'
      : false,
  setIsMuted: (isMuted) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('durgasos_sudoku_sound_muted', isMuted ? 'true' : 'false');
    }
    set({ isMuted });
  },

  // Connection
  isConnected: false,
  setConnected: (isConnected) => set({ isConnected }),
  callRpc: null,
  setCallRpc: (callRpc) => set({ callRpc }),

  // User Nickname/Avatar
  nickname:
    (typeof window !== 'undefined' ? localStorage.getItem('durgasos_sudoku_nickname') : '') ||
    'Player',
  avatar:
    (typeof window !== 'undefined' ? localStorage.getItem('durgasos_sudoku_avatar') : '') ||
    `https://picsum.photos/40/40?seed=sudoku-${Math.random()}`,
  setNickname: (nickname) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('durgasos_sudoku_nickname', nickname);
    }
    set({ nickname });
  },

  // Toasts
  toasts: [],
  addToast: (toast) =>
    set((state) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(5)}`;
      const newToast: CustomToast = {
        ...toast,
        id,
        timestamp: Date.now(),
      };
      return {
        toasts: [...state.toasts, newToast],
      };
    }),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  game: INITIAL_GAME,
  room: { id: '', players: [], messages: [], status: 'waiting' },
  profileStats: INITIAL_STATS,

  setRoom: (room) => {
    const currentRoom = get().room;
    // Check if room just finished and we were playing
    const wasPlaying = get().game.status === 'playing';
    const isFinished = room.status === 'finished';

    const updateObj: any = { room };

    // Sync board value to game if multiplayer playing and updated by other player
    if (room.status === 'playing' && room.board && wasPlaying) {
      const localBoard = get().game.board;
      let boardUpdated = false;
      const nextBoard = localBoard.map((row, r) =>
        row.map((cell, c) => {
          const cloudVal = room.board![r][c];
          if (cell.value !== cloudVal && !cell.isInitial) {
            boardUpdated = true;
            return {
              ...cell,
              value: cloudVal,
              isError: false,
              notes: [],
            };
          }
          return cell;
        })
      );
      if (boardUpdated) {
        updateObj.game = {
          ...get().game,
          board: nextBoard,
          history: [...get().game.history, nextBoard],
        };
      }
    }

    if (isFinished && wasPlaying && currentRoom.id === room.id) {
      updateObj.game = {
        ...get().game,
        status: 'lost',
      };
      // Record loss in stats
      const stats = get().profileStats;
      const nextStats = {
        ...stats,
        multiplayer: {
          ...stats.multiplayer,
          losses: stats.multiplayer.losses + 1,
          totalGames: stats.multiplayer.totalGames + 1,
        },
      };
      get().saveProfile(nextStats);
    }

    set(updateObj);
  },

  setDifficulty: (difficulty) => set((state) => ({ game: { ...state.game, difficulty } })),
  setGeneratorType: (generatorType) => set((state) => ({ game: { ...state.game, generatorType } })),

  startDailyGame: (dateStr) => {
    let seed = 0;
    for (let i = 0; i < dateStr.length; i++) {
      seed = (seed << 5) - seed + dateStr.charCodeAt(i);
      seed |= 0;
    }
    const difficulty: Difficulty = 'Medium';
    const { board, solution } = generatePuzzle(difficulty, seed);

    const dailyGame: GameState = {
      ...INITIAL_GAME,
      board,
      initialBoard: JSON.parse(JSON.stringify(board)),
      solution,
      difficulty,
      status: 'playing',
      history: [board],
      generatorType: 'local',
      themeName: 'Daily Challenge Alignment',
      techniques: ['Symmetric Reduction', 'Analytical Scanning'],
      isDaily: true,
      dailyDateStr: dateStr,
    };
    set({ game: dailyGame });
  },

  startGame: async () => {
    const { difficulty, generatorType } = get().game;
    const { callRpc } = get();

    if (generatorType === 'ai' && callRpc) {
      set((state) => ({ game: { ...state.game, status: 'generating' } }));
      try {
        const res = await callRpc('sudoku.game.generate', { difficulty });
        if (res?.solution && res?.puzzle) {
          const boardData: BoardData = res.puzzle.map((row: number[]) =>
            row.map((val: number) => ({
              value: val,
              isInitial: val !== 0,
              notes: [],
              isError: false,
              isHint: false,
            }))
          );
          set({
            game: {
              ...INITIAL_GAME,
              board: boardData,
              initialBoard: JSON.parse(JSON.stringify(boardData)),
              solution: res.solution,
              difficulty,
              status: 'playing',
              history: [boardData],
              generatorType: 'ai',
              themeName: res.themeName,
              techniques: res.techniques,
            },
          });
          return;
        }
      } catch (err) {
        console.warn('AI generation failed, falling back:', err);
      }
    }

    // Local puzzle generation
    const { board, solution } = generatePuzzle(difficulty);
    set({
      game: {
        ...INITIAL_GAME,
        board,
        initialBoard: JSON.parse(JSON.stringify(board)),
        solution,
        difficulty,
        status: 'playing',
        history: [board],
        generatorType: 'local',
        themeName: 'Classical Grid (Local)',
        techniques: ['Analytical Scanning'],
      },
    });
  },

  selectCell: (row, col) =>
    set((state) => ({
      game: { ...state.game, selectedCell: [row, col] },
    })),

  setCellValue: async (value) => {
    const { game, room, profileStats, callRpc, nickname } = get();
    if (!game.selectedCell || game.status !== 'playing') return;
    const [r, c] = game.selectedCell;

    if (game.board[r][c].isInitial) return;

    const newBoard = JSON.parse(JSON.stringify(game.board));

    if (newBoard[r][c].value === value) {
      newBoard[r][c].value = 0;
    } else {
      newBoard[r][c].value = value;
      newBoard[r][c].notes = [];
    }

    let newMistakes = game.mistakes;
    const isError = value !== 0 && value !== game.solution[r][c];
    if (isError) {
      newMistakes += 1;
      newBoard[r][c].isError = true;
    } else {
      newBoard[r][c].isError = false;
    }

    const isWon = isGameComplete(newBoard, game.solution);
    const updatedStatus = isWon ? 'won' : newMistakes >= 3 ? 'lost' : 'playing';

    // Calculate progress (percentage of correctly filled cells)
    const totalEmpty = newBoard.flat().filter((cell: any) => !cell.isInitial).length;
    const correctFilled = newBoard
      .flat()
      .filter((cell: any) => !cell.isInitial && cell.value !== 0 && !cell.isError).length;
    const progressPerc = totalEmpty > 0 ? Math.round((correctFilled / totalEmpty) * 100) : 0;

    // Sync multiplayer moves
    if (room.id && room.status === 'playing' && callRpc) {
      // Sync progress
      void callRpc('sudoku.room.update_progress', {
        room_id: room.id,
        progress: progressPerc,
      }).catch(() => {});

      // Make board move if correct placement
      if (value !== 0 && !isError) {
        try {
          const updatedRoom = await callRpc('sudoku.room.make_move', {
            room_id: room.id,
            row: r,
            col: c,
            value,
          });
          if (updatedRoom) {
            set({ room: updatedRoom });
          }
        } catch (err) {
          console.error('Multiplayer move failed:', err);
        }
      }
    }

    if (isWon) {
      const isMultiplayer = room.players.length > 1;
      const newSolved = profileStats.singlePlayer.solved + 1;
      const newTotalTime = profileStats.singlePlayer.totalTime + game.timer;
      const newAverageTime = Math.round(newTotalTime / newSolved);
      const newBestTime =
        profileStats.singlePlayer.bestTime === 0
          ? game.timer
          : Math.min(profileStats.singlePlayer.bestTime, game.timer);

      const newByDifficulty = { ...profileStats.singlePlayer.byDifficulty };
      newByDifficulty[game.difficulty] = (newByDifficulty[game.difficulty] || 0) + 1;

      const newMultiplayer = { ...profileStats.multiplayer };
      if (isMultiplayer) {
        newMultiplayer.wins++;
        newMultiplayer.totalGames++;
      }

      const newAchievements = [...profileStats.achievements];
      if (newSolved === 1) {
        const ach = newAchievements.find((a) => a.id === '1');
        if (ach && !ach.unlockedAt) {
          ach.unlockedAt = Date.now();
          get().addToast({
            type: 'achievement',
            title: 'Achievement Unlocked!',
            description: ach.title,
            icon: ach.icon,
          });
        }
      }
      if (game.timer < 300) {
        const ach = newAchievements.find((a) => a.id === '2');
        if (ach && !ach.unlockedAt) {
          ach.unlockedAt = Date.now();
          get().addToast({
            type: 'achievement',
            title: 'Achievement Unlocked!',
            description: ach.title,
            icon: ach.icon,
          });
        }
      }
      if (game.difficulty === 'Expert') {
        const ach = newAchievements.find((a) => a.id === '3');
        if (ach && !ach.unlockedAt) {
          ach.unlockedAt = Date.now();
          get().addToast({
            type: 'achievement',
            title: 'Achievement Unlocked!',
            description: ach.title,
            icon: ach.icon,
          });
        }
      }
      if (isMultiplayer && newMultiplayer.totalGames === 1) {
        const ach = newAchievements.find((a) => a.id === '4');
        if (ach && !ach.unlockedAt) {
          ach.unlockedAt = Date.now();
          get().addToast({
            type: 'achievement',
            title: 'Achievement Unlocked!',
            description: ach.title,
            icon: ach.icon,
          });
        }
      }

      const baseScores: Record<Difficulty, number> = {
        'Very Easy': 500,
        Easy: 1000,
        Medium: 2500,
        Hard: 5000,
        Expert: 8000,
      };
      const base = baseScores[game.difficulty] || 2500;
      const penalty = Math.floor(game.timer * 1.5) + game.mistakes * 250;
      const gameScore = Math.max(300, base - penalty);

      const newRecentScores = [
        ...profileStats.recentScores,
        {
          id: `g-${Date.now()}`,
          date: Date.now(),
          score: gameScore,
          difficulty: game.difficulty,
          time: game.timer,
        },
      ];

      const currentTotalTimeByDifficulty = profileStats.singlePlayer.totalTimeByDifficulty || {
        'Very Easy': 0,
        Easy: 0,
        Medium: 0,
        Hard: 0,
        Expert: 0,
      };
      const newTotalTimeByDifficulty = { ...currentTotalTimeByDifficulty };
      newTotalTimeByDifficulty[game.difficulty] =
        (newTotalTimeByDifficulty[game.difficulty] || 0) + game.timer;

      const newStats: ProfileStats = {
        singlePlayer: {
          solved: newSolved,
          totalTime: newTotalTime,
          averageTime: newAverageTime,
          bestTime: newBestTime,
          byDifficulty: newByDifficulty,
          totalTimeByDifficulty: newTotalTimeByDifficulty,
        },
        multiplayer: newMultiplayer,
        achievements: newAchievements,
        recentScores: newRecentScores,
      };

      // Save to profile Stats
      void get().saveProfile(newStats);

      // Submit score to backend leaderboard
      if (callRpc) {
        void callRpc('sudoku.leaderboard.submit', {
          player_name: nickname,
          score: gameScore,
          difficulty: game.difficulty,
          time: game.timer,
          is_daily: !!game.isDaily,
          daily_date_str: game.dailyDateStr,
        }).catch(console.error);
      }
    }

    set((state) => ({
      game: {
        ...game,
        board: newBoard,
        mistakes: newMistakes,
        history: [...game.history, newBoard],
        status: updatedStatus,
      },
    }));
  },

  toggleNote: (value) => {
    const { game } = get();
    if (!game.selectedCell || game.status !== 'playing') return;
    const [r, c] = game.selectedCell;
    if (game.board[r][c].isInitial || game.board[r][c].value !== 0) return;

    const newBoard = JSON.parse(JSON.stringify(game.board));
    const notes = newBoard[r][c].notes;
    if (notes.includes(value)) {
      newBoard[r][c].notes = notes.filter((n: number) => n !== value);
    } else {
      newBoard[r][c].notes = [...notes, value].sort();
    }

    set({ game: { ...game, board: newBoard } });
  },

  undo: () => {
    const { game } = get();
    if (game.history.length <= 1) return;
    const newHistory = [...game.history];
    newHistory.pop();
    const previousBoard = newHistory[newHistory.length - 1];
    set({ game: { ...game, board: previousBoard, history: newHistory } });
  },

  check: () => {
    const { game } = get();
    const checkedBoard = checkBoard(game.board, game.solution);
    set({ game: { ...game, board: checkedBoard } });
  },

  solveGame: () => {
    const { game } = get();
    const solvedBoard = game.board.map((row, r) =>
      row.map((cell, c) => ({ ...cell, value: game.solution[r][c], notes: [], isError: false }))
    );
    set({ game: { ...game, board: solvedBoard, status: 'won' } });
  },

  resetGame: () => {
    const { game } = get();
    set({
      game: {
        ...game,
        board: game.initialBoard,
        mistakes: 0,
        timer: 0,
        history: [game.initialBoard],
        status: 'playing',
      },
    });
  },

  tickTimer: () =>
    set((state) => {
      if (state.game.status !== 'playing') return {};
      return { game: { ...state.game, timer: state.game.timer + 1 } };
    }),

  // Multiplayer Rooms over backend WebSockets
  createRoom: async (name, difficulty) => {
    const { callRpc } = get();
    if (!callRpc) throw new Error('WebSocket disconnected');

    const room = await callRpc('sudoku.room.create', { player_name: name, difficulty });
    if (!room) throw new Error('Failed to create room');

    const boardData: BoardData = room.board.map((row: number[]) =>
      row.map((val: number) => ({
        value: val,
        isInitial: val !== 0,
        notes: [],
        isError: false,
        isHint: false,
      }))
    );

    set({
      room,
      game: {
        ...INITIAL_GAME,
        board: boardData,
        initialBoard: JSON.parse(JSON.stringify(boardData)),
        solution: room.solution,
        difficulty,
        status: 'playing',
        history: [boardData],
      },
    });

    return room.roomId;
  },

  joinRoom: async (roomId, name) => {
    const { callRpc } = get();
    if (!callRpc) throw new Error('WebSocket disconnected');

    const room = await callRpc('sudoku.room.join', { room_id: roomId, player_name: name });
    if (!room) throw new Error('Failed to join room');

    const boardData: BoardData = room.board.map((row: number[]) =>
      row.map((val: number) => ({
        value: val,
        isInitial: val !== 0,
        notes: [],
        isError: false,
        isHint: false,
      }))
    );

    set({
      room,
      game: {
        ...INITIAL_GAME,
        board: boardData,
        initialBoard: JSON.parse(JSON.stringify(boardData)),
        solution: room.solution,
        difficulty: room.difficulty,
        status: 'playing',
        history: [boardData],
      },
    });
  },

  leaveRoom: async () => {
    const { room, callRpc } = get();
    if (room.id && callRpc) {
      try {
        await callRpc('sudoku.room.leave', { room_id: room.id });
      } catch (err) {
        console.error('Leave room failed:', err);
      }
    }
    set({
      room: { id: '', players: [], messages: [], status: 'waiting' },
      game: INITIAL_GAME,
    });
  },

  sendMessage: async (text) => {
    const { room, callRpc } = get();
    if (!room.id || !callRpc) return;
    await callRpc('sudoku.room.send_message', { room_id: room.id, text });
  },

  // Stats Profile Persistence over backend WebSockets
  loadProfile: async () => {
    const { callRpc } = get();
    if (!callRpc) return;

    try {
      const stats = await callRpc('sudoku.profile.get', {});
      if (stats) {
        // Hydrate from backend
        set({ profileStats: stats });
      }
    } catch (err) {
      console.warn('Failed to load profile, using local defaults:', err);
    }
  },

  saveProfile: async (stats) => {
    set({ profileStats: stats });
    const { callRpc } = get();
    if (callRpc) {
      try {
        await callRpc('sudoku.profile.save', stats);
      } catch (err) {
        console.error('Failed to save profile stats:', err);
      }
    }
  },

  unlockAchievement: (id) => {
    const stats = get().profileStats;
    const achievements = stats.achievements.map((a) => {
      if (a.id === id && !a.unlockedAt) {
        a.unlockedAt = Date.now();
        get().addToast({
          type: 'achievement',
          title: 'Achievement Unlocked!',
          description: a.title,
          icon: a.icon,
        });
      }
      return a;
    });
    void get().saveProfile({ ...stats, achievements });
  },
}));
