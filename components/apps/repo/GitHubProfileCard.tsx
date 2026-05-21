'use client';

import Image from 'next/image';
import { ExternalLink, MapPin, Building2, Link2, Users } from 'lucide-react';

export type GithubUserPayload = Record<string, unknown> | null;

function num(n: unknown): string {
  if (typeof n === 'number' && Number.isFinite(n)) return n.toLocaleString();
  return '—';
}

export function GitHubProfileCard({ user }: { user: GithubUserPayload }) {
  if (!user) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/45">
        No profile loaded.
      </div>
    );
  }

  const login = typeof user.login === 'string' ? user.login : '';
  const name = typeof user.name === 'string' ? user.name : login;
  const bio = typeof user.bio === 'string' && user.bio.trim() ? user.bio : null;
  const avatar =
    typeof user.avatar_url === 'string'
      ? user.avatar_url
      : typeof user.avatarUrl === 'string'
        ? user.avatarUrl
        : null;
  const htmlUrl = typeof user.html_url === 'string' ? user.html_url : null;
  const company = typeof user.company === 'string' ? user.company : null;
  const location = typeof user.location === 'string' ? user.location : null;
  const blog = typeof user.blog === 'string' && user.blog.trim() ? user.blog : null;
  const followers = user.followers;
  const following = user.following;
  const publicRepos = user.public_repos;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm">
      <div className="border-b border-white/10 bg-gradient-to-br from-violet-500/10 to-transparent p-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {avatar ? (
            <Image
              src={avatar}
              alt=""
              width={96}
              height={96}
              unoptimized
              className="h-24 w-24 shrink-0 rounded-2xl border border-white/10 object-cover shadow-lg sm:rounded-xl"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-2xl font-bold text-white/50 sm:rounded-xl">
              {(login[0] ?? '?').toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-white">{name}</h3>
            <p className="text-sm text-violet-200/80">@{login}</p>
            {htmlUrl ? (
              <a
                href={htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-sky-300/90 hover:underline"
              >
                Open on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
      <div className="space-y-3 p-5 text-sm">
        {bio ? <p className="text-white/75 leading-relaxed">{bio}</p> : null}
        <div className="flex flex-wrap gap-4 text-xs text-white/55">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {num(followers)} followers · {num(following)} following
          </span>
          {typeof publicRepos === 'number' ? (
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5">
              {publicRepos} public repos
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 text-xs text-white/50">
          {company ? (
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {company}
            </span>
          ) : null}
          {location ? (
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {location}
            </span>
          ) : null}
          {blog ? (
            <a
              href={blog.startsWith('http') ? blog : `https://${blog}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sky-300/90 hover:underline"
            >
              <Link2 className="h-3.5 w-3.5 shrink-0" />
              {blog}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
