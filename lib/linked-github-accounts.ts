export type LinkedGithubAccount = {
  id: string;
  githubUserId: string;
  login: string;
  email: string;
  displayName?: string | null;
  photoUrl?: string | null;
  tokenExpiresAt?: number | null;
  createdAt?: string | null;
};

export function parseLinkedGithubAccounts(raw: unknown): LinkedGithubAccount[] {
  if (!Array.isArray(raw)) return [];
  const out: LinkedGithubAccount[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id : '';
    const githubUserId = typeof r.githubUserId === 'string' ? r.githubUserId : '';
    if (!id || !githubUserId) continue;
    out.push({
      id,
      githubUserId,
      login: typeof r.login === 'string' ? r.login : '',
      email: typeof r.email === 'string' ? r.email : '',
      displayName: typeof r.displayName === 'string' ? r.displayName : null,
      photoUrl: typeof r.photoUrl === 'string' ? r.photoUrl : null,
      tokenExpiresAt: typeof r.tokenExpiresAt === 'number' ? r.tokenExpiresAt : null,
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : null,
    });
  }
  return out;
}
