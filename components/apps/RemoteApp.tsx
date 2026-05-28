'use client';

import { useCallback, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { swallowStorageError } from '@/lib/safe-client-storage';

const STORAGE_KEY = 'durgasos.remote.sessions.v1';

type SessionProfile = { name: string; host: string; port: string; kind: 'ssh' | 'telnet' | 'raw' };

const DEFAULT_PROFILES: SessionProfile[] = [
  { name: 'Default Settings', host: '127.0.0.1', port: '22', kind: 'ssh' },
];

type Cat = 'Session' | 'Terminal' | 'Window' | 'Connection' | 'SSH' | 'Telnet' | 'Serial';

const TREE: { id: Cat; label: string; depth: number }[] = [
  { id: 'Session', label: 'Session', depth: 0 },
  { id: 'Terminal', label: 'Terminal', depth: 0 },
  { id: 'Window', label: 'Window', depth: 0 },
  { id: 'Connection', label: 'Connection', depth: 0 },
  { id: 'SSH', label: 'SSH', depth: 1 },
  { id: 'Telnet', label: 'Telnet', depth: 1 },
  { id: 'Serial', label: 'Serial', depth: 1 },
];

export function RemoteApp() {
  const [phase, setPhase] = useState<'config' | 'session'>('config');
  const [cat, setCat] = useState<Cat>('Session');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('22');
  const [kind, setKind] = useState<SessionProfile['kind']>('ssh');
  const [profiles, setProfiles] = useState<SessionProfile[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PROFILES;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as SessionProfile[];
    } catch (err) {
      swallowStorageError('remote-app.loadSessions', err);
    }
    return DEFAULT_PROFILES;
  });
  const [sessionName, setSessionName] = useState('Default Settings');
  const [lines, setLines] = useState<string[]>([]);

  const saveProfiles = useCallback((next: SessionProfile[]) => {
    setProfiles(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const openSession = () => {
    setPhase('session');
    setLines([
      `[${new Date().toLocaleTimeString()}] Connecting to ${kind.toUpperCase()} ${host}:${port} (mock)…`,
      `[${new Date().toLocaleTimeString()}] Authenticated as demo user.`,
      `[${new Date().toLocaleTimeString()}] Welcome to Durgas Remote shell.`,
      `$ `,
    ]);
  };

  const panel = useMemo(() => {
    if (cat === 'Session') {
      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="mb-1 block text-white/50">Host</label>
            <Input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="border-white/10 bg-black/30 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-white/50">Port</label>
            <Input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="border-white/10 bg-black/30 text-white"
            />
          </div>
          <div className="flex gap-3">
            {(['raw', 'telnet', 'ssh'] as const).map((k) => (
              <label key={k} className="flex items-center gap-1 text-white/70">
                <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} />
                {k.toUpperCase()}
              </label>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-white/50">Saved session</label>
            <Input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="border-white/10 bg-black/30 text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-white/10 px-2 py-1 hover:bg-white/10"
              onClick={() => {
                const next = profiles.filter((p) => p.name !== sessionName);
                next.push({ name: sessionName, host, port, kind });
                saveProfiles(next);
              }}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded border border-white/10 px-2 py-1 hover:bg-white/10"
              onClick={() => {
                const p = profiles.find((x) => x.name === sessionName);
                if (p) {
                  setHost(p.host);
                  setPort(p.port);
                  setKind(p.kind);
                }
              }}
            >
              Load
            </button>
          </div>
        </div>
      );
    }
    return (
      <p className="text-xs text-white/50">
        Category <strong>{cat}</strong> — demo placeholder. Use Session to connect.
      </p>
    );
  }, [cat, host, port, kind, sessionName, profiles, saveProfiles]);

  if (phase === 'session') {
    return (
      <div className="absolute inset-0 flex flex-col bg-[#0c0c0c] font-mono text-xs text-green-400">
        <div className="flex h-8 shrink-0 items-center border-b border-white/10 px-2 text-white/50">
          <button
            type="button"
            className="rounded px-2 py-0.5 hover:bg-white/10"
            onClick={() => setPhase('config')}
          >
            Disconnect
          </button>
          <span className="ml-3 truncate">
            {kind}://{host}:{port}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-3">
          {lines.join('\n')}
          <span className="animate-pulse">_</span>
        </div>
        <footer className="h-6 shrink-0 border-t border-white/10 px-2 text-[10px] text-white/40">
          Mock session — no real SSH
        </footer>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-900/95 text-slate-100">
      <div className="flex min-h-0 flex-1">
        <aside className="w-48 shrink-0 overflow-y-auto border-r border-white/10 p-2 text-xs">
          {TREE.map((n) => (
            <button
              key={n.id}
              type="button"
              style={{ paddingLeft: 8 + n.depth * 12 }}
              onClick={() => setCat(n.id)}
              className={cn(
                'flex w-full rounded py-1 text-left hover:bg-white/10',
                cat === n.id ? 'bg-blue-500/20 text-blue-200' : 'text-white/70'
              )}
            >
              {n.label}
            </button>
          ))}
        </aside>
        <div className="min-h-0 flex-1 overflow-auto p-4">{panel}</div>
      </div>
      <div className="flex h-12 shrink-0 items-center justify-end gap-2 border-t border-white/10 px-3">
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500"
          onClick={openSession}
        >
          Open
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/15 px-4 py-1.5 text-sm hover:bg-white/5"
          onClick={() => setPhase('config')}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
