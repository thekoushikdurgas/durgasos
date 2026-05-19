import { CACHE_TTL_MS, localCache } from '@/lib/local-cache';

const STORAGE_KEY = 'durgasos_desktop_ai_conv';

export function getDesktopAiConversationId(): string {
  if (typeof window === 'undefined') {
    return 'ssr-placeholder';
  }
  try {
    let id: string | null = sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = localCache.get<string>('desktop_ai_conv');
    }
    if (!id) {
      id = crypto.randomUUID();
    }
    sessionStorage.setItem(STORAGE_KEY, id);
    localCache.set('desktop_ai_conv', id, CACHE_TTL_MS.desktop_background);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
