'use client';

import { useMemo, useState } from 'react';
import { Archive, File, Folder, Info, Plus, Minus, Search, Wand2, Stethoscope } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  formatPathDisplay,
  listDirectory,
  parentPath,
  pathExists,
  type MockFsEntry,
  type PathSegments,
} from '@/lib/file-explorer-mock';
import { DEMO_ARCHIVE_ROOT, listArchiveDir, type ArchiveEntry } from '@/lib/archive-mock';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

export function ArchiverApp() {
  const [fsPath, setFsPath] = useState<PathSegments>(['This PC']);
  /** Empty string = filesystem; else path key inside ARCHIVE_MOCK_TREE */
  const [archiveKey, setArchiveKey] = useState('');
  const [selectedFs, setSelectedFs] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const inArchive = archiveKey.length > 0;

  const fsEntries = useMemo(() => listDirectory(fsPath), [fsPath]);
  const archiveEntries = useMemo(
    () => (inArchive ? listArchiveDir(archiveKey) : []),
    [archiveKey, inArchive]
  );

  const openFsEntry = (e: MockFsEntry) => {
    if (e.kind !== 'file' && pathExists([...fsPath, e.name] as PathSegments)) {
      setFsPath([...fsPath, e.name] as PathSegments);
      return;
    }
    if (e.name.endsWith('.zip')) {
      setArchiveKey(DEMO_ARCHIVE_ROOT);
    }
  };

  const goUp = () => {
    if (inArchive) {
      if (archiveKey === DEMO_ARCHIVE_ROOT) {
        setArchiveKey('');
        return;
      }
      const parts = archiveKey.split('/');
      parts.pop();
      setArchiveKey(parts.join('/') || DEMO_ARCHIVE_ROOT);
      return;
    }
    const p = parentPath(fsPath);
    if (p && pathExists(p)) setFsPath(p);
  };

  const openArchiveFolder = (name: string) => {
    const next =
      archiveKey === DEMO_ARCHIVE_ROOT ? `${DEMO_ARCHIVE_ROOT}/${name}` : `${archiveKey}/${name}`;
    setArchiveKey(next);
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950/90 text-slate-100">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-white/10 px-2 text-[10px] uppercase">
        {['File', 'Commands', 'Tools', 'Favorites', 'Options', 'Help'].map((m) => (
          <button
            key={m}
            type="button"
            className="rounded px-2 py-1 hover:bg-white/10"
            onClick={() => m === 'Help' && setAboutOpen(true)}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/5 px-2">
        <button
          type="button"
          className="rounded border border-white/10 p-1.5 hover:bg-white/10"
          title="Add"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded border border-white/10 p-1.5 hover:bg-white/10"
          title="Extract"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded border border-white/10 p-1.5 opacity-50"
          title="Test"
        >
          <Archive className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded border border-white/10 p-1.5 opacity-50"
          title="Find"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded border border-white/10 p-1.5 opacity-50"
          title="Wizard"
        >
          <Wand2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded border border-white/10 p-1.5 opacity-50"
          title="Repair"
        >
          <Stethoscope className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded border border-white/10 p-1.5 hover:bg-white/10"
          title="Info"
          onClick={() => setAboutOpen(true)}
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/5 px-2">
        <button
          type="button"
          className="rounded border border-white/10 px-2 py-0.5 text-[11px] hover:bg-white/10"
          onClick={goUp}
        >
          Up
        </button>
        <Input
          readOnly
          value={inArchive ? archiveKey : formatPathDisplay(fsPath)}
          className="min-w-0 flex-1 border-white/10 bg-black/30 py-1 text-xs text-white"
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-40 shrink-0 overflow-y-auto border-r border-white/10 p-2 text-[11px]">
          <p className="mb-1 font-bold text-white/40">Places</p>
          <button
            type="button"
            className="block w-full truncate rounded px-1 py-0.5 text-left hover:bg-white/10"
            onClick={() => {
              setArchiveKey('');
              setFsPath(['This PC']);
            }}
          >
            This PC
          </button>
          <button
            type="button"
            className="mt-1 block w-full truncate rounded px-1 py-0.5 text-left hover:bg-white/10"
            onClick={() => {
              setArchiveKey('');
              setFsPath(['This PC', 'Documents']);
            }}
          >
            Documents
          </button>
        </aside>
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          {!inArchive ? (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 border-b border-white/10 bg-slate-900/95 text-white/50">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2 text-right">Size</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Modified</th>
                </tr>
              </thead>
              <tbody>
                {fsEntries.map((e) => (
                  <tr
                    key={e.id}
                    className={cn(
                      'cursor-pointer border-b border-white/5 hover:bg-white/5',
                      selectedFs === e.id ? 'bg-blue-500/15' : ''
                    )}
                    onClick={() => setSelectedFs(e.id)}
                    onDoubleClick={() => openFsEntry(e)}
                  >
                    <td className="flex items-center gap-2 p-2">
                      {e.kind === 'file' ? (
                        <File className="h-4 w-4 text-amber-200/80" />
                      ) : (
                        <Folder className="h-4 w-4 text-blue-400/80" />
                      )}
                      {e.name}
                    </td>
                    <td className="p-2 text-right tabular-nums text-white/60">
                      {e.sizeBytes != null ? formatBytes(e.sizeBytes) : '—'}
                    </td>
                    <td className="p-2 text-white/50">{e.typeLabel ?? '—'}</td>
                    <td className="p-2 text-white/45">{e.modified?.slice(0, 10) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 border-b border-white/10 bg-slate-900/95 text-white/50">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2 text-right">Size</th>
                  <th className="p-2 text-right">Packed</th>
                  <th className="p-2">Modified</th>
                  <th className="p-2">Attr</th>
                  <th className="p-2">Method</th>
                </tr>
              </thead>
              <tbody>
                {archiveEntries.map((e: ArchiveEntry) => (
                  <tr
                    key={e.id}
                    className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                    onDoubleClick={() => e.kind === 'folder' && openArchiveFolder(e.name)}
                  >
                    <td className="flex items-center gap-2 p-2">
                      {e.kind === 'folder' ? (
                        <Folder className="h-4 w-4 text-blue-400" />
                      ) : (
                        <File className="h-4 w-4 text-amber-200" />
                      )}
                      {e.name}
                    </td>
                    <td className="p-2 text-right tabular-nums">{formatBytes(e.sizeBytes)}</td>
                    <td className="p-2 text-right tabular-nums">{formatBytes(e.packedBytes)}</td>
                    <td className="p-2 text-white/45">{e.modified.slice(0, 16)}</td>
                    <td className="p-2">{e.attributes}</td>
                    <td className="p-2 text-white/50">{e.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <footer className="flex h-7 shrink-0 items-center border-t border-white/10 bg-black/30 px-3 text-[10px] text-white/50">
        {inArchive
          ? `${archiveEntries.length} object(s) in archive`
          : `${fsEntries.length} item(s)`}{' '}
        · demo archive: open <code className="text-white/70">demo.zip</code> from This PC
      </footer>

      {aboutOpen ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-sm rounded-xl border border-white/15 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold">About Archiver</h2>
            <p className="mt-2 text-xs text-white/60">Durgasos mock 7-Zip / WinRAR style shell.</p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs"
              onClick={() => setAboutOpen(false)}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
