'use client';

import { useMemo, useState } from 'react';
import {
  Star,
  GitFork,
  ChevronRight,
  X,
  Plus,
  Folder,
  File,
  Search,
  SlidersHorizontal,
  FolderOpen,
  Calendar,
  Globe,
  Lock,
  ArrowUpRight,
} from 'lucide-react';

export interface Repository {
  name: string;
  full_name?: string;
  description?: string;
  stargazers_count?: number;
  forks_count?: number;
  language?: string;
  html_url?: string;
  updated_at?: string;
  isLocal?: boolean;
  visibility?: 'public' | 'private';
}

function asRepoList(raw: unknown): Repository[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is Repository => x !== null && typeof x === 'object');
}

const getLanguageColor = (lang: string) => {
  switch (lang) {
    case 'TypeScript':
      return 'bg-blue-500';
    case 'JavaScript':
      return 'bg-yellow-400';
    case 'Python':
      return 'bg-sky-400';
    case 'HTML':
      return 'bg-orange-500';
    case 'CSS':
      return 'bg-purple-500';
    case 'Vue':
      return 'bg-emerald-500';
    case 'Rust':
      return 'bg-orange-700';
    case 'Go':
      return 'bg-cyan-500';
    default:
      return 'bg-slate-400';
  }
};

// Simulated File Trees based on Language
function getFileTreeForLanguage(
  lang: string = ''
): { name: string; type: 'dir' | 'file'; children?: any[] }[] {
  const normalized = lang.toLowerCase();
  if (normalized === 'python') {
    return [
      {
        name: 'src',
        type: 'dir',
        children: [
          { name: 'main.py', type: 'file' },
          { name: 'utils.py', type: 'file' },
          { name: 'config.py', type: 'file' },
        ],
      },
      {
        name: 'tests',
        type: 'dir',
        children: [
          { name: 'test_main.py', type: 'file' },
          { name: '__init__.py', type: 'file' },
        ],
      },
      { name: 'requirements.txt', type: 'file' },
      { name: 'README.md', type: 'file' },
      { name: '.gitignore', type: 'file' },
    ];
  } else if (normalized === 'rust') {
    return [
      {
        name: 'src',
        type: 'dir',
        children: [
          { name: 'main.rs', type: 'file' },
          { name: 'lib.rs', type: 'file' },
          { name: 'error.rs', type: 'file' },
        ],
      },
      {
        name: 'tests',
        type: 'dir',
        children: [{ name: 'integration_test.rs', type: 'file' }],
      },
      { name: 'Cargo.toml', type: 'file' },
      { name: 'Cargo.lock', type: 'file' },
      { name: 'README.md', type: 'file' },
    ];
  } else if (normalized === 'typescript' || normalized === 'javascript') {
    return [
      {
        name: 'src',
        type: 'dir',
        children: [
          {
            name: 'components',
            type: 'dir',
            children: [
              { name: 'Button.tsx', type: 'file' },
              { name: 'Header.tsx', type: 'file' },
            ],
          },
          { name: 'hooks', type: 'dir', children: [{ name: 'useAuth.ts', type: 'file' }] },
          { name: 'index.ts', type: 'file' },
          { name: 'App.tsx', type: 'file' },
        ],
      },
      {
        name: 'public',
        type: 'dir',
        children: [
          { name: 'favicon.ico', type: 'file' },
          { name: 'index.html', type: 'file' },
        ],
      },
      { name: 'package.json', type: 'file' },
      { name: 'tsconfig.json', type: 'file' },
      { name: 'README.md', type: 'file' },
    ];
  } else {
    return [
      {
        name: 'src',
        type: 'dir',
        children: [
          { name: 'index.js', type: 'file' },
          { name: 'helper.js', type: 'file' },
        ],
      },
      { name: 'docs', type: 'dir', children: [{ name: 'api.md', type: 'file' }] },
      { name: 'README.md', type: 'file' },
      { name: 'LICENSE', type: 'file' },
    ];
  }
}

// Sub-component to render directory tree
function FileTreeNode({ item, depth = 0 }: { item: any; depth?: number }) {
  const [isOpen, setIsOpen] = useState(true);

  if (item.type === 'file') {
    return (
      <div
        className="flex items-center gap-1.5 py-1 text-[11px] text-white/70 hover:text-white transition"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <File className="h-3.5 w-3.5 text-violet-400/70" />
        <span>{item.name}</span>
      </div>
    );
  }

  return (
    <div className="select-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1.5 py-1 text-[11px] font-medium text-white/80 hover:text-white text-left transition"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {isOpen ? (
          <FolderOpen className="h-3.5 w-3.5 text-sky-400" />
        ) : (
          <Folder className="h-3.5 w-3.5 text-sky-400" />
        )}
        <span>{item.name}</span>
      </button>
      {isOpen && item.children && (
        <div className="border-l border-white/5 ml-2.5">
          {item.children.map((child: any, idx: number) => (
            <FileTreeNode key={idx} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RepositoriesTab({
  repos,
  loading,
  error,
  onCreateRepo,
}: {
  repos: unknown;
  loading: boolean;
  error?: Error | null;
  onCreateRepo: (repo: Repository) => void;
}) {
  const list = useMemo(() => asRepoList(repos), [repos]);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'stars'>('updated');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [openDetailRepo, setOpenDetailRepo] = useState<Repository | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Form states for creation
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLang, setNewLang] = useState('TypeScript');
  const [newVisibility, setNewVisibility] = useState<'public' | 'private'>('public');

  // Extract language choices dynamically
  const languages = useMemo(() => {
    const set = new Set<string>();
    list.forEach((r) => {
      if (r.language && r.language !== '—') set.add(r.language);
    });
    return Array.from(set);
  }, [list]);

  const filteredAndSorted = useMemo(() => {
    // 1. Filter
    const term = q.trim().toLowerCase();
    let result = list.filter((r) => {
      const name = r.name.toLowerCase();
      const desc = (r.description || '').toLowerCase();
      const matchesSearch = name.includes(term) || desc.includes(term);

      const matchesLang =
        selectedLanguage === 'all' ||
        (r.language && r.language.toLowerCase() === selectedLanguage.toLowerCase());

      return matchesSearch && matchesLang;
    });

    // 2. Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'stars') {
        const starsA = a.stargazers_count ?? 0;
        const starsB = b.stargazers_count ?? 0;
        return starsB - starsA;
      }
      // default: updated
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [list, q, selectedLanguage, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE));
  const paginatedRepos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSorted.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSorted, currentPage, ITEMS_PER_PAGE]);

  // Reset page when filter changes
  const handleSearch = (val: string) => {
    setQ(val);
    setCurrentPage(1);
  };
  const handleLang = (val: string) => {
    setSelectedLanguage(val);
    setCurrentPage(1);
  };
  const handleSort = (val: 'updated' | 'name' | 'stars') => {
    setSortBy(val);
    setCurrentPage(1);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newRepo: Repository = {
      name: newName.trim(),
      description: newDesc.trim() || 'No description provided.',
      language: newLang,
      stargazers_count: 0,
      forks_count: 0,
      updated_at: new Date().toISOString(),
      isLocal: true,
      visibility: newVisibility,
    };

    onCreateRepo(newRepo);

    // Reset fields
    setNewName('');
    setNewDesc('');
    setNewLang('TypeScript');
    setNewVisibility('public');
    setIsModalOpen(false);
  };

  const selectedFileTree = useMemo(() => {
    if (!openDetailRepo) return [];
    return getFileTreeForLanguage(openDetailRepo.language);
  }, [openDetailRepo]);

  if (error) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200/90 font-sans">
        {error.message}
      </p>
    );
  }

  if (loading && list.length === 0) {
    return <p className="text-sm text-white/45 font-sans">Loading repositories…</p>;
  }

  return (
    <div className="relative font-sans text-xs text-white/90">
      {/* Controls & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Filter repositories…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-2 pl-9 pr-3 text-xs text-white/90 outline-none focus:border-violet-400/30 placeholder:text-white/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-white/40" />
            <select
              value={sortBy}
              onChange={(e: any) => handleSort(e.target.value)}
              className="bg-transparent text-white/80 border-none outline-none text-[11px] font-medium cursor-pointer"
            >
              <option value="updated" className="bg-slate-900 text-white">
                Last updated
              </option>
              <option value="name" className="bg-slate-900 text-white">
                Name
              </option>
              <option value="stars" className="bg-slate-900 text-white">
                Stars
              </option>
            </select>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
            <Globe className="h-3.5 w-3.5 text-white/40" />
            <select
              value={selectedLanguage}
              onChange={(e) => handleLang(e.target.value)}
              className="bg-transparent text-white/80 border-none outline-none text-[11px] font-medium cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">
                All Languages
              </option>
              {languages.map((lang) => (
                <option key={lang} value={lang.toLowerCase()} className="bg-slate-900 text-white">
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Create New Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 shrink-0 rounded-xl bg-violet-500/90 hover:bg-violet-500 px-3 py-2 text-xs font-semibold text-white transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-h-[300px]">
        {/* Main List */}
        <div className="min-w-0 flex-1 space-y-2">
          {filteredAndSorted.length === 0 ? (
            <div className="py-12 text-center text-white/45 border border-dashed border-white/5 rounded-xl">
              No repositories found.
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {paginatedRepos.map((r) => {
                  const name = r.name;
                  const stars = r.stargazers_count ?? 0;
                  const forks = r.forks_count ?? 0;
                  const lang = r.language ?? '—';
                  const desc = r.description ?? '';
                  const isSelected = openDetailRepo?.name === name;
                  const updatedLabel = r.updated_at
                    ? new Date(r.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : null;

                  return (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => setOpenDetailRepo(r)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-violet-500/40 bg-violet-500/5 shadow-md shadow-violet-500/5'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-white/90 group-hover:text-violet-400">
                              {name}
                            </p>
                            {r.visibility === 'private' && (
                              <span className="inline-flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1 py-0.2 text-[9px] text-white/40">
                                <Lock className="h-2.5 w-2.5" /> Private
                              </span>
                            )}
                            {r.isLocal && (
                              <span className="rounded bg-sky-500/10 border border-sky-500/20 px-1 py-0.2 text-[9px] text-sky-400">
                                Simulated
                              </span>
                            )}
                          </div>
                          {desc ? (
                            <p className="line-clamp-1 text-xs text-white/45">{desc}</p>
                          ) : null}
                          {updatedLabel ? (
                            <p className="text-[10px] text-white/30">Updated {updatedLabel}</p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {lang !== '—' && (
                            <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/50">
                              <span className={`h-2 w-2 rounded-full ${getLanguageColor(lang)}`} />
                              <span>{lang}</span>
                            </div>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] text-white/50">
                            <Star className="h-3 w-3 text-white/30" />
                            {stars}
                            <GitFork className="h-3 w-3 text-white/30 ml-1.5" />
                            {forks}
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 text-white/30 transition-transform ${isSelected ? 'translate-x-1' : ''}`}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                  <p className="text-[11px] text-white/35">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)} of{' '}
                    {filteredAndSorted.length}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`h-7 w-7 rounded-lg text-[11px] font-medium transition ${
                              currentPage === page
                                ? 'bg-violet-500/30 text-white border border-violet-400/30'
                                : 'border border-white/10 text-white/50 hover:bg-white/[0.06]'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Side Drawer Details */}
        {openDetailRepo && (
          <aside className="w-full lg:w-72 shrink-0 rounded-2xl border border-white/15 bg-slate-950/80 p-4 shadow-2xl backdrop-blur-md flex flex-col justify-between h-[360px] lg:h-[400px]">
            <div className="space-y-4 overflow-y-auto pr-1 scrollbar-thin flex-1">
              <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold text-white/90">
                    {openDetailRepo.name}
                  </h4>
                  <p className="text-[10px] text-white/35 flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" /> Updated{' '}
                    {openDetailRepo.updated_at
                      ? new Date(openDetailRepo.updated_at).toLocaleDateString()
                      : 'Recently'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenDetailRepo(null)}
                  className="rounded-lg border border-white/10 p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wider">
                  Description
                </span>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  {openDetailRepo.description || 'No description provided.'}
                </p>
              </div>

              {/* Languages & Metrics */}
              <div className="grid grid-cols-2 gap-2 border-y border-white/5 py-2 text-[10px]">
                <div>
                  <span className="text-white/30">Language</span>
                  <div className="flex items-center gap-1 font-semibold text-white/80 mt-0.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${getLanguageColor(
                        openDetailRepo.language || ''
                      )}`}
                    />
                    <span>{openDetailRepo.language || 'None'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-white/30">Stars / Forks</span>
                  <p className="font-semibold text-white/80 mt-0.5 font-mono">
                    ★ {openDetailRepo.stargazers_count ?? 0} / ⑂ {openDetailRepo.forks_count ?? 0}
                  </p>
                </div>
              </div>

              {/* File Tree Section */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wider block">
                  Simulated Workspace File Tree
                </span>
                <div className="rounded-xl border border-white/5 bg-slate-950 p-2.5 max-h-[160px] overflow-y-auto scrollbar-thin">
                  {selectedFileTree.map((item, index) => (
                    <FileTreeNode key={index} item={item} />
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-white/5 pt-3 mt-3 flex justify-between items-center shrink-0">
              {openDetailRepo.html_url ? (
                <a
                  href={openDetailRepo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                >
                  GitHub Project <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="text-[11px] text-white/30 italic">Local Prototype</span>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Repository Creation Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="border-b border-white/10 px-4 py-3 bg-white/5 flex items-center justify-between">
              <h5 className="font-semibold text-white text-sm">Create a new repository</h5>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/50 hover:text-white rounded p-1 hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="p-4 space-y-4">
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Generate a simulated git repository model. It will be added dynamically to your
                  active Repo app view.
                </p>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-white/40 uppercase">
                    Repository Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. awesome-durgasos-app"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] p-2 text-white outline-none focus:border-violet-400/30 text-xs"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-white/40 uppercase">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief outline of the project..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] p-2 text-white outline-none focus:border-violet-400/30 text-xs resize-none"
                  />
                </div>

                {/* Primary Language & Visibility */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-white/40 uppercase">
                      Language
                    </label>
                    <select
                      value={newLang}
                      onChange={(e) => setNewLang(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 p-2 text-white outline-none focus:border-violet-400/30 text-xs cursor-pointer"
                    >
                      <option value="TypeScript">TypeScript</option>
                      <option value="JavaScript">JavaScript</option>
                      <option value="Python">Python</option>
                      <option value="Rust">Rust</option>
                      <option value="Go">Go</option>
                      <option value="HTML">HTML</option>
                      <option value="CSS">CSS</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-white/40 uppercase">
                      Visibility
                    </label>
                    <select
                      value={newVisibility}
                      onChange={(e: any) => setNewVisibility(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 p-2 text-white outline-none focus:border-violet-400/30 text-xs cursor-pointer"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-white/15 px-3 py-2 text-white/75 hover:bg-white/5 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-violet-500/90 hover:bg-violet-500 px-4 py-2 text-white font-semibold transition"
                  >
                    Create Repository
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
