'use client';

import * as React from 'react';
import { CheckCircle2, Trash2, UploadCloud, X } from 'lucide-react';

import { Presence } from '@/components/motion/PresenceList';
import { SpringBox } from '@/components/motion/SpringBox';
import { Progress } from '@/components/ui/progress';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { cn } from '@/lib/utils';
import { STORAGE_UPLOAD_MAX_BYTES } from '@/lib/file-explorer-storage';

const MAX_LIMIT_LABEL =
  STORAGE_UPLOAD_MAX_BYTES >= 1024 * 1024 * 1024
    ? `${Math.round(STORAGE_UPLOAD_MAX_BYTES / (1024 * 1024 * 1024))} GB`
    : `${Math.round(STORAGE_UPLOAD_MAX_BYTES / (1024 * 1024))} MB`;

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

  const backdropStyle = useReducedMotionStyle(
    reducedMotion ? { opacity: 1 } : { opacity: 1 },
    overlaySpring
  );
  const panelStyle = useReducedMotionStyle(
    reducedMotion ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 },
    overlaySpring
  );

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

  return (
    <Presence show={open} presenceKey="upload-panel" itemClassName="h-full">
      <SpringBox
        className={cn(
          'flex h-full min-h-0 flex-col border-l border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-xl',
          'w-full md:w-80 lg:w-96 shrink-0'
        )}
        defaultStyle={reducedMotion ? undefined : { opacity: 0, x: 40 }}
        style={panelStyle}
        mapStyle={(s) => ({
          opacity: s.opacity,
          transform: s.x != null ? `translate3d(${s.x}px, 0, 0)` : undefined,
        })}
      >
        <div
          role="complementary"
          aria-label="Upload to My Storage"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="shrink-0 border-b border-white/10 bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 shadow-inner ring-1 ring-white/10">
                  <UploadCloud className="h-5 w-5 text-blue-400" strokeWidth={2} />
                </div>
                <div className="min-w-0 mt-0.5">
                  <h3 className="text-sm font-semibold tracking-tight text-white/90">Upload</h3>
                  <p className="mt-0.5 text-[10px] leading-snug text-white/50">
                    Max {MAX_LIMIT_LABEL} per file
                  </p>
                </div>
              </div>
              <button
                type="button"
                title="Close"
                aria-label="Close upload panel"
                onClick={onClose}
                className="shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 truncate rounded-lg border border-white/5 bg-black/40 px-2.5 py-2 text-[11px] text-blue-200/80 shadow-inner">
              <span className="text-white/40">Dest: </span>
              {destinationLabel}
            </p>
          </div>

          <div className="shrink-0 space-y-3 border-b border-white/10 p-4">
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={cn(
                'rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-300',
                isDragging
                  ? 'border-blue-400 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-[1.02]'
                  : 'border-white/20 bg-black/30 hover:border-blue-400/50 hover:bg-black/40'
              )}
            >
              <UploadCloud
                className={cn(
                  'mx-auto mb-3 h-10 w-10 transition-colors duration-300',
                  isDragging ? 'text-blue-400' : 'text-white/40'
                )}
                strokeWidth={1.5}
              />
              <p className="text-sm font-medium text-white/90">Drop files here</p>
              <p className="mt-1.5 text-[11px] text-white/50">Folder trees: use Browse folder.</p>
              {dropEmptyHint ? (
                <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-200/90 shadow-inner">
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
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 shadow-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse files
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 shadow-sm"
                onClick={() => dirInputRef.current?.click()}
              >
                Browse folder
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {queue.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center opacity-60">
                <p className="text-xs text-white/50">No files in queue yet.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {queue.map((row) => (
                  <li
                    key={row.id}
                    className="group flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 p-2.5 transition-colors hover:bg-black/30"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold tracking-wider text-white/60 shadow-inner ring-1 ring-white/10">
                      {shortKindLabel(row.file)}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p
                        className="truncate text-xs font-semibold text-white/95"
                        title={row.file.name}
                      >
                        {row.file.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[10px] font-medium text-white/50">
                        <span>{formatFileSize(row.file.size)}</span>
                        <span className="text-white/30">•</span>
                        <span
                          className={cn(
                            row.status === 'uploading' && 'text-blue-400 animate-pulse',
                            row.status === 'completed' && 'text-emerald-400',
                            row.status === 'error' && 'text-red-400',
                            row.status === 'queued' && 'text-amber-300'
                          )}
                        >
                          {row.status === 'queued' && 'Queued'}
                          {row.status === 'uploading' && 'Uploading…'}
                          {row.status === 'completed' && 'Done'}
                          {row.status === 'error' && (row.errorMessage ?? 'Error')}
                        </span>
                      </div>
                      {(row.status === 'uploading' || row.status === 'queued') && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/40 shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>
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
            <div className="shrink-0 border-t border-white/10 bg-black/20 p-3">
              <button
                type="button"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 shadow-sm"
                onClick={clearCompleted}
              >
                Clear completed
              </button>
            </div>
          ) : null}
        </div>
      </SpringBox>
    </Presence>
  );
}
