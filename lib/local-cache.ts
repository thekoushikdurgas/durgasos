/**
 * TTL cache on localStorage (L1) — Redis-like API for DurgasOS.
 * Uses a small LRU index to avoid unbounded storage growth.
 */

const CACHE_VERSION = '1';
const ENTRY_PREFIX = 'durgasos_cache::';
const META_KEY = 'durgasos_cache::__meta';

type Meta = { order: string[]; max: number };

type StoredEntry<T> = {
  v: string;
  exp: number;
  /** When the entry was written (ms); used for stale-while-revalidate. */
  wroteAt: number;
  data: T;
};

const DEFAULT_MAX_KEYS = 200;

function readMeta(): Meta {
  if (typeof window === 'undefined') return { order: [], max: DEFAULT_MAX_KEYS };
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return { order: [], max: DEFAULT_MAX_KEYS };
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== 'object') return { order: [], max: DEFAULT_MAX_KEYS };
    const order = Array.isArray((p as { order?: unknown }).order)
      ? ((p as { order: unknown[] }).order as string[]).map(String)
      : [];
    const max = Number((p as { max?: unknown }).max);
    return { order, max: Number.isFinite(max) && max > 0 ? Math.min(max, 200) : DEFAULT_MAX_KEYS };
  } catch {
    return { order: [], max: DEFAULT_MAX_KEYS };
  }
}

function writeMeta(meta: Meta) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* quota */
  }
}

function entryStorageKey(logicalKey: string): string {
  return `${ENTRY_PREFIX}${logicalKey}`;
}

function touchOrder(logicalKey: string) {
  const meta = readMeta();
  const next = meta.order.filter((k) => k !== logicalKey);
  next.unshift(logicalKey);
  while (next.length > meta.max) {
    const evict = next.pop();
    if (evict) {
      try {
        window.localStorage.removeItem(entryStorageKey(evict));
      } catch {
        /* ignore */
      }
    }
  }
  writeMeta({ ...meta, order: next });
}

function removeFromOrder(logicalKey: string) {
  const meta = readMeta();
  const next = meta.order.filter((k) => k !== logicalKey);
  writeMeta({ ...meta, order: next });
}

const pending = new Map<string, Promise<unknown>>();

export const CACHE_TTL_MS = {
  health: 30_000,
  installed_apps: 300_000,
  widget_layouts: 120_000,
  chat_conversations: 60_000,
  chat_titles: 600_000,
  rag_documents: 300_000,
  storage_buckets: 300_000,
  ai_providers: 600_000,
  metrics_summary: 120_000,
  weather: 900_000,
  desktop_background: 600_000,
  graphql_proxy: 0,
  me_query: 120_000,
  gmail_messages: 60_000,
  calendar_events: 120_000,
  contacts: 300_000,
  github_repos: 300_000,
  drive_files: 120_000,
  google_photos: 180_000,
  todo_workspaces: 300_000,
  linked_accounts: 300_000,
} as const;

export class LocalCache {
  set<T>(logicalKey: string, value: T, ttlMs: number): void {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    const entry: StoredEntry<T> = {
      v: CACHE_VERSION,
      exp: ttlMs > 0 ? now + ttlMs : now + 365 * 24 * 60 * 60 * 1000,
      wroteAt: now,
      data: value,
    };
    try {
      window.localStorage.setItem(entryStorageKey(logicalKey), JSON.stringify(entry));
      touchOrder(logicalKey);
    } catch {
      /* quota — try evict one */
      const meta = readMeta();
      const victim = meta.order.pop();
      if (victim) {
        try {
          window.localStorage.removeItem(entryStorageKey(victim));
        } catch {
          /* ignore */
        }
      }
      writeMeta({ ...meta, order: meta.order });
      try {
        window.localStorage.setItem(entryStorageKey(logicalKey), JSON.stringify(entry));
        touchOrder(logicalKey);
      } catch {
        /* still failing */
      }
    }
  }

  get<T>(logicalKey: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(entryStorageKey(logicalKey));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredEntry<T>;
      if (!parsed || typeof parsed !== 'object' || parsed.v !== CACHE_VERSION) return null;
      if (typeof parsed.exp !== 'number' || Date.now() > parsed.exp) {
        this.invalidate(logicalKey);
        return null;
      }
      touchOrder(logicalKey);
      return parsed.data as T;
    } catch {
      return null;
    }
  }

  /**
   * Read cache entry without deleting it when past `exp` (for stale-while-revalidate).
   */
  peekEntry<T>(logicalKey: string): StoredEntry<T> | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(entryStorageKey(logicalKey));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredEntry<T>;
      if (!parsed || typeof parsed !== 'object' || parsed.v !== CACHE_VERSION) return null;
      if (typeof parsed.exp !== 'number') return null;
      const wroteAt = typeof parsed.wroteAt === 'number' ? parsed.wroteAt : 0;
      if (Date.now() <= parsed.exp) {
        touchOrder(logicalKey);
      }
      return { ...parsed, wroteAt, data: parsed.data as T };
    } catch {
      return null;
    }
  }

  invalidate(logicalKey: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(entryStorageKey(logicalKey));
    } catch {
      /* ignore */
    }
    removeFromOrder(logicalKey);
  }

  invalidatePattern(pattern: string): void {
    if (typeof window === 'undefined') return;
    const isGlob = pattern.endsWith('*');
    const prefix = isGlob ? pattern.slice(0, -1) : pattern;
    if (isGlob && prefix === '') return;

    const meta = readMeta();
    const nextOrder: string[] = [];
    for (const k of meta.order) {
      const match = isGlob ? k.startsWith(prefix) : k === prefix;
      if (match) {
        try {
          window.localStorage.removeItem(entryStorageKey(k));
        } catch {
          /* ignore */
        }
      } else {
        nextOrder.push(k);
      }
    }
    writeMeta({ ...meta, order: nextOrder });

    if (!isGlob) return;

    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key?.startsWith(ENTRY_PREFIX)) keys.push(key);
      }
      for (const key of keys) {
        const logical = key.slice(ENTRY_PREFIX.length);
        if (logical.startsWith(prefix)) {
          window.localStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore */
    }
  }

  flush(): void {
    if (typeof window === 'undefined') return;
    const meta = readMeta();
    for (const k of meta.order) {
      try {
        window.localStorage.removeItem(entryStorageKey(k));
      } catch {
        /* ignore */
      }
    }
    writeMeta({ order: [], max: meta.max });
  }

  async getOrFetch<T>(logicalKey: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T> {
    if (ttlMs > 0) {
      const hit = this.get<T>(logicalKey);
      if (hit !== null) return hit;
    }

    const existing = pending.get(logicalKey) as Promise<T> | undefined;
    if (existing) return existing;

    const p = (async () => {
      try {
        const data = await fetcher();
        if (ttlMs > 0) {
          this.set(logicalKey, data, ttlMs);
        }
        return data;
      } finally {
        pending.delete(logicalKey);
      }
    })();

    pending.set(logicalKey, p);
    return p;
  }
}

export type PrefetchEntry<T> = { key: string; ttlMs: number; fetcher: () => Promise<T> };

/** Warm L1 cache in parallel (best-effort; errors swallowed per entry). */
export async function prefetchCriticalData<T>(entries: PrefetchEntry<T>[]): Promise<void> {
  await Promise.all(
    entries.map(async ({ key, ttlMs, fetcher }) => {
      try {
        await localCache.getOrFetch(key, fetcher, ttlMs);
      } catch {
        /* offline / auth */
      }
    })
  );
}

export const localCache = new LocalCache();
