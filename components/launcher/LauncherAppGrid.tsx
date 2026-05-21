'use client';

import { StaggerList } from '@/components/motion/StaggerList';
import type { AppDefinition, AppId } from '@/lib/apps';

import { LauncherAppCard } from './LauncherAppCard';

type Props = {
  apps: AppDefinition[];
  filterKey: string;
  query: string;
  onOpen: (id: AppId) => void;
  onInstall: (id: AppId) => void;
  onUninstall: (id: AppId) => void;
};

export function LauncherAppGrid({ apps, filterKey, query, onOpen, onInstall, onUninstall }: Props) {
  if (apps.length === 0) {
    return <p className="py-12 text-center text-sm text-white/50">No apps match your filters.</p>;
  }

  return (
    <StaggerList
      key={filterKey}
      items={apps}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      getStyle={(_item, index) => ({
        opacity: 1,
        x: 0,
        y: Math.min(index, 12) * 4,
      })}
    >
      {(app, _index, style) => (
        <div
          style={{
            opacity: style.opacity,
            transform: `translate3d(${style.x ?? 0}px, ${style.y ?? 0}px, 0)`,
          }}
        >
          <LauncherAppCard
            app={app}
            query={query}
            onOpen={onOpen}
            onInstall={onInstall}
            onUninstall={onUninstall}
          />
        </div>
      )}
    </StaggerList>
  );
}
