'use client';

import { useMutation } from '@apollo/client/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  LayoutDashboard,
  ListChecks,
  Plus,
  Sparkles,
  FileText,
  Trash2,
  Printer,
  Download,
  FileEdit,
  Eye,
  CheckCircle,
  FileUp,
  RotateCcw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { ModuleAppShell } from '@/components/apps/ModuleAppShell';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWindowLaunch } from '@/components/window-launch-context';
import { CHAT_COMPLETION, STORAGE_GET_URL } from '@/lib/graphql-modules';
import {
  buildResumeMatcherPrompt,
  extractChatCompletionMessage,
  parseMatcherAiResult,
} from '@/lib/resume-prompt';
import {
  addApplication,
  addMasterResume,
  loadResumeStore,
  saveResumeStore,
  updateApplication,
  deleteMasterResume,
  deleteApplication,
} from '@/lib/resume-storage';
import type { ApplicationRecord, ApplicationStatus, MasterResume } from '@/lib/resume-types';
import { APPLICATION_STATUS_OPTIONS } from '@/lib/resume-types';
import { cn } from '@/lib/utils';
import { getStorageSignedUrl } from '@/lib/storage-signed-url';

type NavId = 'dashboard' | 'masters' | 'masters-add' | 'matcher' | 'applications';

const labelClass = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400';

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    fullText += `${pageText}\n`;
  }
  return fullText;
}

export function ResumeMatcherApp() {
  const launch = useWindowLaunch();
  const [getUrl] = useMutation(STORAGE_GET_URL);
  const storageLaunchDoneRef = useRef(false);

  const [store, setStore] = useState(() => loadResumeStore());
  const [nav, setNav] = useState<NavId>('dashboard');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [matchBusy, setMatchBusy] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  const [detailTab, setDetailTab] = useState<'resume' | 'cover'>('resume');
  const [paperTheme, setPaperTheme] = useState<'light' | 'dark'>('light');

  const [complete] = useMutation(CHAT_COMPLETION);

  // Sync state launch logic
  useEffect(() => {
    const s = launch?.storage;
    const fn = launch?.fileName ?? '';
    if (!s?.file_path || storageLaunchDoneRef.current) return;
    if (!/\.(pdf|txt|md|markdown)$/i.test(fn)) return;
    storageLaunchDoneRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const signed = await getStorageSignedUrl(getUrl, {
          bucket_type: s.bucket_type,
          file_path: s.file_path,
        });
        if (!signed || cancelled) return;
        const res = await fetch(signed);
        const blob = await res.blob();
        const baseTitle = fn.replace(/\.[^.]+$/, '') || 'From storage';
        if (/\.(txt|md|markdown)$/i.test(fn)) {
          const text = await blob.text();
          if (cancelled) return;
          setNewTitle(baseTitle);
          setNewContent(text);
          setNav('masters-add');
          return;
        }
        if (/\.pdf$/i.test(fn)) {
          setPdfBusy(true);
          const file = new File([blob], fn, { type: 'application/pdf' });
          const text = await extractPdfText(file);
          if (cancelled) return;
          setNewTitle(baseTitle);
          setNewContent(text);
          setNav('masters-add');
        }
      } catch {
        storageLaunchDoneRef.current = false;
      } finally {
        if (!cancelled) setPdfBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [launch?.fileName, launch?.storage, getUrl]);

  const applicationDetail = useMemo(
    () => (detailId ? (store.applications.find((a) => a.id === detailId) ?? null) : null),
    [detailId, store.applications]
  );

  const masterById = useCallback(
    (id: string) => store.masterResumes.find((r) => r.id === id),
    [store.masterResumes]
  );

  const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setBannerError('Only PDF auto-extract is supported. Paste text for other formats.');
      return;
    }
    setPdfBusy(true);
    setBannerError(null);
    try {
      const text = await extractPdfText(file);
      setNewContent(text);
      setNewTitle((t) => (t.trim() ? t : file.name.replace(/\.pdf$/i, '')));
    } catch {
      setBannerError('Failed to parse PDF.');
    } finally {
      setPdfBusy(false);
    }
  };

  const saveNewMaster = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      setBannerError('Title and resume text are required.');
      return;
    }
    setBannerError(null);
    setStore((prev) => {
      const next = addMasterResume(prev, newTitle.trim(), newContent.trim());
      saveResumeStore(next);
      return next;
    });
    setNewTitle('');
    setNewContent('');
    setNav('masters');
  };

  const removeMaster = (id: string) => {
    if (!confirm('Are you sure you want to delete this master resume?')) return;
    setStore((prev) => {
      const next = deleteMasterResume(prev, id);
      saveResumeStore(next);
      return next;
    });
  };

  const removeApplication = (id: string) => {
    if (!confirm('Are you sure you want to delete this matched application project?')) return;
    setStore((prev) => {
      const next = deleteApplication(prev, id);
      saveResumeStore(next);
      return next;
    });
    if (detailId === id) {
      setDetailId(null);
      setNav('dashboard');
    }
  };

  const runMatch = async () => {
    if (!selectedResumeId || !jobTitle.trim() || !company.trim() || !jobDescription.trim()) {
      setBannerError('Select a master resume and fill in all job fields.');
      return;
    }
    const resume = masterById(selectedResumeId);
    if (!resume) {
      setBannerError('Selected resume was removed.');
      return;
    }
    setMatchBusy(true);
    setBannerError(null);
    setGenerationStep('Analyzing job description keywords...');

    const prompt = buildResumeMatcherPrompt({
      masterResumeContent: resume.content,
      jobTitle: jobTitle.trim(),
      company: company.trim(),
      jobDescription: jobDescription.trim(),
    });
    const params: Record<string, unknown> = { message: prompt, stream: false };
    const prov = process.env.NEXT_PUBLIC_CHAT_PROVIDER?.trim();
    const mod = process.env.NEXT_PUBLIC_CHAT_MODEL?.trim();
    if (prov) params.provider = prov;
    if (mod) params.model = mod;

    try {
      setTimeout(() => setGenerationStep('Tailoring experience bullet points...'), 3000);
      setTimeout(() => setGenerationStep('Drafting highly aligned cover letter...'), 7000);

      const res = await complete({ variables: { params } });
      if (res.error) {
        setBannerError(res.error.message);
        return;
      }
      const raw = (res.data as Record<string, unknown> | undefined)?.chatCompletion;
      const message = extractChatCompletionMessage(raw);
      if (!message) {
        setBannerError('Empty model response. Check backend logs and provider configuration.');
        return;
      }
      const parsed = parseMatcherAiResult(message);
      let newId = '';
      setStore((prev) => {
        const { store: next, id } = addApplication(prev, {
          masterResumeId: resume.id,
          jobTitle: jobTitle.trim(),
          company: company.trim(),
          jobDescription: jobDescription.trim(),
          status: 'saved',
          matchScore: parsed.matchScore,
          tailoredResumeContent: parsed.tailoredResumeContent,
          coverLetterContent: parsed.coverLetterContent,
        });
        newId = id;
        saveResumeStore(next);
        return next;
      });
      setDetailId(newId);
      setNav('applications');
      setDetailTab('resume');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBannerError(msg || 'Generation failed.');
    } finally {
      setMatchBusy(false);
      setGenerationStep('');
    }
  };

  const patchApplication = useCallback((id: string, patch: Partial<ApplicationRecord>) => {
    setStore((prev) => {
      const next = updateApplication(prev, id, patch);
      saveResumeStore(next);
      return next;
    });
  }, []);

  const handlePrint = (app: ApplicationRecord) => {
    const printContent = document.getElementById('resume-preview-content');
    if (!printContent) return;
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');
    if (!printWindow) return;
    const title = `${app.company}_${app.jobTitle}_${detailTab}`;
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: Garamond, Georgia, serif;
              color: #111827;
              line-height: 1.45;
              padding: 24px;
              font-size: 13.5px;
            }
            h1, h2, h3, h4, h5, h6 {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
              color: #000000;
              margin-top: 1.2em;
              margin-bottom: 0.4em;
              font-weight: bold;
            }
            h1 { font-size: 1.8em; text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 4px; }
            h2 { font-size: 1.2em; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
            h3 { font-size: 1em; }
            ul, ol { padding-left: 20px; margin-top: 4px; margin-bottom: 8px; }
            li { margin-bottom: 3px; }
            p { margin-top: 4px; margin-bottom: 8px; }
            hr { border: 0; border-top: 1px solid #ccc; margin: 12px 0; }
            @page {
              size: A4;
              margin: 15mm;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const navBtn = (id: NavId, icon: React.ReactNode, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setDetailId(null);
        setNav(id);
        setBannerError(null);
      }}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold tracking-wide transition-all duration-200',
        nav === id && !detailId
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
      )}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </button>
  );

  const renderMain = () => {
    if (detailId && applicationDetail) {
      const app = applicationDetail;
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
          {/* Header Panel */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  {app.jobTitle} <span className="text-indigo-400 font-normal">@</span>{' '}
                  {app.company}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                  MATCH PROJECT DETAIL
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/40 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700 transition"
                onClick={() =>
                  downloadMarkdown(
                    `${app.company}-${app.jobTitle}-${detailTab}.md`.replace(/\s+/g, '_'),
                    detailTab === 'resume' ? app.tailoredResumeContent : app.coverLetterContent
                  )
                }
              >
                <Download className="h-3 w-3" />
                Export Markdown
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 transition"
                onClick={() => handlePrint(app)}
              >
                <Printer className="h-3 w-3" />
                Print / Save PDF
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-red-950/60 bg-red-950/20 px-2.5 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-900/45 transition"
                onClick={() => removeApplication(app.id)}
              >
                <Trash2 className="h-3 w-3" />
                Delete Project
              </button>
            </div>
          </div>

          {/* 3-Pane Responsive Layout */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[250px_1fr_270px]">
            {/* Left Pane: Match Score Info & Job Details */}
            <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              {/* Score widget */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/15 p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                  Match Accuracy
                </span>
                <div className="my-2 flex items-center justify-center">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-slate-800">
                    <span className="text-xl font-extrabold text-white">{app.matchScore}%</span>
                    {/* Background Progress Circle */}
                    <svg className="absolute -rotate-90" width="80" height="80">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="#6366f1"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={226}
                        strokeDashoffset={226 - (226 * app.matchScore) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-[10px] font-medium text-slate-400">
                  {app.matchScore >= 80
                    ? 'Highly compatible match!'
                    : app.matchScore >= 60
                      ? 'Moderate compatibility'
                      : 'Needs adjustments'}
                </div>
              </div>

              {/* Job details */}
              <div className="flex min-h-0 flex-1 flex-col">
                <h4 className={labelClass}>Job Description Reference</h4>
                <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-950/40 p-3 font-mono text-[9px] leading-relaxed text-slate-400 whitespace-pre-wrap">
                  {app.jobDescription}
                </div>
              </div>
            </div>

            {/* Center Pane: Realistic Document Preview */}
            <div className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-950/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Document Preview
                </span>
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/60 p-1">
                  <button
                    onClick={() => setPaperTheme('light')}
                    className={cn(
                      'rounded px-2 py-0.5 text-[9px] font-bold transition',
                      paperTheme === 'light'
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    Paper Mode
                  </button>
                  <button
                    onClick={() => setPaperTheme('dark')}
                    className={cn(
                      'rounded px-2 py-0.5 text-[9px] font-bold transition',
                      paperTheme === 'dark'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    OS Dark Mode
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-slate-900/25 p-4 flex justify-center">
                {/* Paper sheet effect */}
                <div
                  className={cn(
                    'w-full max-w-[700px] shadow-2xl transition-all duration-300 p-8 sm:p-12 rounded border min-h-[800px]',
                    paperTheme === 'light'
                      ? 'bg-white text-slate-900 border-slate-200 prose prose-slate max-w-none'
                      : 'bg-slate-950 text-slate-100 border-slate-850 prose prose-invert max-w-none'
                  )}
                >
                  <div
                    id="resume-preview-content"
                    className={cn(
                      'font-serif break-words select-text outline-none text-[11px] leading-relaxed',
                      paperTheme === 'light' ? 'text-slate-800' : 'text-slate-200'
                    )}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {detailTab === 'resume' ? app.tailoredResumeContent : app.coverLetterContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Pane: Controls & Editor */}
            <div className="flex min-h-0 flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              {/* Tab Selector */}
              <div>
                <span className={labelClass}>Document Type</span>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-950/65 p-1 border border-slate-800">
                  <button
                    onClick={() => setDetailTab('resume')}
                    className={cn(
                      'flex items-center justify-center gap-1 rounded py-1.5 text-xs font-semibold transition',
                      detailTab === 'resume'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    )}
                  >
                    <FileText className="h-3 w-3" />
                    Resume
                  </button>
                  <button
                    onClick={() => setDetailTab('cover')}
                    className={cn(
                      'flex items-center justify-center gap-1 rounded py-1.5 text-xs font-semibold transition',
                      detailTab === 'cover'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    )}
                  >
                    <FileEdit className="h-3 w-3" />
                    Cover Letter
                  </button>
                </div>
              </div>

              {/* Status picker */}
              <div>
                <label className={labelClass} htmlFor="app-status">
                  Application Status
                </label>
                <select
                  id="app-status"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/65 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={app.status}
                  onChange={(e) =>
                    patchApplication(app.id, { status: e.target.value as ApplicationStatus })
                  }
                >
                  {APPLICATION_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-slate-950">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Markdown Editor */}
              <div className="flex min-h-0 flex-1 flex-col">
                <label className={labelClass} htmlFor="edit-body">
                  Edit Markdown
                </label>
                <textarea
                  id="edit-body"
                  className="w-full min-h-[220px] flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950/60 p-3 font-mono text-[9px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={
                    detailTab === 'resume' ? app.tailoredResumeContent : app.coverLetterContent
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (detailTab === 'resume') {
                      patchApplication(app.id, { tailoredResumeContent: v });
                    } else {
                      patchApplication(app.id, { coverLetterContent: v });
                    }
                  }}
                  placeholder="Directly edit tailored document markdown..."
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[9px]">
                <span className="text-slate-500 font-medium">Automatic cloud-sync active</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (nav === 'masters-add') {
      return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900/10 p-6 md:p-8">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <FileUp className="h-4.5 w-4.5 text-indigo-400" />
              Add Master Resume
            </h3>
            <p className="text-[11px] text-slate-400">
              Provide your master resume content. Either upload a PDF for automatic text extraction
              or paste it directly.
            </p>
          </div>

          <div>
            <span className={labelClass}>PDF AUTO-EXTRACT</span>
            <div className="group relative flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/30 p-5 text-center transition-all hover:border-indigo-500 hover:bg-indigo-950/5">
              <input
                type="file"
                accept="application/pdf"
                disabled={pdfBusy}
                onChange={(e) => void handlePdf(e)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <FileUp className="mb-2 h-7 w-7 text-slate-500 group-hover:text-indigo-400 transition" />
              <p className="text-xs font-semibold text-slate-300">
                {pdfBusy
                  ? 'Extracting text content...'
                  : 'Click to select or drag and drop a PDF file'}
              </p>
              <p className="mt-1 text-[9px] text-slate-500">Supports PDF format up to 5MB</p>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="mr-title">
              Document Title
            </label>
            <Input
              id="mr-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer - Master 2026"
              className="border-slate-800 bg-slate-950/50 text-xs text-white placeholder-slate-600 focus-visible:ring-1 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="flex min-h-0 flex-col">
            <label className={labelClass} htmlFor="mr-body">
              Resume text (Raw / Markdown)
            </label>
            <textarea
              id="mr-body"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Paste raw resume details here, or let the PDF extractor handle it..."
              className="min-h-[220px] w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 justify-end border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={() => {
                setNav('masters');
                setBannerError(null);
              }}
              className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNewMaster}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/10 transition"
            >
              Save Resume
            </button>
          </div>
        </div>
      );
    }

    if (nav === 'masters') {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Master Resumes</h3>
              <p className="text-[11px] text-slate-500">
                Your core base resumes used for matching projects.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNav('masters-add');
                setBannerError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Upload New
            </button>
          </div>

          {store.masterResumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/20 px-4 py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-slate-650 animate-pulse" />
              <p className="text-xs font-semibold text-slate-400">
                No master documents uploaded yet
              </p>
              <p className="mt-1 text-[10px] text-slate-555 max-w-[280px]">
                Add at least one master resume to begin matching and generating tailored resumes.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {store.masterResumes.map((r: MasterResume) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/20 p-4 hover:border-indigo-500/40 hover:bg-indigo-950/5 transition duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-950/30 border border-indigo-500/15">
                      <FileText className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-bold text-slate-200 leading-tight">
                        {r.title}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        Updated {new Date(r.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMaster(r.id)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-red-950/30 hover:text-red-400 transition"
                    title="Delete resume"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (nav === 'matcher') {
      return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/10 p-6 md:p-8">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
              Create Match Project
            </h3>
            <p className="text-[11px] text-slate-400">
              Pick a baseline master resume and input target role details. The AI backend generates
              a customized CV pack.
            </p>
          </div>

          {matchBusy ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin mb-4" />
              <p className="text-sm font-bold text-white animate-pulse">
                Tailoring application documents...
              </p>
              <p className="mt-1 text-[10px] text-slate-400 font-mono tracking-wide">
                {generationStep}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="pick-resume">
                  Select Master Resume
                </label>
                <select
                  id="pick-resume"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/65 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                >
                  <option value="" disabled className="bg-slate-950">
                    -- Pick a resume document --
                  </option>
                  {store.masterResumes.map((r) => (
                    <option key={r.id} value={r.id} className="bg-slate-950">
                      {r.title}
                    </option>
                  ))}
                </select>
                {store.masterResumes.length === 0 ? (
                  <p className="mt-1 text-[10px] text-yellow-500/80">
                    Please upload a master resume first to run the optimizer.
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="jt">
                    Target Job Title
                  </label>
                  <Input
                    id="jt"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="border-slate-800 bg-slate-950/50 text-xs text-white focus-visible:ring-1 focus-visible:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="co">
                    Hiring Company
                  </label>
                  <Input
                    id="co"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="border-slate-800 bg-slate-950/50 text-xs text-white focus-visible:ring-1 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="jd">
                  Job Description / Role Requirements
                </label>
                <textarea
                  id="jd"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste details, role responsibilities, required technologies, qualifications..."
                  className="min-h-[160px] w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800/85 pt-4">
                <button
                  type="button"
                  onClick={() => setNav('dashboard')}
                  className="rounded-lg border border-slate-750 bg-slate-800/40 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={matchBusy || store.masterResumes.length === 0}
                  onClick={() => void runMatch()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Analyze & Tailor Pack
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (nav === 'applications') {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Application Matching Projects</h3>
              <p className="text-[11px] text-slate-500">
                Track and optimize custom applications generated for specific roles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNav('matcher');
                setBannerError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              New Match
            </button>
          </div>

          {store.applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/20 px-4 py-12 text-center">
              <ListChecks className="mb-3 h-10 w-10 text-slate-650 animate-pulse" />
              <p className="text-xs font-semibold text-slate-400">No matching projects yet</p>
              <p className="mt-1 text-[10px] text-slate-555 max-w-[280px]">
                Use the new match tool to create tailored materials from a master resume and job
                description.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {store.applications.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/20 px-4 py-3 hover:border-indigo-500/40 hover:bg-indigo-950/5 transition duration-200"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setDetailId(a.id);
                      setDetailTab('resume');
                      setBannerError(null);
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 truncate block">
                        {a.jobTitle}{' '}
                        <span className="text-slate-500 font-normal">@ {a.company}</span>
                      </span>
                      <span className="rounded bg-indigo-950/40 border border-indigo-500/15 px-2 py-0.5 text-[9px] font-bold text-indigo-300">
                        {a.matchScore}% match
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[8px] font-semibold text-slate-400 border border-slate-800 uppercase tracking-wide">
                        {a.status}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        Created {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeApplication(a.id)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-red-950/30 hover:text-red-400 transition"
                    title="Delete project"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    /* dashboard */
    return (
      <div className="flex flex-col gap-5">
        {/* Metric dashboard cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Master Resumes
              </span>
              <h2 className="text-2xl font-black text-white mt-1">{store.masterResumes.length}</h2>
            </div>
            <FileText className="h-8 w-8 text-indigo-500/30" />
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Match Projects
              </span>
              <h2 className="text-2xl font-black text-white mt-1">{store.applications.length}</h2>
            </div>
            <ListChecks className="h-8 w-8 text-indigo-500/30" />
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Avg. Match Score
              </span>
              <h2 className="text-2xl font-black text-indigo-400 mt-1">
                {store.applications.length > 0
                  ? Math.round(
                      store.applications.reduce((acc, current) => acc + current.matchScore, 0) /
                        store.applications.length
                    )
                  : 0}
                %
              </h2>
            </div>
            <Sparkles className="h-8 w-8 text-indigo-400/30" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNav('matcher');
              setBannerError(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            New Application Match
          </button>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900/10 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Master Resumes ({store.masterResumes.length})
            </h4>
            <button
              type="button"
              className="text-[9px] font-bold text-indigo-400 hover:underline"
              onClick={() => setNav('masters')}
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {store.masterResumes.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/20 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate text-xs font-semibold text-slate-200">{r.title}</span>
                </div>
                <span className="rounded bg-slate-800/40 border border-slate-700/60 px-1.5 py-0.5 text-[8px] text-slate-400 uppercase">
                  Stable
                </span>
              </div>
            ))}
            {store.masterResumes.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No master resumes uploaded yet.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/10 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Recent Application Matches ({store.applications.length})
            </h4>
            <button
              type="button"
              className="text-[9px] font-bold text-indigo-400 hover:underline"
              onClick={() => setNav('applications')}
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {store.applications.slice(0, 5).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setDetailId(a.id);
                  setDetailTab('resume');
                }}
                className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/20 px-3.5 py-2.5 text-left hover:border-indigo-500/30 transition hover:bg-slate-900/20"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-200 block truncate">
                    {a.company} — {a.jobTitle}
                  </span>
                  <span className="text-[8px] font-semibold text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-750 inline-block mt-1 uppercase tracking-wide">
                    {a.status}
                  </span>
                </div>
                <span className="rounded bg-indigo-950/40 border border-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-300">
                  {a.matchScore}%
                </span>
              </button>
            ))}
            {store.applications.length === 0 ? (
              <p className="text-xs text-slate-500 py-2 animate-pulse">No matches run yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    );
  };

  return (
    <ModuleAppShell>
      <div className="flex h-full min-h-[420px] w-full flex-col gap-3 sm:flex-row">
        {/* Navigation Sidebar */}
        <aside className="flex w-full shrink-0 flex-row gap-1.5 overflow-x-auto border-b border-slate-800 pb-2 sm:w-48 sm:flex-col sm:border-b-0 sm:border-r sm:pr-3 sm:pb-0">
          <div className="mb-3 hidden shrink-0 items-center gap-2 px-1.5 sm:flex border-b border-slate-850 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white shadow-md shadow-indigo-600/15">
              RM
            </div>
            <div>
              <span className="block text-xs font-black tracking-tight text-white leading-none">
                ResumeMatch
              </span>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wide">
                Optimizer
              </span>
            </div>
          </div>
          {navBtn('dashboard', <LayoutDashboard className="h-4 w-4" />, 'Dashboard')}
          {navBtn('masters', <FileText className="h-4 w-4" />, 'Master Resumes')}
          {navBtn('matcher', <Sparkles className="h-4 w-4" />, 'Optimizer Match')}
          {navBtn('applications', <ListChecks className="h-4 w-4" />, 'Match Projects')}
        </aside>

        {/* Content Canvas */}
        <div className="min-h-0 min-w-0 flex-1 overflow-auto px-1">
          {bannerError ? (
            <div className="mb-3 rounded-lg border border-red-500/35 bg-red-950/20 px-3 py-2 text-xs text-red-300 animate-fade-in flex justify-between items-center">
              <span>{bannerError}</span>
              <button
                onClick={() => setBannerError(null)}
                className="font-bold text-red-500 hover:text-red-300 px-1"
              >
                ✕
              </button>
            </div>
          ) : null}
          {renderMain()}
        </div>
      </div>
    </ModuleAppShell>
  );
}
