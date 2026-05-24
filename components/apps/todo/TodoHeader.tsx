'use client';

export function TodoHeader({
  activeWorkspaceName,
  onOpenSettings,
}: {
  activeWorkspaceName: string | null;
  onOpenSettings: () => void;
}) {
  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 py-2 sm:px-6 bg-slate-900/40">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-white sm:text-base">
          {activeWorkspaceName || 'Select Workspace'}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:bg-white/10 transition-colors"
          onClick={onOpenSettings}
        >
          Accounts
        </button>
      </div>
    </header>
  );
}
