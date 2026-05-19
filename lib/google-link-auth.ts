import type { GoogleAuthProvider } from 'firebase/auth';

/** OAuth scopes requested when linking a Google account (Photos + Workspace read-only). */
export const GOOGLE_LINK_SCOPES = [
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/tasks',
] as const;

/** Space-separated scopes string for persistence on the backend. */
export const GOOGLE_SCOPES_GRANTED_STRING = GOOGLE_LINK_SCOPES.join(' ');

export function configureGoogleLinkProvider(provider: GoogleAuthProvider): void {
  for (const scope of GOOGLE_LINK_SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({ prompt: 'consent' });
}
