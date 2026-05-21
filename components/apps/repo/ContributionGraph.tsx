'use client';

import { useMemo, useState } from 'react';
import { X, GitCommit, GitPullRequest, CircleDot } from 'lucide-react';

type DayDetails = {
  dateString: string;
  count: number;
  repos: { name: string; count: number; type: 'commit' | 'pr' | 'issue' }[];
};

const WEEKS = 52;
const DAYS = 7;

export function ContributionGraph() {
  const [year] = useState(() => new Date().getFullYear());
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayDetails | null>(null);

  // Generate deterministic contributions for the grid
  const cells = useMemo(() => {
    const arr = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - WEEKS * DAYS + 1);

    for (let i = 0; i < WEEKS * DAYS; i++) {
      // Deterministic quasi-random distribution
      const rawCount = Math.floor(Math.abs(Math.sin(i * 12.9898)) * 12);
      let level = 0;
      let count = 0;

      if (rawCount > 9) {
        level = 4;
        count = rawCount;
      } else if (rawCount > 6) {
        level = 3;
        count = rawCount;
      } else if (rawCount > 3) {
        level = 2;
        count = rawCount;
      } else if (rawCount > 0) {
        level = 1;
        count = rawCount;
      }

      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateString = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      arr.push({ level, count, dateString });
    }
    return arr;
  }, []);

  const months = useMemo(() => {
    const m = [];
    const date = new Date();
    // Start 11 months ago
    date.setMonth(date.getMonth() - 11);
    for (let i = 0; i < 12; i++) {
      m.push(date.toLocaleString('default', { month: 'short' }));
      date.setMonth(date.getMonth() + 1);
    }
    return m;
  }, []);

  const handleMouseEnter = (e: React.MouseEvent, count: number, dateString: string) => {
    const target = e.currentTarget as HTMLButtonElement;
    const rect = target.getBoundingClientRect();
    const parentEl = target.closest('[data-graph-container]');
    if (parentEl) {
      const parentRect = parentEl.getBoundingClientRect();
      setTooltip({
        visible: true,
        x: rect.left - parentRect.left + rect.width / 2,
        y: rect.top - parentRect.top,
        text: `${count === 0 ? 'No' : count} contributions on ${dateString}`,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => (prev ? { ...prev, visible: false } : null));
  };

  const handleCellClick = (count: number, dateString: string) => {
    if (count === 0) {
      setSelectedDay({
        dateString,
        count,
        repos: [],
      });
      return;
    }

    const hash = dateString.length + count;
    const allRepos = [
      { name: 'durgasos-shell', type: 'commit' as const },
      { name: 'ai-studio-agent', type: 'pr' as const },
      { name: 'glassmorphic-ui-components', type: 'issue' as const },
      { name: 'nextjs-desktop-electron', type: 'commit' as const },
    ];

    const numRepos = (hash % 3) + 1;
    let remaining = count;
    const repos = [];

    for (let i = 0; i < numRepos; i++) {
      if (i === numRepos - 1) {
        repos.push({
          ...allRepos[(hash + i) % allRepos.length],
          count: remaining,
        });
      } else {
        const thisCount = Math.max(1, Math.floor(remaining / 2));
        repos.push({
          ...allRepos[(hash + i) % allRepos.length],
          count: thisCount,
        });
        remaining -= thisCount;
      }
    }

    setSelectedDay({
      dateString,
      count,
      repos,
    });
  };

  const levelClasses: Record<number, string> = {
    0: 'bg-white/[0.04] border-white/5',
    1: 'bg-emerald-500/25 border-emerald-500/10',
    2: 'bg-emerald-500/45 border-emerald-500/20',
    3: 'bg-emerald-500/65 border-emerald-500/30',
    4: 'bg-emerald-500/85 border-emerald-500/40',
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 font-sans text-xs text-white/90"
      data-graph-container
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/85">Contribution Heatmap</h4>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40">{year} contributions</span>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-none">
        <div className="min-w-max pb-2">
          {/* Months header */}
          <div className="mb-1 flex gap-[3px] pl-[26px]">
            {months.map((m, i) => (
              <div key={i} className="w-[34px] text-[10px] text-white/40">
                {m}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Days label */}
            <div className="flex flex-col justify-between py-1 text-[9px] text-white/35">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* Grid */}
            <div className="flex gap-[3px]">
              {Array.from({ length: WEEKS }).map((_, w) => (
                <div key={w} className="flex flex-col gap-[3px]">
                  {Array.from({ length: DAYS }).map((_, d) => {
                    const idx = w * DAYS + d;
                    const cell = cells[idx];
                    if (!cell) return null;
                    return (
                      <button
                        key={d}
                        type="button"
                        onMouseEnter={(e) => handleMouseEnter(e, cell.count, cell.dateString)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleCellClick(cell.count, cell.dateString)}
                        className={`h-[9px] w-[9px] rounded-[1.5px] border cursor-pointer transition-all duration-150 hover:scale-125 hover:z-10 hover:border-white ${
                          levelClasses[cell.level]
                        }`}
                        aria-label={`${cell.count} contributions on ${cell.dateString}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-white/40 border-t border-white/5 pt-2">
        <span>Click cells to inspect detail drawer</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          <div className="h-[9px] w-[9px] rounded-[1.5px] border border-white/5 bg-white/[0.04]" />
          <div className="h-[9px] w-[9px] rounded-[1.5px] border border-emerald-500/10 bg-emerald-500/25" />
          <div className="h-[9px] w-[9px] rounded-[1.5px] border border-emerald-500/20 bg-emerald-500/45" />
          <div className="h-[9px] w-[9px] rounded-[1.5px] border border-emerald-500/30 bg-emerald-500/65" />
          <div className="h-[9px] w-[9px] rounded-[1.5px] border border-emerald-500/40 bg-emerald-500/85" />
          <span>More</span>
        </div>
      </div>

      {/* Tooltip Portal */}
      {tooltip && tooltip.visible && (
        <div
          className="absolute z-[100] -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 border border-white/10 px-2.5 py-1.5 text-[10px] font-medium text-white shadow-xl pointer-events-none transition-all duration-75"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          {tooltip.text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-slate-900" />
        </div>
      )}

      {/* Drawer */}
      <div
        className={`absolute inset-y-0 right-0 z-50 w-72 border-l border-white/15 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-in-out flex flex-col ${
          selectedDay ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedDay && (
          <>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <div>
                <h5 className="font-semibold text-white/90">Daily Activity</h5>
                <span className="text-[10px] text-white/40">{selectedDay.dateString}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-lg border border-white/10 p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              <div className="mb-2">
                <span className="text-xl font-bold text-white">
                  {selectedDay.count === 0 ? 'No' : selectedDay.count}
                </span>
                <span className="text-white/60 ml-1">contributions</span>
              </div>

              {selectedDay.repos.length > 0 ? (
                <div className="space-y-3">
                  {selectedDay.repos.map((repo, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="mt-1 relative flex flex-col items-center shrink-0">
                        {repo.type === 'commit' && (
                          <GitCommit className="h-4.5 w-4.5 text-emerald-400 bg-slate-950 z-10" />
                        )}
                        {repo.type === 'pr' && (
                          <GitPullRequest className="h-4.5 w-4.5 text-violet-400 bg-slate-950 z-10" />
                        )}
                        {repo.type === 'issue' && (
                          <CircleDot className="h-4.5 w-4.5 text-amber-400 bg-slate-950 z-10" />
                        )}
                      </div>
                      <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                        <div className="flex justify-between items-start gap-1 mb-1">
                          <span className="font-semibold text-sky-300 truncate text-[11px]">
                            {repo.name}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.2 text-[9px] font-medium text-white/60">
                            {repo.count}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/50">
                          {repo.type === 'commit' &&
                            `Committed ${repo.count} patch${repo.count !== 1 ? 'es' : ''}`}
                          {repo.type === 'pr' &&
                            `Submitted ${repo.count} pull request${repo.count !== 1 ? 's' : ''}`}
                          {repo.type === 'issue' &&
                            `Logged ${repo.count} bug report${repo.count !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-white/40 py-6">No detailed activity to show.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
