'use client';

import { useMutation } from '@apollo/client/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, LayoutDashboard, ListChecks, Plus, Sparkles, FileText } from 'lucide-react';

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
} from '@/lib/resume-storage';
import type { ApplicationRecord, ApplicationStatus, MasterResume } from '@/lib/resume-types';
import { APPLICATION_STATUS_OPTIONS } from '@/lib/resume-types';
import { cn } from '@/lib/utils';
import { getStorageSignedUrl } from '@/lib/storage-signed-url';

type NavId = 'dashboard' | 'masters' | 'masters-add' | 'matcher' | 'applications';

const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400';

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

  const [detailTab, setDetailTab] = useState('resume');

  const [complete] = useMutation(CHAT_COMPLETION);

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
    }
  };

  const patchApplication = useCallback((id: string, patch: Partial<ApplicationRecord>) => {
    setStore((prev) => {
      const next = updateApplication(prev, id, patch);
      saveResumeStore(next);
      return next;
    });
  }, []);

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
        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-medium transition-colors',
        nav === id && !detailId
          ? 'bg-indigo-600/90 text-white shadow-sm'
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
      )}
    >
      <span className="opacity-80">{icon}</span>
      {label}
    </button>
  );

  const renderMain = () => {
    if (detailId && applicationDetail) {
      const app = applicationDetail;
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDetailId(null)}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <h3 className="text-sm font-semibold text-white">
              {app.jobTitle} <span className="text-white/50">@</span> {app.company}
            </h3>
            <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-indigo-200">
              {app.matchScore}% match
            </span>
            <div className="ml-auto flex flex-wrap gap-1">
              <button
                type="button"
                className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/10"
                onClick={() =>
                  downloadMarkdown(
                    `${app.company}-${app.jobTitle}-resume.md`.replace(/\s+/g, '_'),
                    app.tailoredResumeContent
                  )
                }
              >
                Export resume .md
              </button>
              <button
                type="button"
                className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/10"
                onClick={() =>
                  downloadMarkdown(
                    `${app.company}-${app.jobTitle}-cover.md`.replace(/\s+/g, '_'),
                    app.coverLetterContent
                  )
                }
              >
                Export cover .md
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,220px)_1fr_minmax(0,260px)]">
            <div className="flex min-h-0 flex-col gap-2 rounded-lg border border-white/10 bg-black/25 p-3">
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/40 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    Match score
                  </span>
                  <span className="text-lg font-black text-indigo-100">{app.matchScore}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-950">
                  <div
                    className="h-full bg-indigo-500 transition-[width]"
                    style={{ width: `${Math.min(100, Math.max(0, app.matchScore))}%` }}
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <h4 className={labelClass}>Job description</h4>
                <div className="max-h-48 overflow-auto rounded border border-white/10 bg-black/30 p-2 text-[10px] leading-relaxed text-slate-300 lg:max-h-none">
                  {app.jobDescription}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/20 p-3">
              <Tabs
                value={detailTab}
                onValueChange={setDetailTab}
                className="flex min-h-0 flex-1 flex-col gap-2"
              >
                <TabsList className="w-full shrink-0 justify-start border-b border-white/10 bg-transparent p-0">
                  <TabsTrigger value="resume">Resume</TabsTrigger>
                  <TabsTrigger value="cover">Cover letter</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="resume"
                  className="min-h-0 flex-1 overflow-auto border-0 bg-transparent p-0"
                >
                  <div className="whitespace-pre-wrap rounded border border-white/10 bg-white/[0.03] p-4 text-[11px] leading-relaxed text-slate-100">
                    {app.tailoredResumeContent}
                  </div>
                </TabsContent>
                <TabsContent
                  value="cover"
                  className="min-h-0 flex-1 overflow-auto border-0 bg-transparent p-0"
                >
                  <div className="whitespace-pre-wrap rounded border border-white/10 bg-white/[0.03] p-4 text-[11px] leading-relaxed text-slate-100">
                    {app.coverLetterContent}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex min-h-0 flex-col gap-3 rounded-lg border border-white/10 bg-black/25 p-3">
              <div>
                <label className={labelClass} htmlFor="app-status">
                  Application status
                </label>
                <select
                  id="app-status"
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-2 text-xs text-slate-100"
                  value={app.status}
                  onChange={(e) =>
                    patchApplication(app.id, { status: e.target.value as ApplicationStatus })
                  }
                >
                  {APPLICATION_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-h-0 flex-1">
                <label className={labelClass} htmlFor="edit-body">
                  Edit content
                </label>
                <textarea
                  id="edit-body"
                  className="h-64 w-full resize-y rounded-md border border-white/15 bg-black/40 p-2 font-mono text-[10px] text-slate-100 lg:h-80"
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
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Edits save to this browser (local storage).
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (nav === 'masters-add') {
      return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <h3 className="text-sm font-semibold text-white">Add master resume</h3>
          <div>
            <span className={labelClass}>PDF (optional)</span>
            <Input
              type="file"
              accept="application/pdf"
              disabled={pdfBusy}
              onChange={(e) => void handlePdf(e)}
              className="cursor-pointer border-white/15 bg-black/30 text-xs file:mr-2 file:rounded file:border-0 file:bg-indigo-600/80 file:px-2 file:py-1 file:text-xs file:text-white"
            />
            {pdfBusy ? <p className="mt-1 text-[10px] text-slate-400">Extracting text…</p> : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="mr-title">
              Title
            </label>
            <Input
              id="mr-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Software Engineer 2026"
              className="border-white/15 bg-black/30 text-sm"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="mr-body">
              Resume text
            </label>
            <textarea
              id="mr-body"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Paste resume text or upload a PDF above."
              className="min-h-[240px] w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setNav('masters');
                setBannerError(null);
              }}
              className="rounded-md border border-white/15 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNewMaster}
              className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Save resume
            </button>
          </div>
        </div>
      );
    }

    if (nav === 'masters') {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Master resumes</h3>
            <button
              type="button"
              onClick={() => {
                setNav('masters-add');
                setBannerError(null);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
          {store.masterResumes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
              No master resumes yet. Add one to use the matcher.
            </p>
          ) : (
            <ul className="space-y-2">
              {store.masterResumes.map((r: MasterResume) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-3 py-2"
                >
                  <span className="truncate text-sm font-medium text-slate-100">{r.title}</span>
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (nav === 'matcher') {
      return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <div>
            <h3 className="text-sm font-semibold text-white">New application match</h3>
            <p className="text-[11px] text-slate-400">
              Job details are sent to ai.backend via GraphQL chatCompletion (same as Chat app).
            </p>
          </div>
          <div>
            <label className={labelClass} htmlFor="pick-resume">
              Master resume
            </label>
            <select
              id="pick-resume"
              className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-2 text-xs text-slate-100"
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
            >
              <option value="" disabled>
                Select a resume
              </option>
              {store.masterResumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="jt">
                Job title
              </label>
              <Input
                id="jt"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Designer"
                className="border-white/15 bg-black/30 text-sm"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="co">
                Company
              </label>
              <Input
                id="co"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="border-white/15 bg-black/30 text-sm"
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="jd">
              Job description
            </label>
            <textarea
              id="jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description…"
              className="min-h-[160px] w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="button"
            disabled={matchBusy}
            onClick={() => void runMatch()}
            className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {matchBusy ? 'Generating…' : 'Generate tailored pack'}
          </button>
        </div>
      );
    }

    if (nav === 'applications') {
      return (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white">Applications</h3>
          {store.applications.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
              No saved applications yet. Run a match from the matcher tab.
            </p>
          ) : (
            <ul className="space-y-2">
              {store.applications.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailId(a.id);
                      setDetailTab('resume');
                      setBannerError(null);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-left hover:border-indigo-500/40 hover:bg-indigo-950/20"
                  >
                    <span className="text-sm font-medium text-slate-100">
                      {a.jobTitle} <span className="text-white/40">@</span> {a.company}
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-indigo-300">
                      {a.matchScore}%
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    /* dashboard */
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNav('matcher');
              setBannerError(null);
            }}
            className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            New application match
          </button>
        </div>
        <section className="rounded-lg border border-white/10 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-[11px] font-bold uppercase text-slate-400">
              Master resumes ({store.masterResumes.length})
            </h4>
            <button
              type="button"
              className="text-[10px] font-bold text-indigo-300 hover:underline"
              onClick={() => setNav('masters')}
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {store.masterResumes.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <span className="truncate text-sm font-semibold text-slate-100">{r.title}</span>
                <span className="text-[10px] text-slate-500">Stable</span>
              </div>
            ))}
            {store.masterResumes.length === 0 ? (
              <p className="text-xs text-slate-500">No master resumes uploaded yet.</p>
            ) : null}
          </div>
        </section>
        <section className="rounded-lg border border-white/10 bg-black/25 p-4">
          <div className="mb-3 border-b border-white/10 pb-2">
            <h4 className="text-[11px] font-bold uppercase text-slate-400">
              Recent applications ({store.applications.length})
            </h4>
          </div>
          <div className="space-y-2">
            {store.applications.slice(0, 8).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setDetailId(a.id);
                  setDetailTab('resume');
                }}
                className="flex w-full items-center justify-between rounded border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-indigo-500/30"
              >
                <span className="text-xs font-medium text-slate-200">
                  {a.company} — {a.jobTitle}
                </span>
                <span className="text-[10px] text-slate-500">{a.matchScore}%</span>
              </button>
            ))}
            {store.applications.length === 0 ? (
              <p className="text-xs text-slate-500">No applications yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    );
  };

  return (
    <ModuleAppShell
      title="Resume Matcher"
      subtitle="Tailor your resume. Hit the keywords. Get the interview."
    >
      <div className="flex h-full min-h-[420px] w-full flex-col gap-3 sm:flex-row">
        <aside className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b border-white/10 pb-2 sm:w-52 sm:flex-col sm:border-b-0 sm:border-r sm:pr-2 sm:pb-0">
          <div className="mb-2 hidden shrink-0 items-center gap-2 px-1 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              RM
            </div>
            <span className="text-xs font-semibold tracking-tight text-slate-200">ResumeMatch</span>
          </div>
          {navBtn('dashboard', <LayoutDashboard className="h-4 w-4" />, 'Dashboard')}
          {navBtn('masters', <FileText className="h-4 w-4" />, 'Master resumes')}
          {navBtn('matcher', <Sparkles className="h-4 w-4" />, 'New match')}
          {navBtn('applications', <ListChecks className="h-4 w-4" />, 'Applications')}
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          {bannerError ? (
            <div className="mb-3 rounded-md border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-100">
              {bannerError}
            </div>
          ) : null}
          {renderMain()}
        </div>
      </div>
    </ModuleAppShell>
  );
}
