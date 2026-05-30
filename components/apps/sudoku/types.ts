export type Difficulty = 'Very Easy' | 'Easy' | 'Medium' | 'Hard' | 'Expert';
export type BoardTheme = 'Classic' | 'Neon' | 'Zen';

export interface CellData {
  value: number;
  isInitial: boolean;
  notes: number[];
  isError: boolean;
  isHint: boolean;
}

export type BoardData = CellData[][];

export interface GameState {
  board: BoardData;
  initialBoard: BoardData; // For resetting
  solution: number[][]; // For validation/solving
  difficulty: Difficulty;
  status: 'idle' | 'playing' | 'paused' | 'won' | 'lost' | 'generating';
  timer: number;
  mistakes: number;
  selectedCell: [number, number] | null;
  history: BoardData[]; // For Undo
  generatorType?: 'local' | 'ai';
  themeName?: string;
  techniques?: string[];
  isDaily?: boolean;
  dailyDateStr?: string;
}

export interface AIAnalysis {
  insights: string[];
  difficultyScore: number;
  nextStepSuggestion: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  progress: number; // 0-100
  isReady: boolean;
  connection_id?: string;
}

export interface RoomState {
  id: string;
  players: Player[];
  messages: ChatMessage[];
  status: 'waiting' | 'playing' | 'finished';
  creatorId?: string;
  currentTurnPlayerId?: string;
  board?: number[][];
  difficulty?: Difficulty;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export interface ProfileStats {
  singlePlayer: {
    solved: number;
    averageTime: number;
    bestTime: number;
    totalTime: number;
    byDifficulty: Record<Difficulty, number>;
    totalTimeByDifficulty?: Record<Difficulty, number>;
  };
  multiplayer: {
    wins: number;
    losses: number;
    totalGames: number;
  };
  achievements: Achievement[];
  recentScores: { id: string; date: number; score: number; difficulty: Difficulty; time: number }[];
}

export interface CustomToast {
  id: string;
  type: 'achievement' | 'info' | 'success';
  title: string;
  description: string;
  icon: string;
  timestamp: number;
}
