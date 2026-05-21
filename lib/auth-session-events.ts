/** Dispatched after login/logout so UI can re-check httpOnly session cookies. */
export const AUTH_SESSION_CHANGED_EVENT = 'durgas-auth-session-changed';

/** Focus the sign-in area inside the welcome overlay (desktop shell). */
export const FOCUS_WELCOME_AUTH_EVENT = 'durgas-focus-welcome-auth';

export function notifyAuthSessionChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

/** Open the welcome sign-in overlay (and focus the form). Safe when session cookies exist but profile is not loaded. */
export function notifyFocusWelcomeAuth(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(FOCUS_WELCOME_AUTH_EVENT));
}
