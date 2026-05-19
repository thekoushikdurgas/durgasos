'use client';

import { LayoutGroup, motion } from 'motion/react';
import { CalendarDays } from 'lucide-react';

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
  const activeAccount = accounts.find((a) => a.googleUserId === googleUserId);

  return (
    <header className="relative z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 sm:px-10">
      <div className="flex items-center gap-3 text-xl font-black tracking-tighter text-slate-900 sm:text-2xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
          <CalendarDays className="h-6 w-6 text-white" strokeWidth={2.2} aria-hidden />
        </div>
        CLNDR
      </div>

      <nav className="relative flex rounded-2xl bg-slate-100 p-1.5">
        <LayoutGroup id="calendar-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTab(tab)}
              className={`relative z-10 rounded-xl px-4 py-2 text-xs font-bold outline-none transition-colors sm:px-6 sm:text-sm ${
                activeTab === tab ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
              {activeTab === tab ? (
                <motion.div
                  layoutId="calendarActiveTab"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute inset-0 -z-10 rounded-xl bg-white shadow-sm"
                />
              ) : null}
            </button>
          ))}
        </LayoutGroup>
      </nav>

      <div className="flex max-w-[min(40vw,220px)] items-center gap-3">
        <div className="min-w-0 text-right">
          <label className="sr-only" htmlFor="calendar-linked-account">
            Linked Google account
          </label>
          <select
            id="calendar-linked-account"
            className="mb-0.5 max-w-full truncate rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-900"
            value={googleUserId ?? ''}
            onChange={(e) => onGoogleUserId(e.target.value || null)}
          >
            {accounts.map((a) => (
              <option key={a.googleUserId} value={a.googleUserId}>
                {a.displayName?.trim() || a.email || a.googleUserId}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onOpenSettings}
            className="block w-full truncate text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600"
          >
            Accounts
          </button>
        </div>
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-indigo-100 shadow-md">
          {activeAccount?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeAccount.photoUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-indigo-700">
              {(activeAccount?.displayName?.trim() || activeAccount?.email || '?')
                .slice(0, 1)
                .toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
