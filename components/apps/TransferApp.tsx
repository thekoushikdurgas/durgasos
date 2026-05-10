'use client';

import { useCallback, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  formatPathDisplay,
  listDirectory,
  pathExists,
  goTo,
  initialHistory,
  type NavHistory,
  type PathSegments,
} from '@/lib/file-explorer-mock';
import { remoteChildren, toMockEntries } from '@/lib/transfer-mock';

type LogLine = { id: string; kind: 'cmd' | 'ok' | 'err'; text: string };

export function TransferApp() {
  const [host, setHost] = useState('draco');
  const [user, setUser] = useState('foxlet');
  const [pass, setPass] = useState('');
  const [port, setPort] = useState('22');
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);

  const [localHist, setLocalHist] = useState<NavHistory>(() =>
    initialHistory(['This PC', 'Documents'])
  );
  const [remotePath, setRemotePath] = useState<string[]>(['home', 'foxlet']);

  const localEntries = listDirectory(localHist.current);
  const remoteNodes = useMemo(() => remoteChildren(remotePath), [remotePath]);
  const remoteEntries = useMemo(() => toMockEntries(remoteNodes), [remoteNodes]);

  const pushLog = useCallback((kind: LogLine['kind'], text: string) => {
    setLog((l) => [...l, { id: `${Date.now()}-${l.length}`, kind, text }]);
  }, []);

  const connect = () => {
    setConnected(true);
    pushLog('cmd', `OPEN ${user}@${host}:${port} (SFTP mock)`);
    pushLog('ok', 'Directory listing /home/foxlet');
  };

  const localGo = (path: PathSegments) => {
    if (!pathExists(path)) return;
    setLocalHist((h) => goTo(h, path));
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950/95 text-slate-100">
      <div className="flex shrink-0 flex-wrap items-end gap-2 border-b border-white/10 p-2">
        <label className="text-[10px] text-white/50">
          Host
          <Input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="mt-0.5 w-28 border-white/10 bg-black/40 text-xs text-white"
          />
        </label>
        <label className="text-[10px] text-white/50">
          User
          <Input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="mt-0.5 w-24 border-white/10 bg-black/40 text-xs text-white"
          />
        </label>
        <label className="text-[10px] text-white/50">
          Password
          <Input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="mt-0.5 w-24 border-white/10 bg-black/40 text-xs text-white"
          />
        </label>
        <label className="text-[10px] text-white/50">
          Port
          <Input
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="mt-0.5 w-14 border-white/10 bg-black/40 text-xs text-white"
          />
        </label>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
          onClick={connect}
        >
          Quickconnect
        </button>
      </div>

      <div className="h-24 shrink-0 overflow-auto border-b border-white/5 bg-black/40 p-2 font-mono text-[10px]">
        {log.map((line) => (
          <div
            key={line.id}
            className={cn(
              line.kind === 'cmd' && 'text-blue-300',
              line.kind === 'ok' && 'text-emerald-300',
              line.kind === 'err' && 'text-red-300'
            )}
          >
            {line.text}
          </div>
        ))}
        {!connected ? <span className="text-white/40">Not connected.</span> : null}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-white/10">
        {/* Local */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="shrink-0 border-b border-white/5 px-2 py-1 text-[10px] font-semibold text-white/60">
            Local site
          </div>
          <div className="h-24 shrink-0 overflow-auto border-b border-white/5 p-1 text-[10px] text-white/50">
            {formatPathDisplay(localHist.current)}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-900/95 text-white/45">
                <tr>
                  <th className="p-1">Name</th>
                  <th className="p-1">Size</th>
                  <th className="p-1">Modified</th>
                </tr>
              </thead>
              <tbody>
                {localEntries.map((e) => (
                  <tr
                    key={e.id}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/5"
                    onDoubleClick={() => {
                      if (e.kind !== 'file') {
                        localGo([...localHist.current, e.name] as PathSegments);
                      }
                    }}
                  >
                    <td className="p-1">{e.name}</td>
                    <td className="p-1 text-white/50">{e.sizeBytes ?? '—'}</td>
                    <td className="p-1 text-white/40">{e.modified?.slice(0, 10) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Remote */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="shrink-0 border-b border-white/5 px-2 py-1 text-[10px] font-semibold text-white/60">
            Remote site
          </div>
          <div className="flex h-8 shrink-0 items-center gap-1 border-b border-white/5 px-1 text-[10px]">
            <button
              type="button"
              className="rounded px-1 hover:bg-white/10"
              onClick={() => {
                if (remotePath.length > 0) setRemotePath(remotePath.slice(0, -1));
              }}
            >
              Up
            </button>
            <span className="truncate text-white/50">/{remotePath.join('/')}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-900/95 text-white/45">
                <tr>
                  <th className="p-1">Name</th>
                  <th className="p-1">Size</th>
                  <th className="p-1">Type</th>
                </tr>
              </thead>
              <tbody>
                {remoteEntries.map((e) => (
                  <tr
                    key={e.id}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/5"
                    onDoubleClick={() => {
                      if (e.kind !== 'file') {
                        setRemotePath((p) => [...p, e.name]);
                      }
                    }}
                  >
                    <td className="p-1">{e.name}</td>
                    <td className="p-1 text-white/50">{e.sizeBytes ?? '—'}</td>
                    <td className="p-1 text-white/40">{e.typeLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex h-24 shrink-0 flex-col border-t border-white/10 bg-black/30">
        <div className="flex gap-2 border-b border-white/5 px-2 pt-1 text-[10px]">
          {(['Queued', 'Failed', 'Successful'] as const).map((t) => (
            <span
              key={t}
              className="rounded-t border border-b-0 border-white/10 px-2 py-0.5 text-white/50"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-2 text-[10px] text-white/40">
          No transfers in queue.
        </div>
      </div>

      <footer className="flex h-6 shrink-0 items-center justify-between border-t border-white/10 px-2 text-[10px] text-white/45">
        <span>Queue: 0</span>
        <span>{connected ? '🔒 Secure (mock)' : 'Disconnected'}</span>
      </footer>
    </div>
  );
}
