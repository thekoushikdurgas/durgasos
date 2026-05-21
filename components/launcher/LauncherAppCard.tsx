'use client';

import { APP_CATEGORY_LABELS, APP_DESCRIPTIONS, type AppDefinition, type AppId } from '@/lib/apps';
import { useInstalledApps } from '@/hooks/use-installed-apps';
import { cn } from '@/lib/utils';

type Props = {
  app: AppDefinition;
  query: string;
  onOpen: (id: AppId) => void;
  onInstall: (id: AppId) => void;
  onUninstall: (id: AppId) => void;
};

export function LauncherAppCard({ app, query, onOpen, onInstall, onUninstall }: Props) {
  const { isInstalled, isMandatory } = useInstalledApps();
  const installed = isInstalled(app.id);
  const mandatory = isMandatory(app.id);
  const description = APP_DESCRIPTIONS[app.id];

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.04] p-4',
        'transition-colors hover:border-white/20 hover:bg-white/[0.06]'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-b from-slate-700/80 to-slate-800/80">
          <app.icon className={cn('h-6 w-6', app.color)} strokeWidth={1.5} />
          {installed ? (
            <span
              className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400"
              title="Installed"
              aria-hidden
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">
            {highlight(app.name, query)}
          </h3>
          <p className="mt-0.5 text-[11px] font-medium text-cyan-400/90">
            {APP_CATEGORY_LABELS[app.category]}
          </p>
        </div>
      </div>

      {app.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {app.tags.map((t) => (
            <span
              key={t}
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/55"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      {description ? (
        <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-white/55">
          {description}
        </p>
      ) : (
        <div className="flex-1" />
      )}

      <div
        className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={!installed}
          onClick={() => onOpen(app.id)}
          className={cn(
            'min-w-[4.5rem] flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
            installed
              ? 'bg-blue-600/90 text-white hover:bg-blue-600'
              : 'cursor-not-allowed bg-white/5 text-white/35'
          )}
        >
          Open
        </button>
        <button
          type="button"
          disabled={installed}
          onClick={() => onInstall(app.id)}
          className={cn(
            'min-w-[4.5rem] flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
            !installed
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
              : 'cursor-not-allowed border-white/10 bg-white/5 text-white/35'
          )}
        >
          Install
        </button>
        <button
          type="button"
          disabled={!installed || mandatory}
          title={mandatory ? 'Core app — cannot be removed' : 'Remove from desktop'}
          onClick={() => onUninstall(app.id)}
          className={cn(
            'min-w-[4.5rem] flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
            !installed || mandatory
              ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/35'
              : 'border-red-500/35 bg-red-500/10 text-red-200 hover:bg-red-500/20'
          )}
        >
          Uninstall
        </button>
      </div>
    </article>
  );
}

function highlight(text: string, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return text;
  const lower = text.toLowerCase();
  const i = lower.indexOf(s);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-[var(--color-accent-primary,#3b82f6)]/35 px-0.5 text-inherit">
        {text.slice(i, i + s.length)}
      </mark>
      {text.slice(i + s.length)}
    </>
  );
}
