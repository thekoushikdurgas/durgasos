'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuthSession } from '@/components/auth/AuthSessionContext';
import { useStoredAuthTokens } from '@/hooks/use-stored-auth-tokens';
import { canRunAuthedGraphqlQueries } from '@/lib/auth-graphql-ready';
import { AUTH_SESSION_CHANGED_EVENT } from '@/lib/auth-session-events';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { fetchBackendGraphql } from '@/lib/backend-http';
import { cn } from '@/lib/utils';

const LOAD_QUERY = `query AiProviderSettings {
  aiProviderSettings
}`;

const SAVE_MUTATION = `mutation UpdateAiProviderSettings($updates: JSON!) {
  updateAiProviderSettings(updates: $updates)
}`;

type SecretMask = { set: boolean; preview: string | null };
type FieldKind = 'secret' | 'url' | 'string' | 'enum';

type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  enum_options?: string[] | null;
};

type SectionDef = { id: string; title: string; fields: FieldDef[] };

type LoadPayload = {
  sections: SectionDef[];
  values: Record<string, string | SecretMask | null>;
  warnings?: string[];
};

function isSecretMask(v: unknown): v is SecretMask {
  return (
    typeof v === 'object' && v !== null && 'set' in v && typeof (v as SecretMask).set === 'boolean'
  );
}

function draftFromValue(kind: FieldKind, val: unknown): string {
  if (kind === 'secret') return '';
  if (val == null) return '';
  if (isSecretMask(val)) return '';
  return String(val);
}

function snapshotFromValue(kind: FieldKind, val: unknown): string {
  if (kind === 'secret') return '';
  if (val == null) return '';
  if (isSecretMask(val)) return '';
  return String(val);
}

export function SettingsAiProvidersPane() {
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [values, setValues] = useState<Record<string, string | SecretMask | null>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [initialSnapshot, setInitialSnapshot] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [operatorApiKey, setOperatorApiKey] = useState('');
  const { ready: authReady } = useAuthSession();
  const storedTokens = useStoredAuthTokens();
  const graphqlReady = canRunAuthedGraphqlQueries();
  const lastAuthLoadKey = useRef<string | null>(null);

  const authHeaders = useCallback((): HeadersInit => {
    const h: Record<string, string> = {};
    const tok = readStoredAuthTokens();
    if (tok?.access) h.Authorization = `Bearer ${tok.access}`;
    const k = operatorApiKey.trim();
    if (k) h['X-API-Key'] = k;
    return h;
  }, [operatorApiKey]);

  const load = useCallback(
    async (opts?: { quiet?: boolean }) => {
      const quiet = opts?.quiet ?? false;
      const hasBearer = Boolean(readStoredAuthTokens()?.access?.trim());
      const hasApiKey = Boolean(operatorApiKey.trim());
      // #region agent log
      fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '777e35' },
        body: JSON.stringify({
          sessionId: '777e35',
          hypothesisId: 'H1',
          location: 'SettingsAiProvidersPane.tsx:load',
          message: 'load start',
          data: { quiet, hasBearer, hasApiKey, authReady },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!quiet) {
        setLoadState('loading');
        setLoadError(null);
      }
      try {
        const res = await fetchBackendGraphql(
          { query: LOAD_QUERY },
          { headers: authHeaders() as HeadersInit }
        );
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || res.statusText);
        }
        const json = (await res.json()) as {
          data?: { aiProviderSettings?: LoadPayload };
          errors?: unknown;
        };
        if (Array.isArray(json.errors) && json.errors.length > 0) {
          throw new Error('GraphQL error loading settings');
        }
        const data = json.data?.aiProviderSettings;
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid settings payload');
        }
        setSections(data.sections ?? []);
        setValues(data.values ?? {});
        setWarnings(Array.isArray(data.warnings) ? data.warnings : []);

        const d: Record<string, string> = {};
        const snap: Record<string, string> = {};
        for (const sec of data.sections ?? []) {
          for (const f of sec.fields) {
            const v = data.values?.[f.key];
            d[f.key] = draftFromValue(f.kind, v);
            snap[f.key] = snapshotFromValue(f.kind, v);
          }
        }
        setDraft(d);
        setInitialSnapshot(snap);
        if (!quiet) setLoadState('ok');
        // #region agent log
        fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '777e35' },
          body: JSON.stringify({
            sessionId: '777e35',
            hypothesisId: 'H2',
            location: 'SettingsAiProvidersPane.tsx:load',
            message: 'load ok',
            data: {
              sectionCount: (data.sections ?? []).length,
              warningCount: Array.isArray(data.warnings) ? data.warnings.length : 0,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '777e35' },
          body: JSON.stringify({
            sessionId: '777e35',
            hypothesisId: 'H3',
            location: 'SettingsAiProvidersPane.tsx:load',
            message: 'load error',
            data: { quiet, err: e instanceof Error ? e.message : 'unknown' },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        if (!quiet) {
          setLoadState('error');
          setLoadError(e instanceof Error ? e.message : 'Failed to load');
        } else {
          setSaveState('error');
          setSaveMessage(e instanceof Error ? e.message : 'Reload after save failed');
        }
      }
    },
    [authHeaders, authReady, operatorApiKey]
  );

  const canAuth = useMemo(
    () => Boolean(storedTokens?.access?.trim() || operatorApiKey.trim()),
    [storedTokens?.access, operatorApiKey]
  );

  const authRequiredMessage =
    authReady && !canAuth
      ? 'Sign in (JWT in localStorage) or paste the server API key above.'
      : null;

  const displayLoadState = authRequiredMessage ? 'error' : loadState;
  const displayLoadError = authRequiredMessage ?? loadError;

  const authLoadKey = `${authReady}:${canAuth}:${storedTokens?.access?.length ?? 0}:${operatorApiKey.trim().length}`;

  useEffect(() => {
    if (!authReady || !canAuth) return;
    if (lastAuthLoadKey.current === authLoadKey && loadState === 'ok') return;
    lastAuthLoadKey.current = authLoadKey;
    void load();
  }, [authReady, authLoadKey, canAuth, load, loadState]);

  useEffect(() => {
    if (!authReady || !canAuth) return;
    const onAuth = () => {
      lastAuthLoadKey.current = null;
      void load();
    };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, onAuth);
  }, [authReady, canAuth, load]);

  const save = useCallback(async () => {
    setSaveState('saving');
    setSaveMessage(null);
    const updates: Record<string, string> = {};
    for (const sec of sections) {
      for (const f of sec.fields) {
        const cur = draft[f.key] ?? '';
        if (f.kind === 'secret') {
          if (cur.trim()) updates[f.key] = cur.trim();
        } else if (cur !== (initialSnapshot[f.key] ?? '')) {
          updates[f.key] = cur;
        }
      }
    }
    if (Object.keys(updates).length === 0) {
      setSaveState('idle');
      setSaveMessage('No changes to save.');
      return;
    }
    try {
      const res = await fetchBackendGraphql(
        {
          query: SAVE_MUTATION,
          variables: { updates },
        },
        { headers: authHeaders() as HeadersInit }
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
      const json = (await res.json()) as {
        data?: { updateAiProviderSettings?: { applied?: number; ok?: boolean } };
        errors?: unknown;
      };
      if (Array.isArray(json.errors) && json.errors.length > 0) {
        throw new Error('GraphQL error saving settings');
      }
      const body = json.data?.updateAiProviderSettings as { applied?: number } | undefined;
      await load({ quiet: true });
      setSaveState('ok');
      setSaveMessage(`Saved (${body?.applied ?? Object.keys(updates).length} field(s)).`);
    } catch (e) {
      setSaveState('error');
      setSaveMessage(e instanceof Error ? e.message : 'Save failed');
    }
  }, [authHeaders, draft, initialSnapshot, load, sections]);

  const inputCls =
    'mt-1 w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/35 focus:border-cyan-500/50';

  return (
    <div className="space-y-6">
      <section className="frost-glass-surface mb-0 border border-white/10 p-6">
        <h2 className="mb-2 text-lg font-semibold text-white/90">Authentication</h2>
        <p className="mb-3 text-sm text-white/50">
          Use your session (after sign-in) or paste the server{' '}
          <code className="rounded bg-black/40 px-1">API_KEY</code> below. Keys are sent only with
          requests from this screen and are not stored in{' '}
          <code className="rounded bg-black/40 px-1">NEXT_PUBLIC_*</code>.
        </p>
        <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <dt className="text-white/45">GraphQL auth (JWT)</dt>
            <dd className="font-medium text-white/85">{graphqlReady ? 'Ready' : 'Missing'}</dd>
          </div>
          <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <dt className="text-white/45">Operator API key</dt>
            <dd className="font-medium text-white/85">
              {operatorApiKey.trim() ? 'Set (this screen)' : '—'}
            </dd>
          </div>
        </dl>
        <label className="block text-sm text-white/70">
          Optional server API key
          <input
            type="password"
            autoComplete="off"
            value={operatorApiKey}
            onChange={(e) => setOperatorApiKey(e.target.value)}
            placeholder="Same value as API_KEY on the backend"
            className={inputCls}
          />
        </label>
      </section>

      {warnings.length > 0 ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-950/25 p-4 text-sm text-amber-100/90">
          <ul className="list-inside list-disc space-y-1">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {displayLoadState === 'loading' ? (
        <p className="text-sm text-white/50">Loading provider configuration…</p>
      ) : null}
      {displayLoadState === 'error' ? (
        <p className="text-sm text-red-300">
          {displayLoadError}
          {!canAuth ? ' Sign in or set the server API key above, then use Refresh.' : ''}
        </p>
      ) : null}

      {displayLoadState === 'ok' ? (
        <>
          {sections.map((sec) => (
            <section key={sec.id} className="frost-glass-surface mb-0 border border-white/10 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white/90">{sec.title}</h2>
              <div className="space-y-4">
                {sec.fields.map((f) => {
                  const v = values[f.key];
                  const secretHint = f.kind === 'secret' && isSecretMask(v) && v.set && (
                    <p className="text-xs text-white/45">
                      Configured{v.preview ? ` (${v.preview})` : ''}. Enter a new value to replace.
                    </p>
                  );
                  return (
                    <div key={f.key}>
                      <label className="block text-sm font-medium text-white/75">{f.label}</label>
                      {secretHint}
                      {f.kind === 'enum' && f.enum_options?.length ? (
                        <select
                          className={inputCls}
                          aria-label={f.label}
                          title={f.label}
                          value={draft[f.key] ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        >
                          {f.enum_options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={f.kind === 'secret' ? 'password' : 'text'}
                          autoComplete="off"
                          className={inputCls}
                          placeholder={f.kind === 'secret' ? 'Leave blank to keep current' : ''}
                          value={draft[f.key] ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="flex flex-nowrap items-end justify-end gap-3 px-[15px] py-[10px]">
            <button
              type="button"
              className="rounded-lg border border-cyan-500/40 bg-cyan-600/25 px-4 py-2 text-sm font-medium text-cyan-50 hover:bg-cyan-600/35 disabled:opacity-40"
              disabled={saveState === 'saving' || !canAuth}
              onClick={() => void save()}
            >
              {saveState === 'saving' ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/15"
              onClick={() => {
                lastAuthLoadKey.current = null;
                void load();
              }}
            >
              Refresh
            </button>
            {saveMessage ? (
              <span
                className={cn(
                  'text-sm',
                  saveState === 'error' ? 'text-red-300' : 'text-emerald-300/90'
                )}
              >
                {saveMessage}
              </span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
