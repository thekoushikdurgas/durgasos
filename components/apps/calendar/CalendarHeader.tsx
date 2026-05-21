'use client';

import { useRef } from 'react';
import { CalendarDays } from 'lucide-react';

import {
  calBtnSecondary,
  calSelect,
  calTabBtn,
  calTabBtnActive,
  calTabBtnIdle,
  calTabNav,
  calTabPill,
} from '@/components/apps/calendar/calendar-theme';
import { SpringTabIndicator } from '@/components/motion/SpringTabIndicator';
import type { LinkedGoogleAccountRow } from '@/lib/linked-google-accounts';

export type CalendarShellTab = 'Today' | 'Planning' | 'Contacts' | 'Events';

const TABS: CalendarShellTab[] = ['Today', 'Planning', 'Contacts', 'Events'];

export function CalendarHeader({
  activeTab,
  onTab,
  accounts,
  googleUserId,
  onGoogleUserId,
  onOpenSettings,
}: {
  activeTab: CalendarShellTab;
  onTab: (t: CalendarShellTab) => void;
  accounts: LinkedGoogleAccountRow[];
  googleUserId: string | null;
  onGoogleUserId: (id: string | null) => void;
  onOpenSettings: () => void;
}) {
  const navRef = useRef<HTMLElement>(null);

  return (
    <header className="flex min-h-14 shrink-0 flex-col gap-2 border-b border-white/10 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white/90 sm:text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <CalendarDays className="size-4 text-white" strokeWidth={2.2} aria-hidden />
          </span>
          Calendar
        </div>
        <nav ref={navRef} className={calTabNav}>
          <SpringTabIndicator
            containerRef={navRef}
            activeSelector='[aria-selected="true"]'
            className={calTabPill}
          />
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => onTab(tab)}
              className={`${calTabBtn} ${activeTab === tab ? calTabBtnActive : calTabBtnIdle}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="calendar-linked-account">
          Linked Google account
        </label>
        <select
          id="calendar-linked-account"
          className={calSelect}
          value={googleUserId ?? ''}
          onChange={(e) => onGoogleUserId(e.target.value || null)}
        >
          {accounts.map((a) => (
            <option key={a.googleUserId} value={a.googleUserId} className="bg-slate-900">
              {a.displayName?.trim() || a.email || a.googleUserId}
            </option>
          ))}
        </select>
        <button type="button" className={calBtnSecondary} onClick={onOpenSettings}>
          Accounts
        </button>
      </div>
    </header>
  );
}
