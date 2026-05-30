'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import { Difficulty } from './types';
import { SudokuBoard } from './SudokuBoard';
import { LiveCoach } from './LiveCoach';
import { LeaderboardTab } from './tabs/LeaderboardTab';
import { LobbyTab } from './tabs/LobbyTab';
import { ProfileTab } from './tabs/ProfileTab';
import { soundEffects } from './soundEffects';
import {
  Grid3X3,
  Play,
  RotateCcw,
  Undo2,
  CheckCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Users,
  Award,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const SudokuShell: React.FC = () => {
  const {
    game,
    room,
    isConnected,
    isMuted,
    setIsMuted,
    setDifficulty,
    setGeneratorType,
    startGame,
    selectCell,
    setCellValue,
    toggleNote,
    undo,
    check,
    solveGame,
    resetGame,
    tickTimer,
    nickname,
    setNickname,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'play' | 'lobby' | 'leaderboard' | 'profile'>('play');
  const [noteMode, setNoteMode] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Timer Tick Side-effect
  useEffect(() => {
    if (game.status !== 'playing') return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [game.status, tickTimer]);

  const handleKeyPress = (digit: number) => {
    soundEffects.play('click');
    if (noteMode) {
      toggleNote(digit);
    } else {
      void setCellValue(digit);
    }
  };

  const handleClear = () => {
    soundEffects.play('click');
    void setCellValue(0);
  };

  const handleAction = (type: 'undo' | 'check' | 'solve' | 'reset') => {
    soundEffects.play('click');
    if (type === 'undo') undo();
    if (type === 'check') check();
    if (type === 'solve') solveGame();
    if (type === 'reset') resetGame();
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const difficulties: Difficulty[] = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Expert'];

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEffects.setMute(nextMuted);
  };

  return (
    <div className="absolute inset-0 bg-[#0b0f19] text-slate-100 overflow-hidden flex flex-col font-sans select-none border border-t-0 border-white/5 shadow-2xl">
      {/* Header bar */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 z-20 shrink-0 bg-slate-950/20 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <Grid3X3 className="w-5 h-5 text-indigo-500 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-black tracking-widest bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent truncate">
              MIND SUDOKU AI
            </h1>
            <p className="text-[9px] text-white/30 uppercase tracking-wider truncate font-semibold">
              {activeTab === 'play' ? 'Gameplay Portal' : activeTab}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-white/50 shrink-0">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full transition-shadow duration-300',
                isConnected
                  ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                  : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
              )}
            />
            {isConnected ? 'Server Linked' : 'Offline Mode'}
          </span>
          <button
            type="button"
            onClick={handleMuteToggle}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/70 transition"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left App Sidebar */}
        <nav className="w-56 border-r border-white/5 bg-slate-950/40 flex flex-col gap-1 p-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('play')}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition uppercase tracking-wider text-left',
              activeTab === 'play'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'hover:bg-white/5 text-slate-400 hover:text-white'
            )}
          >
            <Play size={14} />
            Solo Play
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lobby')}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition uppercase tracking-wider text-left',
              activeTab === 'lobby'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'hover:bg-white/5 text-slate-400 hover:text-white'
            )}
          >
            <Users size={14} />
            Co-op Arena
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition uppercase tracking-wider text-left',
              activeTab === 'leaderboard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'hover:bg-white/5 text-slate-400 hover:text-white'
            )}
          >
            <Award size={14} />
            Leaderboards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition uppercase tracking-wider text-left',
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'hover:bg-white/5 text-slate-400 hover:text-white'
            )}
          >
            <User size={14} />
            Profile Stats
          </button>

          {/* Quick User card */}
          <div className="mt-auto p-4 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col gap-2">
            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500/40"
            />
          </div>
        </nav>

        {/* Tab content viewports */}
        <div className="flex-1 flex overflow-hidden bg-slate-950/20 relative">
          {activeTab === 'lobby' && <LobbyTab />}
          {activeTab === 'leaderboard' && <LeaderboardTab />}
          {activeTab === 'profile' && <ProfileTab />}

          {activeTab === 'play' && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto p-6 gap-6 justify-center items-stretch lg:items-start min-h-0">
              {/* Left Board Grid Column */}
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 max-w-lg">
                {game.status === 'idle' ? (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 bg-slate-900/10 p-8 rounded-2xl text-center text-slate-500 min-h-[350px] w-full">
                    <Grid3X3 size={48} className="text-slate-700 mb-4 stroke-1 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-400">Initialize Sudoku Matrix</h3>
                    <p className="text-xs text-slate-650 max-w-[280px] mt-1.5 leading-relaxed">
                      Select your difficulty on the right pane, then choose AI or local backtracking
                      to spin up your matrix!
                    </p>
                  </div>
                ) : game.status === 'generating' ? (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-slate-800 bg-slate-900/10 p-8 rounded-2xl text-center text-slate-500 min-h-[350px] w-full gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                      Gemini is Generating...
                    </span>
                    <p className="text-[10px] text-slate-600 max-w-[200px] leading-tight">
                      AI is building a mathematically unique grid based on your difficulty request.
                    </p>
                  </div>
                ) : (
                  <SudokuBoard />
                )}

                {/* Status Bar */}
                {game.status === 'won' && (
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs text-center font-bold w-full animate-bounce">
                    🎉 Outstanding! You completed the Sudoku board in {formatTimer(game.timer)}!
                  </div>
                )}
                {game.status === 'lost' && (
                  <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs text-center font-bold w-full">
                    💔 Game Over! You made 3 mistakes. Better luck next time!
                  </div>
                )}
              </div>

              {/* Right Panel Control Column */}
              <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
                {/* Timer & Mistakes Ratios */}
                <div className="bg-slate-900/70 border border-slate-850 p-4 rounded-xl flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-500" />
                    <span className="text-lg font-black text-white font-mono leading-none">
                      {formatTimer(game.timer)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider mr-1">
                      Mistakes
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((m) => (
                        <span
                          key={m}
                          className={cn(
                            'h-2 w-2 rounded-full border',
                            game.mistakes >= m
                              ? 'bg-rose-500 border-rose-400 shadow-[0_0_6px_#f43f5e]'
                              : 'bg-slate-950 border-slate-800'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Input Keypad */}
                {game.status === 'playing' && (
                  <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Tap Keypad
                      </span>
                      <button
                        type="button"
                        onClick={() => setNoteMode(!noteMode)}
                        className={cn(
                          'px-2.5 py-1 rounded text-[10px] uppercase font-bold transition border',
                          noteMode
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        )}
                      >
                        Pencil Notes: {noteMode ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                        <button
                          key={digit}
                          type="button"
                          onClick={() => handleKeyPress(digit)}
                          className="h-12 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center font-bold text-lg font-mono text-white transition active:scale-95 shadow-md"
                        >
                          {digit}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="w-full py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs transition"
                    >
                      Clear Cell
                    </button>
                  </div>
                )}

                {/* Board actions */}
                {game.status === 'playing' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction('undo')}
                      className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-1.5 text-xs text-slate-300 font-bold transition"
                    >
                      <Undo2 size={13} />
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction('check')}
                      className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-1.5 text-xs text-slate-300 font-bold transition"
                    >
                      <CheckCircle size={13} />
                      Check
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction('reset')}
                      className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-1.5 text-xs text-slate-300 font-bold transition"
                    >
                      <RotateCcw size={13} />
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction('solve')}
                      className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-1.5 text-xs text-slate-300 font-bold transition"
                    >
                      <HelpCircle size={13} />
                      Solve
                    </button>
                  </div>
                )}

                {/* Match Details Display */}
                {game.status === 'playing' && game.themeName && (
                  <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex flex-col gap-2">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Puzzle Insights
                    </div>
                    <div className="text-xs font-bold text-white italic truncate">
                      &quot;{game.themeName}&quot;
                    </div>
                    {game.techniques && game.techniques.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {game.techniques.map((tech) => (
                          <span
                            key={tech}
                            className="px-1.5 py-0.5 rounded bg-slate-950 text-[9px] text-indigo-400 font-bold uppercase border border-slate-850"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Generator Options */}
                <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl flex flex-col gap-3">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Generator Settings
                  </div>

                  {/* Difficulty Select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase">
                      Difficulty
                    </label>
                    <select
                      value={game.difficulty}
                      onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500/40"
                    >
                      {difficulties.map((diff) => (
                        <option key={diff} value={diff}>
                          {diff}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Generator Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase">
                      Complexity Solver
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setGeneratorType('local')}
                        className={cn(
                          'px-2 py-1 rounded text-[10px] uppercase font-bold transition border',
                          game.generatorType === 'local'
                            ? 'bg-slate-800 border-slate-700 text-indigo-400'
                            : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-white'
                        )}
                      >
                        Local Math
                      </button>
                      <button
                        type="button"
                        onClick={() => setGeneratorType('ai')}
                        className={cn(
                          'px-2 py-1 rounded text-[10px] uppercase font-bold transition border flex items-center justify-center gap-1',
                          game.generatorType === 'ai'
                            ? 'bg-slate-850 border-slate-750 text-indigo-400'
                            : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-white'
                        )}
                      >
                        <Sparkles size={10} />
                        Gemini AI
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={startGame}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
                  >
                    Generate Puzzle
                  </button>
                </div>

                {/* Gemini Live voice coach */}
                {game.status === 'playing' && <LiveCoach />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default SudokuShell;
