'use client';

import { useState, useEffect, useCallback } from 'react';
import { RemoteImage } from '@/components/ui/remote-image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Search,
  Loader2,
  Key,
  Star,
  Sparkles,
  Check,
  RotateCcw,
  Info,
  Layers,
  Cpu,
  GitFork,
  BookOpen,
  Copy,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
import { motion, AnimatePresence } from 'framer-motion';

import {
  fetchRepoTree,
  analyzeRepository,
  adaptPrompt,
  refinePrompt,
  type RepoMetadata,
} from '@/lib/repo-reverse-api';

interface RepoReverseTabProps {
  target: { owner: string; repo: string } | null;
  onClearTarget: () => void;
}

const PRESETS = [
  {
    owner: 'excalidraw',
    repo: 'excalidraw',
    label: 'Excalidraw',
    desc: 'Lightweight drawing whiteboard application.',
  },
  {
    owner: 'shadcn-ui',
    repo: 'ui',
    label: 'shadcn/ui',
    desc: 'Modern frontend component compiler CLI.',
  },
  {
    owner: 'tldraw',
    repo: 'tldraw',
    label: 'tldraw',
    desc: 'Infinite canvas collaboration tool.',
  },
];

export function RepoReverseTab({ target, onClearTarget }: RepoReverseTabProps) {
  const [repoInput, setRepoInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [repoMetadata, setRepoMetadata] = useState<RepoMetadata | null>(null);

  // Customization Settings
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro');
  const [selectedStyle, setSelectedStyle] = useState('detailed-architectural');
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('repoReverse_apiKey') || '';
    }
    return '';
  });

  // State Adaptation Form
  const [newAppDesc, setNewAppDesc] = useState('');
  const [techStackChanges, setTechStackChanges] = useState('');
  const [adapting, setAdapting] = useState(false);
  const [adaptedPrompt, setAdaptedPrompt] = useState<string | null>(null);
  const [adaptError, setAdaptError] = useState('');

  // Rating & Refinement States
  const [userRating, setUserRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customFeedback, setCustomFeedback] = useState('');
  const [refining, setRefining] = useState(false);
  const [refinedPrompt, setRefinedPrompt] = useState<string | null>(null);
  const [refineError, setRefineError] = useState('');
  const [feedbackSavedMessage, setFeedbackSavedMessage] = useState(false);

  // File Scanning & Selector States
  const [scannedFiles, setScannedFiles] = useState<string[]>([]);
  const [scannedLoading, setScannedLoading] = useState(false);
  const [scannedSearch, setScannedSearch] = useState('');
  const [selectedFilesToInclude, setSelectedFilesToInclude] = useState<string[]>([]);
  const [scannedError, setScannedError] = useState('');
  const [showFileSelector, setShowFileSelector] = useState(false);

  // Active prompt display tab
  const [activePromptTab, setActivePromptTab] = useState<'generated' | 'adapted' | 'refined'>(
    'generated'
  );
  const [copied, setCopied] = useState(false);

  // Collapsible settings
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Sync apiKey to localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('repoReverse_apiKey', apiKey);
    }
  }, [apiKey]);

  const handleScanFiles = useCallback(async (ownerStr: string, repoStr: string) => {
    setScannedLoading(true);
    setScannedError('');
    try {
      const treeData = await fetchRepoTree(ownerStr, repoStr);
      setScannedFiles(treeData.files || []);
    } catch (err) {
      setScannedError(err instanceof Error ? err.message : 'Error scanning repository files list.');
    } finally {
      setScannedLoading(false);
    }
  }, []);

  const handleAnalyzeClick = () => {
    if (!repoInput.trim()) return;

    let owner = '';
    let repo = '';
    try {
      if (repoInput.includes('github.com')) {
        const url = new URL(repoInput.startsWith('http') ? repoInput : `https://${repoInput}`);
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          owner = parts[0];
          repo = parts[1];
        }
      } else {
        const parts = repoInput.split('/');
        if (parts.length === 2) {
          owner = parts[0];
          repo = parts[1];
        }
      }
    } catch (e) {
      setError('Invalid repository format. Please use owner/repo or full GitHub URL.');
      return;
    }

    if (!owner || !repo) {
      setError('Could not parse repository owner and name. Please use owner/repo format.');
      return;
    }

    handleAnalyze(owner, repo);
  };

  const handleAnalyze = useCallback(
    async (owner: string, repo: string) => {
      setLoading(true);
      setError('');
      setGeneratedPrompt(null);
      setRepoMetadata(null);
      setAdaptedPrompt(null);
      setRefinedPrompt(null);
      setAdaptError('');
      setRefineError('');
      setUserRating(0);
      setSelectedTags([]);
      setCustomFeedback('');
      setActivePromptTab('generated');

      try {
        // Trigger file scanning concurrently in the background
        handleScanFiles(owner, repo).catch((e) => console.error('Background scanning failed:', e));

        const res = await analyzeRepository({
          owner,
          repo,
          model: selectedModel,
          apiKey: apiKey || undefined,
          style: selectedStyle,
          manualFiles: selectedFilesToInclude,
        });

        setGeneratedPrompt(res.prompt);
        setRepoMetadata(res.metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
      } finally {
        setLoading(false);
      }
    },
    [apiKey, handleScanFiles, selectedFilesToInclude, selectedModel, selectedStyle]
  );
  // Handle target loading when triggered externally
  useEffect(() => {
    if (target) {
      const shorthand = `${target.owner}/${target.repo}`;
      setRepoInput(shorthand);
      handleAnalyze(target.owner, target.repo);
      onClearTarget();
    }
  }, [target, handleAnalyze, onClearTarget]);

  const handleAdaptClick = async () => {
    if (!generatedPrompt) return;
    setAdapting(true);
    setAdaptError('');
    try {
      const res = await adaptPrompt({
        originalPrompt: generatedPrompt,
        newAppDescription: newAppDesc || undefined,
        techStackChanges: techStackChanges || undefined,
        model: selectedModel,
        apiKey: apiKey || undefined,
      });
      setAdaptedPrompt(res.prompt);
      setActivePromptTab('adapted');
    } catch (err) {
      setAdaptError(
        err instanceof Error ? err.message : 'An unknown error occurred during adaptation.'
      );
    } finally {
      setAdapting(false);
    }
  };

  const handleRefineClick = async () => {
    if (!generatedPrompt) return;
    setRefining(true);
    setRefineError('');
    setFeedbackSavedMessage(false);
    try {
      const res = await refinePrompt({
        originalPrompt: generatedPrompt,
        rating: userRating,
        feedbackTags: selectedTags,
        feedbackText: customFeedback,
        model: selectedModel,
        apiKey: apiKey || undefined,
      });
      setRefinedPrompt(res.prompt);
      setActivePromptTab('refined');
      setFeedbackSavedMessage(true);
      setTimeout(() => setFeedbackSavedMessage(false), 3000);
    } catch (err) {
      setRefineError(
        err instanceof Error ? err.message : 'An unknown error occurred during refinement.'
      );
    } finally {
      setRefining(false);
    }
  };

  const handleCopy = () => {
    let textToCopy = generatedPrompt || '';
    if (activePromptTab === 'adapted' && adaptedPrompt) textToCopy = adaptedPrompt;
    if (activePromptTab === 'refined' && refinedPrompt) textToCopy = refinedPrompt;

    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePresetSelect = (p: (typeof PRESETS)[0]) => {
    setRepoInput(`${p.owner}/${p.repo}`);
    handleAnalyze(p.owner, p.repo);
  };

  // Metrics metrics estimation
  const displayedPrompt =
    activePromptTab === 'adapted'
      ? adaptedPrompt
      : activePromptTab === 'refined'
        ? refinedPrompt
        : generatedPrompt;

  const charCount = displayedPrompt?.length || 0;
  const wordCount = displayedPrompt?.split(/\s+/).filter(Boolean).length || 0;
  const estimatedTokens = Math.ceil(charCount / 3.9);

  let complexityLevel = 'Low';
  let complexityColor = 'text-emerald-400';
  let progressColor = 'bg-emerald-500';
  let complexityTarget = 'Ideal for inline completions & small context rules.';

  if (estimatedTokens > 20000) {
    complexityLevel = 'Extreme';
    complexityColor = 'text-red-400';
    progressColor = 'bg-red-500';
    complexityTarget = 'Suitable for extreme context LLMs (Gemini Pro, Claude Sonnet).';
  } else if (estimatedTokens > 8000) {
    complexityLevel = 'High';
    complexityColor = 'text-amber-400';
    progressColor = 'bg-amber-500';
    complexityTarget = 'Best suited for long context window chat inputs.';
  } else if (estimatedTokens > 3000) {
    complexityLevel = 'Medium';
    complexityColor = 'text-cyan-400';
    progressColor = 'bg-cyan-500';
    complexityTarget = 'Perfect for standard coding model chat feeds.';
  }

  const tokenLimit = 15000;
  const tokenPct = Math.min(Math.round((estimatedTokens / tokenLimit) * 100), 100);

  return (
    <div className="flex flex-col gap-4 font-sans text-xs text-white/90">
      {/* Settings & Configuration Glass Monolith */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white/90 flex items-center gap-1.5">
          <Sparkles className="h-4.5 w-4.5 text-violet-400 animate-pulse" />
          Codebase Decompiler
        </h3>
        <p className="text-[11px] text-white/50 leading-relaxed max-w-xl">
          Deconstruct any public GitHub repository to reverse-engineer its design details, folder
          mapping rules, and tech stacks into a synthetic assistant builder prompt.
        </p>

        <div className="flex flex-col md:flex-row gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAnalyzeClick();
              }}
              placeholder="e.g. facebook/react or https://github.com/..."
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-2.5 pl-9 pr-3 text-xs text-white/90 outline-none placeholder:text-white/30 focus:border-violet-400/30"
            />
          </div>

          <button
            type="button"
            onClick={handleAnalyzeClick}
            disabled={loading || !repoInput.trim()}
            className="rounded-xl bg-violet-500/90 hover:bg-violet-500 px-6 py-2.5 font-semibold text-white transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Layers className="h-3.5 w-3.5" />
            )}
            Analyze Repo
          </button>
        </div>

        {/* Collapsible Advanced Configs */}
        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex items-center gap-1 text-[10px] font-semibold text-white/40 hover:text-white/60 transition cursor-pointer select-none"
          >
            <Sliders className="h-3 w-3" />
            {advancedOpen ? 'Hide Advanced Config' : 'Show Advanced Config'}
            {advancedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <AnimatePresence>
            {advancedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3">
                  {/* API Key */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1">
                      <Key className="h-2.5 w-2.5 text-violet-400" />
                      Gemini API Key override
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Optional: Use your own key"
                      className="w-full rounded-lg border border-white/10 bg-slate-950/40 p-2 text-white outline-none focus:border-violet-400/30 text-xs"
                    />
                  </div>

                  {/* Model Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1">
                      <Cpu className="h-2.5 w-2.5 text-violet-400" />
                      LLM Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-950/80 p-2 text-white outline-none focus:border-violet-400/30 text-xs cursor-pointer"
                    >
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro Exp</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    </select>
                  </div>

                  {/* Prompt style */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1">
                      <BookOpen className="h-2.5 w-2.5 text-violet-400" />
                      Blueprint Style
                    </label>
                    <select
                      value={selectedStyle}
                      onChange={(e) => setSelectedStyle(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-950/80 p-2 text-white outline-none focus:border-violet-400/30 text-xs cursor-pointer"
                    >
                      <option value="detailed-architectural">Detailed / Architectural</option>
                      <option value="minimalist">Minimalist</option>
                      <option value="developer-focus">Developer-Focus</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Manual File Selector */}
        {scannedFiles.length > 0 && (
          <div className="mt-1 border-t border-white/5 pt-3">
            <button
              type="button"
              onClick={() => setShowFileSelector(!showFileSelector)}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-white/50 hover:text-white transition cursor-pointer select-none"
            >
              <Layers className="h-3 w-3 text-violet-400" />
              Focus Analysis on Specific Files ({selectedFilesToInclude.length} selected)
              {showFileSelector ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {showFileSelector && (
              <div className="mt-2.5 rounded-xl border border-white/5 bg-white/[0.01] p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[9px] text-white/35 uppercase tracking-wider">
                    Select up to 10 key files for Gemini to read thoroughly
                  </span>
                  {selectedFilesToInclude.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedFilesToInclude([])}
                      className="text-[9px] font-bold text-red-400 hover:text-red-300"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={scannedSearch}
                  onChange={(e) => setScannedSearch(e.target.value)}
                  placeholder="Filter codebase files... e.g. index.ts, package.json"
                  className="rounded-lg border border-white/10 bg-slate-950/40 p-2 text-white outline-none focus:border-violet-400/30 text-xs"
                />

                {scannedError && <p className="text-[10px] text-red-300">{scannedError}</p>}

                <div className="max-h-32 overflow-y-auto divide-y divide-white/5 border border-white/5 rounded-lg bg-slate-950/20 select-none">
                  {scannedFiles
                    .filter(
                      (f) =>
                        !scannedSearch.trim() ||
                        f.toLowerCase().includes(scannedSearch.toLowerCase())
                    )
                    .slice(0, 100)
                    .map((file) => {
                      const isSelected = selectedFilesToInclude.includes(file);
                      return (
                        <div
                          key={file}
                          className="flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.02]"
                        >
                          <span className="font-mono text-[10px] text-white/60 truncate max-w-[400px]">
                            {file}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedFilesToInclude((prev) => prev.filter((f) => f !== file));
                              } else {
                                if (selectedFilesToInclude.length >= 10) return;
                                setSelectedFilesToInclude((prev) => [...prev, file]);
                              }
                            }}
                            className={`rounded-lg border px-2 py-0.5 text-[9px] font-semibold transition ${
                              isSelected
                                ? 'bg-violet-500 border-violet-500 text-white'
                                : 'bg-transparent border-white/10 text-white/45 hover:bg-white/5'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Main Analysis Output Grid */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-red-200">
          <p className="font-semibold mb-1">Deconstruction Failed</p>
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 flex flex-col items-center justify-center text-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-1">
              Analyzing Codebase Structure
            </h4>
            <p className="text-[11px] text-white/45 max-w-xs leading-normal">
              Downloading repository metadata, scanning logs, reading key layouts, and compiling the
              synthesis prompts. This might take up to a minute.
            </p>
          </div>
        </div>
      )}

      {!loading && !generatedPrompt && !error && (
        <div className="grid gap-3 sm:grid-cols-3 mt-2">
          {PRESETS.map((p) => (
            <button
              key={p.repo}
              type="button"
              onClick={() => handlePresetSelect(p)}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:border-violet-500/20 hover:bg-white/[0.05] transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 mb-1 text-white/80">
                <GithubIcon className="h-4.5 w-4.5 text-white/30 group-hover:text-violet-400 transition" />
                <span className="font-semibold text-sm">{p.label}</span>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">{p.desc}</p>
            </button>
          ))}
        </div>
      )}

      {!loading && generatedPrompt && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Metadata & Gauge Metrics - Left Column */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Metadata Card */}
            {repoMetadata && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3">
                <RemoteImage
                  src={
                    repoMetadata.ownerAvatar || 'https://avatars.githubusercontent.com/u/9919?v=4'
                  }
                  alt={repoMetadata.owner}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-xl bg-white/5 border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-white/90 text-sm truncate">
                    {repoMetadata.owner}/{repoMetadata.repo}
                  </h4>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-white/45">
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3.5 w-3.5 text-yellow-500/70" />
                      {repoMetadata.stars.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <GitFork className="h-3.5 w-3.5" />
                      {repoMetadata.forks.toLocaleString()}
                    </span>
                    <span className="rounded bg-white/5 px-1">{repoMetadata.language}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Token Complexity Metrics Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3">
              <h4 className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">
                Complexity Gauge
              </h4>
              <div className="flex justify-between items-baseline">
                <span className={`text-xl font-bold ${complexityColor}`}>
                  {complexityLevel} Complexity
                </span>
                <span className="font-mono text-xs font-semibold text-white/60">
                  {estimatedTokens.toLocaleString()} tokens
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full ${progressColor}`} style={{ width: `${tokenPct}%` }} />
              </div>

              <div className="flex flex-col gap-1.5 text-[10px] text-white/40 leading-normal">
                <div className="flex justify-between">
                  <span>Characters: {charCount.toLocaleString()}</span>
                  <span>Words: {wordCount.toLocaleString()}</span>
                </div>
                <p className="border-t border-white/5 pt-1.5 italic text-white/50">
                  {complexityTarget}
                </p>
              </div>
            </div>

            {/* Adapt Workspace */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3">
              <h4 className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">
                Adapt System Stack
              </h4>

              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-white/60">New App Description</span>
                  <textarea
                    rows={2}
                    value={newAppDesc}
                    onChange={(e) => setNewAppDesc(e.target.value)}
                    placeholder="e.g. A desktop version of the drawing board with multi-window support"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/40 p-2 text-white outline-none focus:border-violet-400/30 text-xs resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-white/60">
                    Technology Modifications
                  </span>
                  <input
                    type="text"
                    value={techStackChanges}
                    onChange={(e) => setTechStackChanges(e.target.value)}
                    placeholder="e.g. Next.js, Radix Primitives, Tailwind CSS"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/40 p-2 text-white outline-none focus:border-violet-400/30 text-xs"
                  />
                </div>

                {adaptError && <p className="text-[10px] text-red-300">{adaptError}</p>}

                <button
                  type="button"
                  onClick={handleAdaptClick}
                  disabled={adapting || (!newAppDesc && !techStackChanges)}
                  className="w-full rounded-xl bg-violet-500/90 hover:bg-violet-500 py-2 font-semibold text-white transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {adapting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Adapt Prompt
                </button>
              </div>
            </div>

            {/* Refine / Rating Workspace */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3">
              <h4 className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">
                Refine Output
              </h4>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-white/60">Quality:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setUserRating(star)}
                        className="text-white/20 hover:text-yellow-400 transition"
                      >
                        <Star
                          className={`h-4.5 w-4.5 ${userRating >= star ? 'text-yellow-400 fill-yellow-400/20' : ''}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating feedback tags */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {[
                    'Missed key structures',
                    'Overly complex',
                    'Too simple',
                    'Good dependencies',
                  ].map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setSelectedTags((prev) => prev.filter((t) => t !== tag));
                          } else {
                            setSelectedTags((prev) => [...prev, tag]);
                          }
                        }}
                        className={`rounded-lg border px-2 py-0.5 text-[9px] font-medium transition cursor-pointer ${
                          active
                            ? 'bg-violet-500/30 border-violet-400/40 text-violet-200'
                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[10px] font-medium text-white/60">Specific Comments</span>
                  <textarea
                    rows={2}
                    value={customFeedback}
                    onChange={(e) => setCustomFeedback(e.target.value)}
                    placeholder="Describe specific tweaks to add, delete, or refine..."
                    className="w-full rounded-lg border border-white/10 bg-slate-950/40 p-2 text-white outline-none focus:border-violet-400/30 text-xs resize-none"
                  />
                </div>

                {refineError && <p className="text-[10px] text-red-300">{refineError}</p>}
                {feedbackSavedMessage && (
                  <p className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Prompt refined successfully!
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleRefineClick}
                  disabled={refining || (!userRating && !customFeedback)}
                  className="w-full rounded-xl bg-violet-500/90 hover:bg-violet-500 py-2 font-semibold text-white transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {refining ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Refine Prompt
                </button>
              </div>
            </div>
          </div>

          {/* Prompt Viewer - Right Column */}
          <div className="lg:col-span-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-3">
              {/* Tab options for prompt variations */}
              <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setActivePromptTab('generated')}
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold transition cursor-pointer ${
                    activePromptTab === 'generated'
                      ? 'bg-violet-500/30 text-white font-bold'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  Generated Prompt
                </button>

                {adaptedPrompt && (
                  <button
                    type="button"
                    onClick={() => setActivePromptTab('adapted')}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold transition cursor-pointer ${
                      activePromptTab === 'adapted'
                        ? 'bg-violet-500/30 text-white font-bold'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Adapted Prompt
                  </button>
                )}

                {refinedPrompt && (
                  <button
                    type="button"
                    onClick={() => setActivePromptTab('refined')}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold transition cursor-pointer ${
                      activePromptTab === 'refined'
                        ? 'bg-violet-500/30 text-white font-bold'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Refined Prompt
                  </button>
                )}
              </div>

              {/* Copy prompt button */}
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-xl border border-white/15 px-3 py-2 text-white/75 hover:bg-white/5 hover:text-white font-semibold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copied!' : 'Copy Prompt'}
              </button>
            </div>

            {/* Markdown Prompt Viewport */}
            <div className="flex-1 min-h-[400px] max-h-[600px] overflow-y-auto pr-1 rounded-xl border border-white/5 bg-slate-950/40 p-4 scrollbar-thin leading-relaxed">
              <article className="prose prose-invert prose-xs max-w-none text-white/80 selection:bg-violet-500/40">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedPrompt || ''}</ReactMarkdown>
              </article>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
