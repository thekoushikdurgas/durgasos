/**
 * Lightweight Apollo InMemoryCache persistence (no apollo3-cache-persist — peer is AC v3 only).
 */

import type { ApolloCache } from '@apollo/client';

const PERSIST_KEY = 'durgasos_apollo_cache';
const MAX_BYTES = 2 * 1024 * 1024;
const FLUSH_INTERVAL_MS = 2500;

function byteLength(s: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(s).length;
  }
  return s.length * 2;
}

export function restoreApolloCacheFromStorage(cache: ApolloCache): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw?.trim()) return;
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data && typeof data === 'object') {
      cache.restore(data);
    }
  } catch {
    /* corrupt or quota */
  }
}

export function clearApolloPersistStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PERSIST_KEY);
  } catch {
    /* ignore */
  }
}

function flushCache(cache: ApolloCache): void {
  if (typeof window === 'undefined') return;
  try {
    const data = cache.extract();
    const s = JSON.stringify(data);
    if (byteLength(s) <= MAX_BYTES) {
      window.localStorage.setItem(PERSIST_KEY, s);
    }
  } catch {
    /* quota */
  }
}

/** Periodically persist cache + flush on tab hide / unmount. */
export function subscribeApolloCachePersist(cache: ApolloCache): () => void {
  if (typeof window === 'undefined') return () => {};

  const onHide = () => flushCache(cache);
  const id = window.setInterval(() => flushCache(cache), FLUSH_INTERVAL_MS);
  window.addEventListener('pagehide', onHide);

  return () => {
    window.clearInterval(id);
    window.removeEventListener('pagehide', onHide);
    flushCache(cache);
  };
}
