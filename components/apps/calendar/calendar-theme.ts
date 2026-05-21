/**
 * Shared Tailwind class fragments for Calendar (dark DurgasOS Google-app interior + violet accent).
 */

export const calShell = 'bg-slate-950 text-white/90';

export const calHeading = 'text-2xl font-bold tracking-tight text-white/95 sm:text-3xl';

export const calHeadingLg = 'text-3xl font-black tracking-tight text-white/95 sm:text-4xl';

export const calMuted = 'text-sm font-medium text-white/45';

export const calMutedXs = 'text-xs font-bold text-white/45';

export const calMutedBody = 'text-xs font-medium text-white/45';

export const calLink = 'font-semibold text-violet-300 hover:text-violet-200 hover:underline';

export const calLinkBold = 'font-bold text-violet-300 hover:text-violet-200 hover:underline';

export const calError = 'text-sm font-medium text-red-300/90';

export const calWarning = 'text-sm text-amber-200/90';

/** Large sections (Today split, Planning grid wrapper, empty states). */
export const calPanel = 'rounded-2xl border border-white/10 bg-slate-900/40 shadow-inner';

/** List rows, small cards, agenda rows. */
export const calPanelRow = 'rounded-xl border border-white/10 bg-white/[0.04]';

export const calInput =
  'rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 [color-scheme:dark]';

export const calSearchInput =
  'w-full min-w-[12rem] rounded-xl border border-white/15 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 sm:w-64 [color-scheme:dark]';

/** Full-width search / filter (no leading icon slot). */
export const calInputWide =
  'w-full max-w-md rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 [color-scheme:dark]';

export const calControlGroup =
  'flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2 py-1';

export const calGhostBtn =
  'rounded-lg px-2 py-1 text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white/90 focus-visible:ring-2 focus-visible:ring-violet-500/50';

export const calMonthLabel = 'min-w-[8rem] text-center text-sm font-bold text-white/80';

export const calTabNav = 'relative flex rounded-lg bg-white/5 p-1';

export const calTabBtn =
  'relative z-10 rounded-md px-3 py-1.5 text-xs font-semibold outline-none transition-colors sm:px-4 sm:text-sm focus-visible:ring-2 focus-visible:ring-violet-500/50';

export const calTabBtnActive = 'text-white';

export const calTabBtnIdle = 'text-white/50 hover:text-white/80';

export const calTabPill = 'absolute inset-0 -z-10 rounded-md bg-white/15';

export const calSelect =
  'max-w-[min(50vw,220px)] truncate rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white';

export const calBtnSecondary =
  'rounded-lg border border-white/15 px-2 py-1 text-xs text-white/80 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-violet-500/50';

export const calIconMuted = 'text-white/40';

export const calWeekdayHeader =
  'mb-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-white/40';
