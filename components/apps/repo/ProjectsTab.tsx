'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Activity, GitCommit, BookOpen, Clock, Layers } from 'lucide-react';

const projects = [
  {
    id: 1,
    name: 'Q4 Frontend Roadmap',
    status: 'In Progress',
    updated: '2 hours ago',
    progress: 65,
    color: 'bg-emerald-500',
    border: 'border-emerald-500/25',
  },
  {
    id: 2,
    name: 'Design System Migration',
    status: 'Planning',
    updated: '1 day ago',
    progress: 15,
    color: 'bg-purple-500',
    border: 'border-purple-500/25',
  },
  {
    id: 3,
    name: 'Mobile App V2',
    status: 'Backlog',
    updated: '3 days ago',
    progress: 0,
    color: 'bg-blue-500',
    border: 'border-blue-500/25',
  },
  {
    id: 4,
    name: 'Backend Auth Rewrite',
    status: 'In Progress',
    updated: '5 hours ago',
    progress: 40,
    color: 'bg-orange-500',
    border: 'border-orange-500/25',
  },
  {
    id: 5,
    name: 'Marketing Site Launch',
    status: 'Done',
    updated: '1 week ago',
    progress: 100,
    color: 'bg-slate-400',
    border: 'border-slate-500/25',
  },
  {
    id: 6,
    name: 'Customer Portal V3',
    status: 'Planning',
    updated: '2 weeks ago',
    progress: 5,
    color: 'bg-pink-500',
    border: 'border-pink-500/25',
  },
];

export function ProjectsTab({ username, repos = [] }: { username: string; repos?: unknown }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Cast repo list safely
  const repoList = useMemo(() => {
    if (!Array.isArray(repos)) return [];
    return repos.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object');
  }, [repos]);

  const filteredProjects = useMemo(() => {
    const s = searchQuery.toLowerCase().trim();
    if (!s) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(s));
  }, [searchQuery]);

  // Compute repository statistics
  const stats = useMemo(() => {
    const total = repoList.length;
    const languages = repoList.reduce((acc: Record<string, number>, r) => {
      const lang = typeof r.language === 'string' ? r.language : null;
      if (lang && lang !== '—') {
        acc[lang] = (acc[lang] || 0) + 1;
      }
      return acc;
    }, {});

    const sortedLangs = Object.entries(languages).sort((a, b) => b[1] - a[1]);
    const topLanguage = sortedLangs[0] ? sortedLangs[0][0] : 'None';

    const localRepos = repoList.filter((r) => r.isLocal === true).length;
    const githubRepos = total - localRepos;

    return {
      total,
      topLanguage,
      localRepos,
      githubRepos,
    };
  }, [repoList]);

  // Generate simulated activities
  const recentActivities = useMemo(() => {
    const list: { id: string; type: string; repoName: string; message: string; date: Date }[] = [];

    repoList.forEach((r, idx) => {
      const name = typeof r.name === 'string' ? r.name : 'unknown-repo';
      const updated = typeof r.updated_at === 'string' ? r.updated_at : null;

      if (updated) {
        list.push({
          id: `act-${idx}`,
          type: idx % 2 === 0 ? 'commit' : 'push',
          repoName: name,
          message:
            idx % 2 === 0
              ? `Committed patch to improve shell layout`
              : `Pushed new revision to main branch`,
          date: new Date(updated),
        });
      }
    });

    // Fallback if no repos/dates
    if (list.length === 0) {
      const now = new Date();
      list.push(
        {
          id: 'mock-1',
          type: 'commit',
          repoName: 'durgasos-shell',
          message: 'Refactored dock system integration',
          date: new Date(now.getTime() - 3600000),
        },
        {
          id: 'mock-2',
          type: 'push',
          repoName: 'ai-studio-agent',
          message: 'Merged pull request #45 (theme-support)',
          date: new Date(now.getTime() - 7200000),
        }
      );
    }

    return list.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [repoList]);

  return (
    <div className="space-y-6 font-sans text-xs text-white/90">
      {/* Top Cards (Summary & Activity) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Repo Summary */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white/80 flex items-center gap-1.5 mb-4">
              <BookOpen className="h-4 w-4 text-violet-400" />
              Repository Summary
            </h4>
            <div className="flex flex-col items-center justify-center py-2">
              <span className="text-4xl font-bold text-white font-mono">{stats.total}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-wider mt-1">
                Total repos
              </span>
            </div>
          </div>
          <div className="border-t border-white/5 pt-3 mt-2 grid grid-cols-2 gap-2 text-center">
            <div>
              <span className="font-semibold text-white/80 font-mono">{stats.localRepos}</span>
              <p className="text-[10px] text-white/40">Local Apps</p>
            </div>
            <div>
              <span className="font-semibold text-white/80 font-mono">{stats.githubRepos}</span>
              <p className="text-[10px] text-white/40">GitHub Remotes</p>
            </div>
          </div>
          <div className="border-t border-white/5 pt-3 mt-3 flex justify-between items-center text-[11px]">
            <span className="text-white/50">Top Language</span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-white/80 font-medium">
              {stats.topLanguage}
            </span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col h-full min-h-[180px]">
          <h4 className="text-sm font-semibold text-white/80 flex items-center gap-1.5 mb-3 border-b border-white/5 pb-2">
            <Activity className="h-4 w-4 text-violet-400" />
            Recent Activity
          </h4>
          <ul className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
            {recentActivities.map((act) => (
              <li
                key={act.id}
                className="flex gap-2 items-start hover:bg-white/[0.02] p-1.5 rounded-lg transition"
              >
                <div className="mt-0.5 rounded-lg border border-white/10 bg-white/5 p-1 shrink-0">
                  {act.type === 'commit' ? (
                    <GitCommit className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-sky-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-white/80 text-[11px]">{act.message}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/45 mt-0.5">
                    <span className="font-semibold text-sky-300">{act.repoName}</span>
                    <span>•</span>
                    <span>
                      {act.date.toLocaleDateString()} at{' '}
                      {act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Board Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h4 className="text-sm font-semibold text-white/85 flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-violet-400" />
          Projects Status Board
        </h4>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:max-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              placeholder="Find project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-1.5 pl-8 pr-2.5 text-xs text-white/90 outline-none focus:border-violet-400/30 placeholder:text-white/30"
            />
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1 shrink-0 rounded-xl bg-violet-500/90 hover:bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Project
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 py-8 text-center text-white/45 border border-dashed border-white/5 rounded-xl">
            No projects found.
          </div>
        ) : (
          filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className={`rounded-2xl border bg-white/[0.02] p-4 hover:bg-white/[0.05] transition-all duration-300 hover:shadow-lg flex flex-col justify-between h-32 ${proj.border}`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${proj.color}`} />
                  <h5 className="font-semibold text-white/90 truncate text-sm">{proj.name}</h5>
                </div>
              </div>
              <p className="text-[10px] text-white/45 flex items-center gap-1.5 mt-1 mb-3">
                <Clock className="h-3 w-3" /> Updated {proj.updated}
              </p>
              <div>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.2 text-white/60">
                    {proj.status}
                  </span>
                  <span className="font-medium text-white/70">{proj.progress}% done</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`${proj.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${proj.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mock Project Creation Modal */}
      {isCreateOpen && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="border-b border-white/10 px-4 py-3 bg-white/5 flex items-center justify-between">
              <h5 className="font-semibold text-white">Create new project</h5>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-white/50 hover:text-white rounded p-1 hover:bg-white/5"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[11px] text-white/50 leading-relaxed">
                Project management requires writing metadata layout definitions. This will create a
                local mock project inside your active workspace session.
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-white/40 uppercase">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. DurgasOS Refactoring"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] p-2 text-white outline-none focus:border-violet-400/30"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-white/15 px-3 py-1.5 text-white/75 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl bg-violet-500/90 hover:bg-violet-500 px-3 py-1.5 text-white font-medium"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
