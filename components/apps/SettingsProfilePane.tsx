'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Copy, RefreshCw } from 'lucide-react';

import { ME } from '@/lib/graphql-modules';
import { notifyFocusWelcomeAuth } from '@/lib/auth-session-events';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { cn } from '@/lib/utils';

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value);
  }
}

function maskAccessToken(raw: string | undefined): string {
  const t = raw?.trim();
  if (!t) return '—';
  if (t.length <= 14) return '••••••••';
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

function JsonPre({ label, value }: { label: string; value: unknown }) {
  const text = formatJson(value);
  const [open, setOpen] = useState(text.length < 400);
  return (
    <div className="rounded-xl border border-white/10 bg-black/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-white/50 hover:bg-white/5"
      >
        {label}
        <span className="text-[10px] normal-case text-white/35">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open ? (
        <pre className="max-h-64 overflow-auto border-t border-white/10 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
          {text}
        </pre>
      ) : null}
    </div>
  );
}

export function SettingsProfilePane() {
  const meQ = useQuery(ME, { fetchPolicy: 'cache-and-network' });
  const me = meQ.data?.me;
  const authed = Boolean(me?.id);
  const [copied, setCopied] = useState(false);

  const tokens = typeof window !== 'undefined' ? readStoredAuthTokens() : null;

  const copyId = useCallback(async () => {
    if (!me?.id) return;
    try {
      await navigator.clipboard.writeText(me.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [me]);

  if (meQ.loading && !me) {
    return (
      <div className="frost-glass-surface rounded-2xl border border-white/10 p-8 text-sm text-white/50">
        Loading profile…
      </div>
    );
  }

  if (meQ.error) {
    return (
      <div className="space-y-4">
        <div className="frost-glass-surface rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-sm text-red-200">
          {meQ.error.message}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/15"
          onClick={() => void meQ.refetch()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      </div>
    );
  }

  if (!authed || !me) {
    return (
      <div className="frost-glass-surface rounded-2xl border border-white/10 p-6 text-sm text-white/60">
        <p className="mb-3">
          Sign in using the desktop sign-in overlay to view your account and profile details here.
        </p>
        <button
          type="button"
          onClick={() => notifyFocusWelcomeAuth()}
          className="inline-block rounded-lg border border-blue-500/40 bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-600/30"
        >
          Open sign in
        </button>
      </div>
    );
  }

  const p = me.profile;
  const displayName = me.email?.trim() || `Account ${me.id.slice(0, 8)}…`;
  const initial = (me.email?.trim()?.[0] ?? me.id[0] ?? '?').toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/50">
          Account and profile data from the server. Session details are summarized only (no full
          tokens).
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/15"
          onClick={() => void meQ.refetch()}
        >
          <RefreshCw className={cn('h-4 w-4', meQ.loading && 'animate-spin')} aria-hidden />
          Refresh
        </button>
      </div>

      <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-slate-800 text-2xl font-semibold text-white/70">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white/90">{displayName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded bg-black/40 px-2 py-1 font-mono text-xs text-cyan-200/90">
                {me.id}
              </code>
              <button
                type="button"
                onClick={() => void copyId()}
                className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/15"
              >
                <Copy className="h-3 w-3" aria-hidden />
                {copied ? 'Copied' : 'Copy id'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
        <h3 className="mb-3 text-base font-semibold text-white/90">Account</h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <dt className="text-white/45">Active</dt>
            <dd className="font-medium text-white/85">{me.isActive ? 'Yes' : 'No'}</dd>
          </div>
          <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <dt className="text-white/45">Email verified</dt>
            <dd className="font-medium text-white/85">{me.isVerified ? 'Yes' : 'No'}</dd>
          </div>
          <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 sm:col-span-2">
            <dt className="text-white/45">Created</dt>
            <dd className="font-mono text-xs text-white/80">{me.createdAt ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 sm:col-span-2">
            <dt className="text-white/45">Updated</dt>
            <dd className="font-mono text-xs text-white/80">{me.updatedAt ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
        <h3 className="mb-3 text-base font-semibold text-white/90">Profile</h3>
        {!p ? (
          <p className="text-sm text-white/45">No extended profile row yet.</p>
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
              <dt className="text-xs text-white/45">Username</dt>
              <dd className="text-white/85">{p.username ?? '—'}</dd>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
              <dt className="text-xs text-white/45">Bio</dt>
              <dd className="whitespace-pre-wrap text-white/85">{p.bio ?? '—'}</dd>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
              <dt className="text-xs text-white/45">Avatar URL</dt>
              <dd className="break-all text-white/85">
                {p.avatarUrl ? (
                  <a
                    href={p.avatarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-300 underline hover:text-blue-200"
                  >
                    {p.avatarUrl}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <JsonPre label="Profile preferences (JSON)" value={p.preferences} />
          </dl>
        )}
      </section>

      <section className="frost-glass-surface rounded-2xl border border-white/10 p-6 space-y-3">
        <h3 className="text-base font-semibold text-white/90">Metadata</h3>
        <JsonPre label="User metadata" value={me.userMetadata} />
        <JsonPre label="App metadata (from session)" value={me.appMetadata} />
      </section>

      <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
        <h3 className="mb-2 text-base font-semibold text-white/90">Session (this device)</h3>
        <p className="mb-4 text-xs text-white/45">
          Stored tokens power GraphQL and the AI gateway. For connection issues, see{' '}
          <strong className="text-white/60">Backend &amp; session</strong> in Settings.
        </p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 sm:col-span-2">
            <dt className="text-white/45">Access token (masked)</dt>
            <dd className="font-mono text-xs text-white/80">{maskAccessToken(tokens?.access)}</dd>
          </div>
          <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <dt className="text-white/45">Refresh token stored</dt>
            <dd className="font-medium text-white/85">{tokens?.refresh ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
