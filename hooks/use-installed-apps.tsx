'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQuery } from '@apollo/client/react';

import {
  ME,
  INSTALLED_APPS,
  SAVE_INSTALLED_APPS,
  SAVE_FILE_ASSOCIATIONS,
} from '@/lib/graphql-modules';
import type { AppId } from '@/lib/apps';
import {
  fullInstallSet,
  isMandatoryApp,
  normalizeAppIdList,
  resolveInstallSetFromRemote,
} from '@/lib/installed-apps-shared';
import { CACHE_TTL_MS, localCache } from '@/lib/local-cache';

const STORAGE_KEY = 'durgasos_installed_apps_v1';
const CHANGED = 'durgasos:installed-apps-changed';

function readLocalIds(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return null;
    return p.map(String);
  } catch {
    return null;
  }
}

function writeLocalIds(ids: Set<AppId>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* quota */
  }
  window.dispatchEvent(new Event(CHANGED));
}

function readLocalNormalized(): Set<AppId> {
  const raw = readLocalIds();
  if (!raw) return fullInstallSet();
  return normalizeAppIdList(raw);
}

export type InstalledAppsContextValue = {
  installedIds: ReadonlySet<AppId>;
  isInstalled: (id: AppId) => boolean;
  isMandatory: (id: AppId) => boolean;
  setInstalledIds: (next: Set<AppId>) => void;
  installApp: (id: AppId) => void;
  uninstallApp: (id: AppId) => void;
  /** Extension (no dot) → app id; from server when signed in. */
  fileAssociations: Readonly<Record<string, string>>;
  saveFileAssociations: (map: Record<string, string>) => Promise<void>;
  /** True after first local read from storage. */
  ready: boolean;
};

const InstalledAppsContext = createContext<InstalledAppsContextValue | null>(null);

export function InstalledAppsProvider({ children }: { children: ReactNode }) {
  const [installedIds, setInstalledIdsState] = useState<Set<AppId>>(() => fullInstallSet());
  const [ready, setReady] = useState(false);

  const meQ = useQuery(ME);
  const authed = Boolean(meQ.data?.me?.id);

  const instQ = useQuery(INSTALLED_APPS, {
    skip: !authed,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });
  const [saveInstalled] = useMutation(SAVE_INSTALLED_APPS);
  const [saveFileAssocMut] = useMutation(SAVE_FILE_ASSOCIATIONS, {
    refetchQueries: [{ query: INSTALLED_APPS }],
  });

  const serverSyncedRef = useRef(false);
  const seedInFlightRef = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      setInstalledIdsState(readLocalNormalized());
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!authed) {
      serverSyncedRef.current = false;
      seedInFlightRef.current = false;
    }
  }, [authed]);

  useEffect(() => {
    if (!authed || instQ.loading || instQ.error) return;
    if (instQ.data === undefined) return;

    const remote = instQ.data.installedApps;

    if (remote === null) {
      if (seedInFlightRef.current || serverSyncedRef.current) return;
      seedInFlightRef.current = true;
      const fromLocal = readLocalNormalized();
      void saveInstalled({ variables: { appIds: [...fromLocal] } })
        .then((res) => {
          const ids = res.data?.saveInstalledApps?.appIds;
          const next = resolveInstallSetFromRemote(ids ?? null);
          setInstalledIdsState(next);
          writeLocalIds(next);
          localCache.set(
            'installed_apps_bundle',
            { appIds: [...next], fileAssociations: res.data?.saveInstalledApps?.fileAssociations },
            CACHE_TTL_MS.installed_apps
          );
        })
        .catch(() => {
          setInstalledIdsState(readLocalNormalized());
        })
        .finally(() => {
          seedInFlightRef.current = false;
          serverSyncedRef.current = true;
        });
      return;
    }

    if (serverSyncedRef.current) return;
    serverSyncedRef.current = true;
    const next = resolveInstallSetFromRemote(remote.appIds);
    setInstalledIdsState(next);
    writeLocalIds(next);
    localCache.set(
      'installed_apps_bundle',
      { appIds: [...next], fileAssociations: remote.fileAssociations },
      CACHE_TTL_MS.installed_apps
    );
  }, [authed, instQ.loading, instQ.error, instQ.data, saveInstalled]);

  const setInstalledIds = useCallback(
    (next: Set<AppId>) => {
      const normalized = normalizeAppIdList(next);
      setInstalledIdsState(normalized);
      writeLocalIds(normalized);
      localCache.set(
        'installed_apps_bundle',
        { appIds: [...normalized], fileAssociations: instQ.data?.installedApps?.fileAssociations },
        CACHE_TTL_MS.installed_apps
      );
      if (authed) {
        void saveInstalled({ variables: { appIds: [...normalized] } }).catch(() => {
          /* offline */
        });
      }
    },
    [authed, instQ.data?.installedApps?.fileAssociations, saveInstalled]
  );

  const installApp = useCallback(
    (id: AppId) => {
      setInstalledIdsState((prev) => {
        const normalized = normalizeAppIdList([...prev, id]);
        writeLocalIds(normalized);
        localCache.set(
          'installed_apps_bundle',
          {
            appIds: [...normalized],
            fileAssociations: instQ.data?.installedApps?.fileAssociations,
          },
          CACHE_TTL_MS.installed_apps
        );
        if (authed) void saveInstalled({ variables: { appIds: [...normalized] } }).catch(() => {});
        return normalized;
      });
    },
    [authed, instQ.data?.installedApps?.fileAssociations, saveInstalled]
  );

  const uninstallApp = useCallback(
    (id: AppId) => {
      if (isMandatoryApp(id)) return;
      setInstalledIdsState((prev) => {
        const n = new Set(prev);
        n.delete(id);
        const normalized = normalizeAppIdList(n);
        writeLocalIds(normalized);
        localCache.set(
          'installed_apps_bundle',
          {
            appIds: [...normalized],
            fileAssociations: instQ.data?.installedApps?.fileAssociations,
          },
          CACHE_TTL_MS.installed_apps
        );
        if (authed) void saveInstalled({ variables: { appIds: [...normalized] } }).catch(() => {});
        return normalized;
      });
    },
    [authed, instQ.data?.installedApps?.fileAssociations, saveInstalled]
  );

  const fileAssociations = useMemo(() => {
    const raw = instQ.data?.installedApps?.fileAssociations;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {} as Record<string, string>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v !== 'string') continue;
      const ext = String(k).toLowerCase().replace(/^\./, '');
      if (ext) out[ext] = v;
    }
    return out;
  }, [instQ.data?.installedApps?.fileAssociations]);

  const saveFileAssociations = useCallback(
    async (map: Record<string, string>) => {
      if (!authed) return;
      await saveFileAssocMut({ variables: { associations: map } });
    },
    [authed, saveFileAssocMut]
  );

  const value = useMemo<InstalledAppsContextValue>(
    () => ({
      installedIds,
      isInstalled: (id: AppId) => installedIds.has(id),
      isMandatory: isMandatoryApp,
      setInstalledIds,
      installApp,
      uninstallApp,
      fileAssociations,
      saveFileAssociations,
      ready,
    }),
    [
      installedIds,
      setInstalledIds,
      installApp,
      uninstallApp,
      fileAssociations,
      saveFileAssociations,
      ready,
    ]
  );

  return <InstalledAppsContext.Provider value={value}>{children}</InstalledAppsContext.Provider>;
}

export function useInstalledApps(): InstalledAppsContextValue {
  const ctx = useContext(InstalledAppsContext);
  if (!ctx) {
    throw new Error('useInstalledApps must be used within InstalledAppsProvider');
  }
  return ctx;
}

export function subscribeInstalledAppsChanged(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const fn = () => cb();
  window.addEventListener(CHANGED, fn);
  return () => window.removeEventListener(CHANGED, fn);
}
