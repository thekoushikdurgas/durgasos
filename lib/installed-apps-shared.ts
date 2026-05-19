import { APPS, type AppId } from '@/lib/apps';

export const MANDATORY_INSTALLED_APP_IDS: readonly AppId[] = [
  'explorer',
  'settings',
  'apps-manager',
] as const;

export const MANDATORY_INSTALLED_SET = new Set<AppId>(MANDATORY_INSTALLED_APP_IDS);

export function everyAppId(): AppId[] {
  return Object.keys(APPS) as AppId[];
}

export function fullInstallSet(): Set<AppId> {
  return new Set(everyAppId());
}

/** Keep only known app ids and always include mandatory apps. */
export function normalizeAppIdList(ids: Iterable<string>): Set<AppId> {
  const next = new Set<AppId>();
  for (const id of ids) {
    if (id in APPS) next.add(id as AppId);
  }
  for (const m of MANDATORY_INSTALLED_SET) next.add(m);
  return next;
}

/**
 * Remote API rule: null, missing, or empty list means "everything installed"
 * (first-run / legacy rows).
 */
export function resolveInstallSetFromRemote(ids: string[] | null | undefined): Set<AppId> {
  if (!ids || ids.length === 0) return fullInstallSet();
  return normalizeAppIdList(ids);
}

export function isMandatoryApp(id: AppId): boolean {
  return MANDATORY_INSTALLED_SET.has(id);
}
