'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Circle, User } from 'lucide-react';

import { useOS } from '@/components/os-context';
import { useSystemHealth } from '@/hooks/use-system-health';
import { getBackendOrigin } from '@/lib/backend-url';
import { clearSession } from '@/lib/establish-session';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { cn } from '@/lib/utils';

function dotClass(
  status: 'online' | 'degraded' | 'offline' | 'up' | 'down' | 'unknown'
) {
  if (status === 'online' || status === 'up')
    return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]';
  if (status === 'degraded' || status === 'unknown')
    return 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]';
  return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
}

export function SystemStatusBridge() {
  const { setSystemStatus } = useOS();
  const { overall } = useSystemHealth();
  useEffect(() => {
    setSystemStatus(overall);
  }, [overall, setSystemStatus]);
  return null;
}

export function SystemStatusIcons({ compact = false }: { compact?: boolean }) {
  const { systemStatus, openApp } = useOS();
  const [wsHttp, setWsHttp] = useState<'up' | 'down' | 'unknown'>('unknown');
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = Boolean(readStoredAuthTokens()?.access);

  const pollWs = useCallback(async () => {
    try {
      const r = await fetch(`${getBackendOrigin()}/ws/status`);
      setWsHttp(r.ok ? 'up' : 'down');
    } catch {
      setWsHttp('down');
    }
  }, []);

  useEffect(() => {
    void pollWs();
    const id = window.setInterval(() => void pollWs(), 15_000);
    return () => window.clearInterval(id);
  }, [pollWs]);

  const apiDot = systemStatus === 'online' ? 'online' : systemStatus === 'degraded' ? 'degraded' : 'offline';

  return (
    <div className={cn('flex items-center gap-2', compact && 'gap-1.5')}>
      <span
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400"
        title="GraphQL / API health"
      >
        <Circle className={cn('h-2 w-2 shrink-0 rounded-full', dotClass(apiDot))} aria-hidden />
        {!compact && 'API'}
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400"
        title="WebSocket gateway HTTP status"
      >
        <Activity className={cn('h-2 w-2 shrink-0 rounded-full', dotClass(wsHttp))} aria-hidden />
        {!compact && 'WS'}
      </span>
      <div className="relative">
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/10 text-slate-200 outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary,#3b82f6)]"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          title="Account"
        >
          <User className="h-4 w-4" aria-hidden />
        </button>
        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[140] cursor-default bg-transparent"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div
              role="menu"
              className="absolute right-0 top-full z-[150] mt-1 min-w-[10rem] rounded-lg border border-white/15 bg-[var(--color-surface-panel,rgba(15,23,42,0.92))] py-1 text-sm shadow-xl backdrop-blur-md"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-slate-200 hover:bg-white/10"
                onClick={() => {
                  setMenuOpen(false);
                  openApp('settings');
                }}
              >
                Settings…
              </button>
              {signedIn ? (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-red-300 hover:bg-white/10"
                  onClick={async () => {
                    setMenuOpen(false);
                    await clearSession();
                    window.location.href = '/welcome';
                  }}
                >
                  Log out
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-slate-300 hover:bg-white/10"
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.href = '/welcome';
                  }}
                >
                  Sign in…
                </button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
