'use client';

import { LayoutGrid } from 'lucide-react';

import { StaggerList } from '@/components/motion/StaggerList';
import { Badge } from '@/components/ui/badge';
import { useOS } from '@/components/os-context';
import { useWidgetLayout } from '@/hooks/use-widget-layout';
import { WIDGET_REGISTRY } from '@/lib/widget-registry';
import { cn } from '@/lib/utils';

export function WidgetCatalogPanel() {
  const { items, enabledCount, setEnabledByType } = useWidgetLayout();
  const { isWidgetEditMode } = useOS();

  const panelSections = [
    { key: 'header', type: 'header' as const },
    ...WIDGET_REGISTRY.map((def) => ({ key: def.type, type: 'row' as const, def })),
  ];

  return (
    <StaggerList
      className="flex flex-col gap-3 p-3"
      items={panelSections}
      getStyle={(_, i) => ({ opacity: 1, x: 0, y: i * 4 })}
    >
      {(section, i, style) => {
        if (section.type === 'header') {
          return (
            <div
              className="flex items-center gap-2 px-1"
              style={{
                opacity: style.opacity,
                transform: `translate3d(${style.x ?? 0}px, ${style.y ?? 0}px, 0)`,
              }}
            >
              <LayoutGrid className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Available widgets</span>
              <Badge
                variant="outline"
                className="ml-auto border-none bg-blue-500/20 text-[10px] text-blue-300"
              >
                {enabledCount} active
              </Badge>
            </div>
          );
        }
        const def = section.def!;
        const row = items.find((w) => w.type === def.type);
        const enabled = Boolean(row?.enabled);
        const Icon = def.icon;
        return (
          <button
            key={def.type}
            type="button"
            draggable={isWidgetEditMode}
            onDragStart={(e) => {
              if (!isWidgetEditMode) return;
              e.dataTransfer.setData('text/plain', def.type);
              e.dataTransfer.effectAllowed = 'move';
            }}
            className={cn(
              'flex w-full flex-row items-start gap-2 rounded-md px-2 py-2 text-left transition hover:bg-white/10',
              enabled && 'bg-white/10'
            )}
            style={{
              opacity: style.opacity,
              transform: `translate3d(${style.x ?? 0}px, ${style.y ?? 0}px, 0)`,
            }}
            onClick={() => setEnabledByType(def.type, !enabled)}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">{def.label}</span>
                <span
                  className={cn(
                    'ml-auto h-2 w-2 shrink-0 rounded-full',
                    enabled ? 'bg-emerald-400' : 'bg-slate-600'
                  )}
                  aria-hidden
                />
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">{def.description}</span>
            </span>
          </button>
        );
      }}
    </StaggerList>
  );
}
