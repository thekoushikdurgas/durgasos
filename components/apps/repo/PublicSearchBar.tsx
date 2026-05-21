'use client';

import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';

export function PublicSearchBar({
  initialValue,
  onSearch,
  disabled,
}: {
  initialValue?: string;
  onSearch: (username: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initialValue ?? '');

  const submit = useCallback(() => {
    const u = value.trim();
    if (u) onSearch(u);
  }, [onSearch, value]);

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <label className="text-xs font-medium uppercase tracking-wide text-white/50">
        GitHub username
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="octocat"
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-3 text-sm text-white/90 outline-none ring-violet-500/30 placeholder:text-white/35 focus:ring-2 disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={submit}
          className="shrink-0 rounded-xl bg-violet-500/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Load
        </button>
      </div>
    </div>
  );
}
