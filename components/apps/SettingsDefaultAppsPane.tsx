'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';

import { Input } from '@/components/ui/input';
import { useInstalledApps } from '@/hooks/use-installed-apps';
import { ME } from '@/lib/graphql-modules';
import {
  appSupportsExtension,
  getAllKnownExtensions,
  BUILTIN_DEFAULT_APP_BY_EXTENSION,
} from '@/lib/app-file-associations';
import { APPS, type AppId } from '@/lib/apps';

function optionsForExtension(ext: string, installed: ReadonlySet<AppId>): AppId[] {
  return (Object.keys(APPS) as AppId[]).filter(
    (id) => installed.has(id) && appSupportsExtension(id, ext)
  );
}

export function SettingsDefaultAppsPane() {
  const meQ = useQuery(ME);
  const authed = Boolean(meQ.data?.me?.id);
  const { installedIds, fileAssociations, saveFileAssociations } = useInstalledApps();

  const baseExts = useMemo(() => getAllKnownExtensions(), []);
  const [extraExts, setExtraExts] = useState<string[]>([]);
  const [newExt, setNewExt] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [filter, setFilter] = useState('');

  const allExts = useMemo(() => {
    const s = new Set([...baseExts, ...Object.keys(fileAssociations), ...extraExts]);
    return [...s].sort();
  }, [baseExts, fileAssociations, extraExts]);

  const visibleExts = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allExts;
    return allExts.filter((ext) => ext.includes(q));
  }, [allExts, filter]);

  useEffect(() => {
    queueMicrotask(() => {
      setDraft({ ...fileAssociations });
    });
  }, [fileAssociations]);

  const onChangeApp = useCallback((ext: string, appId: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (!appId) delete next[ext];
      else next[ext] = appId;
      return next;
    });
  }, []);

  const addCustomExt = useCallback(() => {
    const raw = newExt.trim().toLowerCase().replace(/^\./, '');
    if (!raw || !/^[a-z0-9+]{1,16}$/.test(raw)) return;
    setExtraExts((prev) => (prev.includes(raw) ? prev : [...prev, raw]));
    setNewExt('');
  }, [newExt]);

  const resetToBuiltins = useCallback(() => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const ext of allExts) {
        const builtin = BUILTIN_DEFAULT_APP_BY_EXTENSION[ext];
        if (builtin && appSupportsExtension(builtin, ext) && installedIds.has(builtin)) {
          next[ext] = builtin;
        } else {
          delete next[ext];
        }
      }
      return next;
    });
  }, [allExts, installedIds]);

  const onSave = useCallback(async () => {
    if (!authed) return;
    setSaving(true);
    try {
      const cleaned: Record<string, string> = {};
      for (const ext of allExts) {
        const v = draft[ext];
        if (v && appSupportsExtension(v as AppId, ext) && installedIds.has(v as AppId)) {
          cleaned[ext] = v;
        }
      }
      await saveFileAssociations(cleaned);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }, [allExts, authed, draft, installedIds, saveFileAssociations]);

  if (!authed) {
    return (
      <div className="frost-glass-surface mb-0 border border-white/10 p-6 text-sm text-white/60">
        Sign in to sync default apps for file types with your account.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="frost-glass-surface mb-0 border border-white/10 p-6">
        <h2 className="mb-2 text-lg font-semibold text-white/90">Default apps by extension</h2>
        <p className="mb-4 text-sm text-white/50">
          Choose which installed app opens each file type. Only apps that declare support for an
          extension are listed.
        </p>
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div className="flex min-w-[8rem] flex-1 flex-col gap-1">
            <label className="text-xs text-white/45">Filter</label>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="e.g. pdf"
              className="border-white/10 bg-black/25"
            />
          </div>
          <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
            <label className="text-xs text-white/45">Add extension</label>
            <Input
              value={newExt}
              onChange={(e) => setNewExt(e.target.value)}
              placeholder="e.g. pdf"
              className="border-white/10 bg-black/25"
            />
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/15"
            onClick={resetToBuiltins}
          >
            Reset to recommended
          </button>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/15"
            onClick={addCustomExt}
          >
            Add
          </button>
          <button
            type="button"
            className="ml-auto shrink-0 rounded-lg border border-blue-500/40 bg-blue-600/30 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/45 disabled:opacity-50"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {savedAt ? <p className="mb-3 text-xs text-emerald-400/90">Saved successfully.</p> : null}
        <div className="rounded-lg border border-white/10">
          <table className="w-full min-w-[320px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-[1] bg-slate-900/95 text-white/50">
              <tr>
                <th className="p-2 font-medium">Extension</th>
                <th className="p-2 font-medium">Default app</th>
              </tr>
            </thead>
            <tbody>
              {visibleExts.map((ext) => {
                const opts = optionsForExtension(ext, installedIds);
                const value = draft[ext] ?? '';
                return (
                  <tr key={ext} className="border-t border-white/5">
                    <td className="p-2 font-mono text-white/80">.{ext}</td>
                    <td className="p-2">
                      <select
                        className="w-full max-w-xs rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-white"
                        aria-label={`Default application for .${ext} files`}
                        value={value}
                        onChange={(e) => onChangeApp(ext, e.target.value)}
                      >
                        <option value="">(built-in default)</option>
                        {opts.map((id) => (
                          <option key={id} value={id}>
                            {APPS[id].name}
                          </option>
                        ))}
                      </select>
                      {opts.length === 0 ? (
                        <p className="mt-1 text-[10px] text-amber-400/80">
                          No installed app supports this type.
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {/* <p className="text-xs text-white/40">
        Tip: clearing a row uses the built-in default when you double-click in Files. Unsupported
        extensions rely on “Open with”.
      </p> */}
    </div>
  );
}
