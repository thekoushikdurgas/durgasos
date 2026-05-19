'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  const attemptedLoad = useRef(false);

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
      } catch (e) {
        if (!quiet) {
          setLoadState('error');
          setLoadError(e instanceof Error ? e.message : 'Failed to load');
        } else {
          setSaveState('error');
          setSaveMessage(e instanceof Error ? e.message : 'Reload after save failed');
        }
      }
    },
    [authHeaders]
  );

  useEffect(() => {
    if (attemptedLoad.current) return;
    attemptedLoad.current = true;
    void load();
  }, [load]);

  const canAuth = useMemo(() => {
    const tok = readStoredAuthTokens();
    return Boolean(tok?.access || operatorApiKey.trim());
  }, [operatorApiKey]);

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
    <div className="max-w-3xl space-y-6">
      <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
        <h2 className="mb-2 text-lg font-semibold text-white/90">Authentication</h2>
        <p className="mb-3 text-sm text-white/50">
          Use your session (after sign-in) or paste the server{' '}
          <code className="rounded bg-black/40 px-1">API_KEY</code> below. Keys are sent only with
          requests from this screen and are not stored in{' '}
          <code className="rounded bg-black/40 px-1">NEXT_PUBLIC_*</code>.
        </p>
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

      {loadState === 'loading' ? (
        <p className="text-sm text-white/50">Loading provider configuration…</p>
      ) : null}
      {loadState === 'error' ? (
        <p className="text-sm text-red-300">
          {loadError}
          {!canAuth ? ' Sign in or set the server API key above, then use Refresh.' : ''}
        </p>
      ) : null}

      {loadState === 'ok' ? (
        <>
          {sections.map((sec) => (
            <section
              key={sec.id}
              className="frost-glass-surface rounded-2xl border border-white/10 p-6"
            >
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

          <div className="flex flex-wrap items-center gap-3">
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
                attemptedLoad.current = false;
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
