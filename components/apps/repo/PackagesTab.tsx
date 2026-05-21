'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Package,
  Box,
  Info,
  ArrowUpRight,
  Terminal,
  Layers,
  Star,
  Download,
} from 'lucide-react';

interface RegistryPackage {
  id: string;
  name: string;
  type: 'npm' | 'docker' | 'nuget' | 'maven';
  description: string;
  version: string;
  downloads: number;
  stars: number;
  updated: string;
}

const mockPackages: RegistryPackage[] = [
  {
    id: 'pkg-1',
    name: '@durgasos/shell-core',
    type: 'npm',
    description: 'Core window management and event bus utilities for DurgasOS apps.',
    version: '1.4.2',
    downloads: 12450,
    stars: 342,
    updated: '3 days ago',
  },
  {
    id: 'pkg-2',
    name: 'durgasos-runtime-env',
    type: 'docker',
    description: 'Containerized desktop environment runner with secure sandboxing.',
    version: 'v2.1.0-alpha',
    downloads: 3120,
    stars: 189,
    updated: '1 week ago',
  },
  {
    id: 'pkg-3',
    name: '@durgasos/glass-ui',
    type: 'npm',
    description: 'Premium glassmorphic React components and animation primitives.',
    version: '0.8.9',
    downloads: 8900,
    stars: 512,
    updated: '2 days ago',
  },
  {
    id: 'pkg-4',
    name: 'durgasos-auth-service',
    type: 'docker',
    description: 'Identity management gateway supporting Firebase and GitHub tokens.',
    version: 'v1.0.4',
    downloads: 1540,
    stars: 95,
    updated: '2 weeks ago',
  },
  {
    id: 'pkg-5',
    name: 'DurgasOS.PluginModel',
    type: 'nuget',
    description: 'C# plugin interface definitions for compiling native desktop components.',
    version: '1.0.0-rc2',
    downloads: 720,
    stars: 43,
    updated: '1 month ago',
  },
];

export function PackagesTab() {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const filteredPackages = useMemo(() => {
    const q = query.toLowerCase().trim();
    return mockPackages.filter((pkg) => {
      const matchesSearch =
        pkg.name.toLowerCase().includes(q) || pkg.description.toLowerCase().includes(q);
      const matchesType = selectedType === 'all' || pkg.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [query, selectedType]);

  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / ITEMS_PER_PAGE));
  const paginatedPackages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPackages.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPackages, currentPage]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setCurrentPage(1);
  };
  const handleTypeChange = (val: string) => {
    setSelectedType(val);
    setCurrentPage(1);
  };

  const packageTypes = [
    { value: 'all', label: 'All Registries' },
    { value: 'npm', label: 'npm' },
    { value: 'docker', label: 'Docker' },
    { value: 'nuget', label: 'NuGet' },
  ];

  return (
    <div className="space-y-6 font-sans text-xs text-white/90">
      {/* Top Banner widget */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-violet-900/30 via-indigo-950/20 to-transparent p-5 backdrop-blur-md">
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-400 via-indigo-900 to-transparent pointer-events-none" />
        <div className="max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-violet-400 tracking-wide uppercase">
            <Package className="h-3.5 w-3.5" /> Registry
          </div>
          <h3 className="text-base font-bold text-white leading-tight sm:text-lg">
            Host and manage packages securely
          </h3>
          <p className="text-[11px] leading-relaxed text-white/60">
            DurgasOS packages registry integrates with npm, Docker, and other standard package
            managers. Publish modules to share libraries, configurations, and dockerized runtimes
            across your workspace.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Package List (Spans 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-white/10 pb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
              <input
                type="search"
                placeholder="Search packages..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-2 pl-9 pr-3 text-xs text-white/90 outline-none focus:border-violet-400/30 placeholder:text-white/30"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {packageTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleTypeChange(type.value)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedType === type.value
                      ? 'bg-violet-500/30 text-white border border-violet-500/25'
                      : 'text-white/55 border border-transparent hover:bg-white/[0.05] hover:text-white/80'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Package Cards */}
          <div className="space-y-3">
            {filteredPackages.length === 0 ? (
              <div className="py-12 text-center text-white/45 border border-dashed border-white/5 rounded-xl">
                No registry packages found matching your search.
              </div>
            ) : (
              <>
                {paginatedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="group rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] p-4 transition-all duration-300 hover:shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-white/90 text-sm truncate group-hover:text-violet-400 transition-colors">
                          {pkg.name}
                        </h4>
                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase font-mono tracking-wider text-white/60">
                          {pkg.type}
                        </span>
                        <span className="text-[10px] text-white/35">v{pkg.version}</span>
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed max-w-lg">
                        {pkg.description}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] text-white/45 pt-1">
                        <span className="flex items-center gap-1">
                          <Download className="h-3.5 w-3.5 text-white/30" />
                          {pkg.downloads.toLocaleString()} downloads
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-white/30" />
                          {pkg.stars} stars
                        </span>
                        <span>Updated {pkg.updated}</span>
                      </div>
                    </div>

                    <button className="shrink-0 flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-white/80 transition-all font-semibold cursor-pointer">
                      Install <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <p className="text-[11px] text-white/35">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredPackages.length)} of{' '}
                      {filteredPackages.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i + 1}
                          type="button"
                          onClick={() => setCurrentPage(i + 1)}
                          className={`h-7 w-7 rounded-lg text-[11px] font-medium transition ${
                            currentPage === i + 1
                              ? 'bg-violet-500/30 text-white border border-violet-400/30'
                              : 'border border-white/10 text-white/50 hover:bg-white/[0.06]'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Info Sidebar Widget (Spans 1 column) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
            <h4 className="font-semibold text-white/80 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Info className="h-4 w-4 text-violet-400" />
              Get started with packages
            </h4>

            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">
                  NPM CLI CONFIGURATION
                </span>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Authenticate your local CLI to pull private modules:
                </p>
                <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2 font-mono text-[10px] text-violet-300 border border-white/5">
                  <span className="truncate">
                    npm config set @durgasos:registry https://npm.durgasos.ai
                  </span>
                  <Terminal className="h-3.5 w-3.5 text-white/40 shrink-0 cursor-pointer hover:text-white" />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">
                  DOCKER REGISTRY
                </span>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Log in using your secure profile access token:
                </p>
                <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2 font-mono text-[10px] text-violet-300 border border-white/5">
                  <span className="truncate">docker login registry.durgasos.ai -u koushik</span>
                  <Terminal className="h-3.5 w-3.5 text-white/40 shrink-0 cursor-pointer hover:text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="font-semibold text-white/80 flex items-center gap-1.5 border-b border-white/5 pb-2 mb-3">
              <Layers className="h-4 w-4 text-violet-400" />
              Registry Statistics
            </h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-white/45">Total Packages</span>
                <span className="font-mono font-semibold text-white/80">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/45">Active Version Hooks</span>
                <span className="font-mono font-semibold text-white/80">3 Enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/45">Total Bandwidth</span>
                <span className="font-mono font-semibold text-white/80">45.2 GB/mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
