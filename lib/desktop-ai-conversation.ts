const STORAGE_KEY = 'durgasos_desktop_ai_conv';

export function getDesktopAiConversationId(): string {
  if (typeof window === 'undefined') {
    return 'ssr-placeholder';
  }
  try {
    let id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
