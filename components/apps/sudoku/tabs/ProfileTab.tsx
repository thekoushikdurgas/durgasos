import React from 'react';
import { useStore } from '../store';
import { ScoreChart } from '../ScoreChart';
import { Trophy, Clock, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ProfileTab: React.FC = () => {
  const { profileStats, nickname } = useStore();
  const sp = profileStats.singlePlayer;
  const mp = profileStats.multiplayer;

  const formatDuration = (secs: number) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 h-full font-sans select-none text-slate-200">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-2xl shadow-lg border border-white/10">
          {nickname.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">{nickname}</h2>
          <p className="text-xs text-slate-500 uppercase font-black tracking-wider">
            Sudoku Practitioner
          </p>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Puzzles Solved</span>
            <Trophy size={14} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{sp.solved}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Best Time</span>
            <Clock size={14} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {sp.bestTime ? formatDuration(sp.bestTime) : '—'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Avg Time</span>
            <Zap size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {sp.averageTime ? formatDuration(sp.averageTime) : '—'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Lobby Wins</span>
            <Star size={14} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {mp.wins} / {mp.totalGames}
          </div>
        </div>
      </div>

      {/* Analytics Chart */}
      <ScoreChart />

      {/* Achievements Section */}
      <div>
        <h3 className="text-sm font-black uppercase text-indigo-400/80 tracking-widest mb-3">
          Achievements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profileStats.achievements.map((ach) => {
            const unlocked = !!ach.unlockedAt;
            return (
              <div
                key={ach.id}
                className={cn(
                  'p-4 rounded-xl border flex items-center gap-4 transition-all duration-200',
                  unlocked
                    ? 'bg-slate-900 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
                    : 'bg-slate-900/40 border-slate-800 opacity-60'
                )}
              >
                <span className="text-3xl filter drop-shadow-md select-none">
                  {unlocked ? ach.icon : '🔒'}
                </span>
                <div>
                  <h4
                    className={cn(
                      'text-sm font-black leading-tight',
                      unlocked ? 'text-white' : 'text-slate-500'
                    )}
                  >
                    {ach.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-tight">{ach.description}</p>
                  {unlocked && ach.unlockedAt && (
                    <span className="text-[9px] text-indigo-400/60 font-bold uppercase mt-1 block">
                      Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default ProfileTab;
