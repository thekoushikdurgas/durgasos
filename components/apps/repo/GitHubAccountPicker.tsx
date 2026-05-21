'use client';

import Image from 'next/image';

import type { LinkedGithubAccount } from '@/lib/linked-github-accounts';

export function GitHubAccountPicker({
  accounts,
  valueGithubUserId,
  onChange,
}: {
  accounts: LinkedGithubAccount[];
  valueGithubUserId: string | null;
  onChange: (account: LinkedGithubAccount) => void;
}) {
  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-white/45">Linked account</span>
      <div className="flex flex-wrap gap-1.5">
        {accounts.map((a) => {
          const active = valueGithubUserId === a.githubUserId;
          const label = a.login || a.displayName || a.githubUserId;
          return (
            <button
              key={a.githubUserId}
              type="button"
              onClick={() => onChange(a)}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs transition ${
                active
                  ? 'border-violet-400/50 bg-violet-500/15 text-white'
                  : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
              }`}
            >
              {a.photoUrl ? (
                <Image
                  src={a.photoUrl}
                  alt=""
                  width={22}
                  height={22}
                  unoptimized
                  className="h-[22px] w-[22px] rounded-full border border-white/10 object-cover"
                />
              ) : (
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/10 bg-white/10 text-[10px] font-medium">
                  {(label[0] ?? '?').toUpperCase()}
                </span>
              )}
              <span className="max-w-[140px] truncate font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
