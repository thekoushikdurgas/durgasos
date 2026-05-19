import { CACHE_TTL_MS, localCache } from '@/lib/local-cache';

const STORAGE_KEY = 'durgasos_chat_thread_titles';

function readAll(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === 'string' && typeof v === 'string' && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
  try {
    localCache.set('chat_titles', map, CACHE_TTL_MS.chat_titles);
  } catch {
    /* ignore */
  }
}

export function getThreadTitle(conversationId: string): string | undefined {
  return readAll()[conversationId];
}

export function setThreadTitle(conversationId: string, title: string) {
  const t = title.trim();
  if (!t) return;
  const all = readAll();
  all[conversationId] = t.length > 80 ? `${t.slice(0, 77)}...` : t;
  writeAll(all);
}

export function removeThreadTitle(conversationId: string) {
  const all = readAll();
  if (!(conversationId in all)) return;
  delete all[conversationId];
  writeAll(all);
}
