'use client';

import { Menu, Search } from 'lucide-react';
import type { LinkedGoogleAccountRow } from '@/lib/linked-google-accounts';

type GmailHeaderProps = {
  accounts: LinkedGoogleAccountRow[];
  googleUserId: string | null;
  onGoogleUserId: (id: string | null) => void;
  searchDraft: string;
  onSearchDraft: (v: string) => void;
  onSearchSubmit: () => void;
  mobileNavOpen: boolean;
  onToggleNav: () => void;
};

export function GmailHeader({
  accounts,
  googleUserId,
  onGoogleUserId,
  searchDraft,
  onSearchDraft,
  onSearchSubmit,
  mobileNavOpen,
  onToggleNav,
}: GmailHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-slate-900/90 px-2 py-1.5 backdrop-blur-sm md:px-3">
      <button
        type="button"
        aria-label={mobileNavOpen ? 'Close folder menu' : 'Open folder menu'}
        aria-expanded={mobileNavOpen ? 'true' : 'false'}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 md:hidden"
        onClick={onToggleNav}
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex shrink-0 items-center gap-1.5 pr-2">
        <span className="hidden text-sm font-semibold tracking-tight text-sky-300 sm:inline">
          Gmail
        </span>
      </div>
      <form
        className="mx-auto flex min-w-0 max-w-2xl flex-1 items-center gap-1 rounded-full border border-white/10 bg-slate-950/80 px-2 py-1 shadow-inner"
        onSubmit={(e) => {
          e.preventDefault();
          onSearchSubmit();
        }}
      >
        <Search className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
        <input
          type="search"
          name="gmail-search"
          placeholder="Search mail"
          value={searchDraft}
          onChange={(e) => onSearchDraft(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-white/90 outline-none placeholder:text-white/35"
          aria-label="Search mail"
        />
      </form>
      <div className="flex shrink-0 items-center gap-1.5">
        <label htmlFor="gmail-account" className="sr-only">
          Linked Google account
        </label>
        <select
          id="gmail-account"
          aria-label="Linked Google account"
          className="max-w-[10rem] truncate rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white md:max-w-[14rem]"
          value={googleUserId ?? ''}
          onChange={(e) => onGoogleUserId(e.target.value || null)}
        >
          {accounts.map((a) => (
            <option key={a.googleUserId} value={a.googleUserId}>
              {a.displayName?.trim() || a.email || a.googleUserId}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
