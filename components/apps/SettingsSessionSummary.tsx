'use client';

import { useAuthSession } from '@/components/auth/AuthSessionContext';
import { useStoredAuthTokens } from '@/hooks/use-stored-auth-tokens';
import { canRunAuthedGraphqlQueries } from '@/lib/auth-graphql-ready';

function maskAccessToken(raw: string | undefined): string {
  const t = raw?.trim();
  if (!t) return '—';
  if (t.length <= 14) return '••••••••';
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

/** Device session row: httpOnly cookie probe + localStorage JWT pair (same source as Apollo Bearer). */
export function SettingsSessionSummary() {
  const { authenticated: sessionAuthed, ready, user } = useAuthSession();
  const tokens = useStoredAuthTokens();
  const graphqlReady = canRunAuthedGraphqlQueries();

  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
        <dt className="text-white/45">Session ready</dt>
        <dd className="font-medium text-white/85">{ready ? 'Yes' : 'No'}</dd>
      </div>
      <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
        <dt className="text-white/45">Cookie session</dt>
        <dd className="font-medium text-white/85">{sessionAuthed ? 'Yes' : 'No'}</dd>
      </div>
      <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
        <dt className="text-white/45">GraphQL auth</dt>
        <dd className="font-medium text-white/85">{graphqlReady ? 'Yes' : 'No'}</dd>
      </div>
      <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 sm:col-span-2">
        <dt className="text-white/45">Stored user</dt>
        <dd className="truncate font-mono text-xs text-white/80">
          {user?.email?.trim() || user?.id?.slice(0, 12) || '—'}
        </dd>
      </div>
      <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 sm:col-span-2">
        <dt className="text-white/45">Access token (masked)</dt>
        <dd className="font-mono text-xs text-white/80">{maskAccessToken(tokens?.access)}</dd>
      </div>
      <div className="flex justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
        <dt className="text-white/45">Refresh token stored</dt>
        <dd className="font-medium text-white/85">{tokens?.refresh ? 'Yes' : 'No'}</dd>
      </div>
    </dl>
  );
}
