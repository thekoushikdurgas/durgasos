/**
 * Types and pure helpers for the Durgas Search “API builder” UI
 * (saved requests, URL params/variables, headers, response projection).
 */

export type SearchHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export const SEARCH_SAVED_APIS_STORAGE_KEY = 'durgas-search-saved-apis';
export const SEARCH_SAVED_APIS_VERSION = 1 as const;

export type SearchKvEnabledRow = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type SearchUrlVariableRow = {
  id: string;
  name: string;
  value: string;
};

export type SearchSavedApiDefinition = {
  version: typeof SEARCH_SAVED_APIS_VERSION;
  name: string;
  method: SearchHttpMethod;
  headers: SearchKvEnabledRow[];
  body: string;
  url: {
    raw: string;
    params: SearchKvEnabledRow[];
    variables: SearchUrlVariableRow[];
  };
  /** Top-level JSON keys to show in the response panel (empty = show full). */
  outputKeys: string[];
};

export function newRowId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyEnabledRow(): SearchKvEnabledRow {
  return { id: newRowId(), key: '', value: '', enabled: true };
}

export function emptyVariableRow(): SearchUrlVariableRow {
  return { id: newRowId(), name: '', value: '' };
}

export function defaultSavedApi(
  partial?: Partial<SearchSavedApiDefinition>
): SearchSavedApiDefinition {
  return {
    version: SEARCH_SAVED_APIS_VERSION,
    name: partial?.name ?? 'Untitled request',
    method: partial?.method ?? 'GET',
    headers: partial?.headers ?? [],
    body: partial?.body ?? '',
    url: {
      raw: partial?.url?.raw ?? '/_cluster/health',
      params: partial?.url?.params ?? [],
      variables: partial?.url?.variables ?? [],
    },
    outputKeys: partial?.outputKeys ?? [],
  };
}

/** Split `/path?a=1` into pathname and query string (without `?`). */
export function splitSearchPath(raw: string): {
  pathname: string;
  query: string;
} {
  const normalized = raw.trim().startsWith('/') ? raw.trim() : `/${raw.trim()}`;
  const q = normalized.indexOf('?');
  if (q === -1) return { pathname: normalized, query: '' };
  return {
    pathname: normalized.slice(0, q),
    query: normalized.slice(q + 1),
  };
}

/**
 * Merge enabled param rows into the path’s query string.
 * Params from the table override keys already present in `raw`’s query.
 */
export function mergeUrlParams(rawPath: string, params: SearchKvEnabledRow[]): string {
  const { pathname, query } = splitSearchPath(rawPath);
  const sp = new URLSearchParams(query);
  for (const row of params) {
    if (!row.enabled) continue;
    const k = row.key.trim();
    if (!k) continue;
    sp.set(k, row.value);
  }
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Replace `{{varName}}` using the variables table (trimmed names).
 * Returns an error if any `{{...}}` remains.
 */
export function substituteUrlVariables(
  path: string,
  variables: SearchUrlVariableRow[]
): { path: string; error?: string } {
  let out = path.startsWith('/') ? path : `/${path}`;
  const map = new Map<string, string>();
  for (const row of variables) {
    const n = row.name.trim();
    if (n) map.set(n, row.value);
  }
  out = out.replace(/\{\{([^}]+)\}\}/g, (_, inner: string) => {
    const key = String(inner).trim();
    if (map.has(key)) return map.get(key) ?? '';
    return `{{${inner}}}`;
  });
  const left = [...out.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1].trim());
  if (left.length) {
    return {
      path: out,
      error: `Unresolved URL variables: ${left.join(', ')}`,
    };
  }
  return { path: out };
}

export function buildHeadersFromRows(rows: SearchKvEnabledRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (!row.enabled) continue;
    const k = row.key.trim();
    if (!k) continue;
    out[k] = row.value;
  }
  return out;
}

/** Build final path: variables first, then merge param table. */
export function buildSearchRequestPath(
  raw: string,
  variables: SearchUrlVariableRow[],
  params: SearchKvEnabledRow[]
): { path: string; error?: string } {
  const sub = substituteUrlVariables(raw.trim() || '/', variables);
  if (sub.error) return sub;
  return { path: mergeUrlParams(sub.path, params) };
}

export function discoverTopLevelKeys(obj: unknown): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [];
  return Object.keys(obj as Record<string, unknown>).sort((a, b) => a.localeCompare(b));
}

export function pickTopLevelKeys(obj: unknown, keys: string[]): unknown {
  if (keys.length === 0) return obj;
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const o = obj as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
  }
  return out;
}

export function parseSavedApisJson(raw: string | null): SearchSavedApiDefinition[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => migrateSavedApi(item))
      .filter((x): x is SearchSavedApiDefinition => x !== null);
  } catch {
    return [];
  }
}

function migrateSavedApi(item: unknown): SearchSavedApiDefinition | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name : 'Untitled';
  const rawMethod = o.method;
  const method: SearchHttpMethod =
    rawMethod === 'GET' || rawMethod === 'POST' || rawMethod === 'PUT' || rawMethod === 'DELETE'
      ? rawMethod
      : 'GET';
  const body = typeof o.body === 'string' ? o.body : '';
  const headers = normalizeKvRows(o.headers);
  const urlRaw =
    o.url && typeof o.url === 'object' && typeof (o.url as { raw?: unknown }).raw === 'string'
      ? (o.url as { raw: string }).raw
      : '/_cluster/health';
  const urlObj = o.url && typeof o.url === 'object' ? (o.url as Record<string, unknown>) : {};
  const params = normalizeKvRows(urlObj.params);
  const variables = normalizeVarRows(urlObj.variables);
  const outputKeys = Array.isArray(o.outputKeys)
    ? o.outputKeys.filter((x): x is string => typeof x === 'string')
    : [];
  return defaultSavedApi({
    name,
    method,
    body,
    headers,
    url: { raw: urlRaw, params, variables },
    outputKeys,
  });
}

function normalizeKvRows(v: unknown): SearchKvEnabledRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'string' ? r.id : newRowId();
      const key = typeof r.key === 'string' ? r.key : '';
      const value = typeof r.value === 'string' ? r.value : '';
      const enabled = r.enabled !== false;
      return { id, key, value, enabled } satisfies SearchKvEnabledRow;
    })
    .filter((x): x is SearchKvEnabledRow => x !== null);
}

function normalizeVarRows(v: unknown): SearchUrlVariableRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'string' ? r.id : newRowId();
      const name = typeof r.name === 'string' ? r.name : '';
      const value = typeof r.value === 'string' ? r.value : '';
      return { id, name, value } satisfies SearchUrlVariableRow;
    })
    .filter((x): x is SearchUrlVariableRow => x !== null);
}

/** Validate JSON when body looks like JSON (skip NDJSON bulk). */
export function validateSearchJsonBody(method: SearchHttpMethod, path: string, body: string): void {
  if (method === 'GET') return;
  const t = body.trim();
  if (!t) return;
  const { pathname } = splitSearchPath(path);
  if (pathname.endsWith('/_bulk') || pathname === '/_bulk') return;
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      JSON.parse(t);
    } catch {
      throw new Error('Request body is not valid JSON.');
    }
  }
}
