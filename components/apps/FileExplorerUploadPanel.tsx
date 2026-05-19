'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Trash2, UploadCloud, X } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { STORAGE_UPLOAD_MAX_BYTES } from '@/lib/file-explorer-storage';

const MAX_MB = Math.round(STORAGE_UPLOAD_MAX_BYTES / (1024 * 1024));

export type UploadQueueRow = {
  id: string;
  file: File;
  webkit: boolean;
  status: 'queued' | 'uploading' | 'completed' | 'error';
  progress: number;
  errorMessage?: string;
};

export type UploadRowPatch = Partial<Pick<UploadQueueRow, 'status' | 'progress' | 'errorMessage'>>;

export type FileExplorerUploadPanelProps = {
  open: boolean;
  onClose: () => void;
  baseSegments: string[];
  destinationLabel: string;
  reducedMotion: boolean;
  executeUploads: (
    baseSeg: string[],
    items: { id: string; file: File; webkit: boolean }[],
    update: (id: string, patch: UploadRowPatch) => void
  ) => Promise<void>;
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function shortKindLabel(file: File): string {
  const sub = file.type.split('/')[1]?.toUpperCase().slice(0, 3);
  if (sub) return sub;
  const dot = file.name.lastIndexOf('.');
  if (dot >= 0) return file.name.slice(dot + 1, dot + 4).toUpperCase() || 'FILE';
  return 'FILE';
}

export function FileExplorerUploadPanel({
  open,
  onClose,
  baseSegments,
  destinationLabel,
  reducedMotion,
  executeUploads,
}: FileExplorerUploadPanelProps) {
  const [queue, setQueue] = React.useState<UploadQueueRow[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dropEmptyHint, setDropEmptyHint] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dirInputRef = React.useRef<HTMLInputElement>(null);

  const updateRow = React.useCallback((id: string, patch: UploadRowPatch) => {
    setQueue((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const runUploads = React.useCallback(
    async (rows: UploadQueueRow[]) => {
      if (rows.length === 0) return;
      try {
        await executeUploads(
          baseSegments,
          rows.map((r) => ({ id: r.id, file: r.file, webkit: r.webkit })),
          updateRow
        );
      } catch (e) {
        console.error('FileExplorer upload pipeline failed', e);
      }
    },
    [baseSegments, executeUploads, updateRow]
  );

  const enqueue = React.useCallback(
    (files: File[], webkit: boolean) => {
      if (files.length === 0) return;
      setDropEmptyHint(null);
      const rows: UploadQueueRow[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        webkit,
        status: 'queued',
        progress: 0,
      }));
      setQueue((prev) => [...prev, ...rows]);
      void runUploads(rows).catch((e) => {
        console.error('runUploads rejected', e);
      });
    },
    [runUploads]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length === 0) {
      setDropEmptyHint(
        'That drop had no files. Drag individual files here, or use Browse folder to upload a folder tree.'
      );
      return;
    }
    setDropEmptyHint(null);
    enqueue(dropped, false);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    /** Snapshot before resetting value — `FileList` from `input.files` is live; clearing the input can empty it. */
    const picked = e.target.files?.length ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (!picked.length) return;
    enqueue(picked, false);
  };

  const onDirInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.length ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (!picked.length) return;
    enqueue(picked, true);
  };

  const removeRow = (id: string) => {
    setQueue((prev) => prev.filter((r) => r.id !== id));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((r) => r.status !== 'completed'));
  };

  const transition = reducedMotion
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 380, damping: 32 } as const);

  return (
    <AnimatePresence mode="sync">
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close upload panel"
            className="fixed inset-0 z-20 bg-black/45 backdrop-blur-[2px] md:hidden"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={transition}
            onClick={onClose}
          />
          <motion.aside
            role="complementary"
            aria-label="Upload to My Storage"
            className={cn(
              'flex max-h-full min-h-0 flex-col border-white/10 bg-slate-950/98 shadow-2xl backdrop-blur-md',
              'fixed inset-y-0 right-0 z-30 w-full max-w-sm border-l md:static md:z-0 md:max-h-none md:w-[min(100%,380px)] md:max-w-none md:shrink-0 md:shadow-none'
            )}
            initial={reducedMotion ? false : { x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reducedMotion ? undefined : { x: 24, opacity: 0 }}
            transition={transition}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b border-white/10 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <UploadCloud className="h-5 w-5 text-sky-300" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white">Upload</h3>
                      <p className="mt-0.5 text-[11px] leading-snug text-white/55">
                        Files upload to the folder shown below. Max {MAX_MB} MB per file in this
                        build.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Close"
                    aria-label="Close upload panel"
                    onClick={onClose}
                    className="shrink-0 rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 truncate rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-sky-200/90">
                  <span className="text-white/40">To </span>
                  {destinationLabel}
                </p>
              </div>

              <div className="shrink-0 space-y-2 border-b border-white/10 p-4">
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={cn(
                    'rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
                    isDragging
                      ? 'border-sky-400/70 bg-sky-500/15'
                      : 'border-white/15 bg-black/20 hover:border-sky-400/40'
                  )}
                >
                  <UploadCloud className="mx-auto mb-2 h-8 w-8 text-white/35" strokeWidth={1.5} />
                  <p className="text-xs font-medium text-white/85">Drop files here</p>
                  <p className="mt-1 text-[10px] text-white/45">Folder trees: use Browse folder.</p>
                  {dropEmptyHint ? (
                    <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] leading-snug text-amber-100/90">
                      {dropEmptyHint}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Choose files to upload"
                    onChange={onFileInputChange}
                  />
                  <input
                    ref={dirInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Choose folder to upload"
                    onChange={onDirInputChange}
                    {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
                  />
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-white/15 bg-white/10 py-2 text-xs font-medium text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse files
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-white/15 bg-white/10 py-2 text-xs font-medium text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
                    onClick={() => dirInputRef.current?.click()}
                  >
                    Browse folder
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {queue.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-white/40">
                    No files in queue yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {queue.map((row) => (
                      <li key={row.id} className="flex items-start gap-2 px-3 py-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white/60">
                          {shortKindLabel(row.file)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-xs font-medium text-white/90"
                            title={row.file.name}
                          >
                            {row.file.name}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[10px] text-white/45">
                            <span>{formatFileSize(row.file.size)}</span>
                            <span>·</span>
                            <span
                              className={cn(
                                row.status === 'uploading' && 'text-sky-300',
                                row.status === 'completed' && 'text-emerald-400',
                                row.status === 'error' && 'text-red-300',
                                row.status === 'queued' && 'text-amber-200/80'
                              )}
                            >
                              {row.status === 'queued' && 'Queued'}
                              {row.status === 'uploading' && 'Uploading…'}
                              {row.status === 'completed' && 'Done'}
                              {row.status === 'error' && (row.errorMessage ?? 'Error')}
                            </span>
                          </div>
                          {(row.status === 'uploading' || row.status === 'queued') && (
                            <Progress className="mt-1.5 h-1.5" value={row.progress} />
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {row.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />
                          ) : null}
                          <button
                            type="button"
                            title="Remove from queue"
                            aria-label="Remove from queue"
                            disabled={row.status === 'uploading'}
                            onClick={() => removeRow(row.id)}
                            className={cn(
                              'rounded-full p-1.5 text-white/45 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50',
                              row.status === 'uploading' && 'pointer-events-none opacity-30'
                            )}
                          >
                            {row.status === 'completed' ? (
                              <Trash2 className="h-3.5 w-3.5" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {queue.some((r) => r.status === 'completed') ? (
                <div className="shrink-0 border-t border-white/10 p-3">
                  <button
                    type="button"
                    className="w-full rounded-md border border-white/10 py-1.5 text-[11px] text-white/70 hover:bg-white/5"
                    onClick={clearCompleted}
                  >
                    Clear completed
                  </button>
                </div>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
