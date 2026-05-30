import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Difficulty } from '../types';
import { Trophy, Clock, Search, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LeaderboardTab: React.FC = () => {
  const { callRpc, isConnected } = useStore();
  const [filter, setFilter] = useState<Difficulty | 'Daily'>('Medium');
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadLeaderboard = async () => {
    if (!callRpc || !isConnected) return;
    setLoading(true);
    try {
      if (filter === 'Daily') {
        const res = await callRpc('sudoku.leaderboard.daily', { date_str: dailyDate });
        setScores(res?.scores || []);
      } else {
        const res = await callRpc('sudoku.leaderboard.get', { difficulty: filter });
        setScores(res?.scores || []);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, dailyDate, isConnected]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-amber-500/20 border-amber-500/40 text-amber-400';
    if (rank === 2) return 'bg-slate-400/20 border-slate-400/40 text-slate-300';
    if (rank === 3) return 'bg-amber-700/20 border-amber-700/40 text-amber-600';
    return 'bg-slate-800/40 border-slate-700/20 text-slate-400';
  };

  const filters: (Difficulty | 'Daily')[] = [
    'Very Easy',
    'Easy',
    'Medium',
    'Hard',
    'Expert',
    'Daily',
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 h-full font-sans select-none text-slate-200">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Trophy className="text-amber-500" size={22} />
            Challengers Board
          </h2>
          <p className="text-xs text-slate-500">
            Compare your scores globally and track the top Sudoku masters.
          </p>
        </div>

        {filter === 'Daily' && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <Calendar size={14} className="text-indigo-400" />
            <input
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              className="bg-transparent text-xs text-white border-none outline-none font-bold cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Difficulty filter tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-900/50 border border-slate-800/80">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider',
              filter === f
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            )}
          >
            {f === 'Daily' ? 'Daily Challenge' : f}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner flex-1 min-h-[300px] flex flex-col justify-start">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-slate-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-xs">Fetching rankings...</span>
          </div>
        ) : scores.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-slate-500">
            <Search size={28} className="text-slate-600" />
            <span className="text-xs font-bold">No scores recorded yet</span>
            <p className="text-[10px] text-slate-600 max-w-[200px] text-center">
              Be the first to submit a record for this category!
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-500 uppercase tracking-widest text-[9px] font-black">
                <th className="px-5 py-3.5 w-16 text-center">Rank</th>
                <th className="px-4 py-3.5">Name</th>
                {filter === 'Daily' ? null : <th className="px-4 py-3.5 w-24">Difficulty</th>}
                <th className="px-4 py-3.5 w-28 text-right">Time Taken</th>
                <th className="px-5 py-3.5 w-28 text-right">Solve Score</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((row, index) => (
                <tr
                  key={row.id || index}
                  className="border-b border-slate-800/40 hover:bg-slate-850/20 transition-colors"
                >
                  <td className="px-5 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black border',
                        getRankBadge(index + 1)
                      )}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white truncate max-w-[150px]">
                    {row.player_name}
                  </td>
                  {filter === 'Daily' ? null : (
                    <td className="px-4 py-3 font-medium text-slate-400">{row.difficulty}</td>
                  )}
                  <td className="px-4 py-3 text-right font-mono text-slate-400">
                    {formatTime(row.time)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-black text-indigo-400 text-sm">
                    {row.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default LeaderboardTab;
