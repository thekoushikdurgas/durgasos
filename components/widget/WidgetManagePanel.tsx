'use client';

import { GripVertical, RotateCcw, Trash2 } from 'lucide-react';

import { useOS } from '@/components/os-context';
import { useWidgetLayout } from '@/hooks/use-widget-layout';
import { getWidgetDefinition, WIDGET_REGISTRY } from '@/lib/widget-registry';
import { cn } from '@/lib/utils';

type Props = {
  onResetLayout: () => void;
};

export function WidgetManagePanel({ onResetLayout }: Props) {
  const { items, setEnabledByType } = useWidgetLayout();
  const { isWidgetEditMode, setWidgetEditMode } = useOS();

  const enabledWidgets = items.filter((w) => w.enabled);

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Customize Desktop Toggle */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-200">Customize desktop</span>
          <button
            type="button"
            role="switch"
            aria-checked={isWidgetEditMode}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors',
              isWidgetEditMode ? 'bg-cyan-500' : 'bg-white/20'
            )}
            onClick={() => setWidgetEditMode(!isWidgetEditMode)}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                isWidgetEditMode && 'translate-x-4'
              )}
            />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Turn on to drag widgets on the desktop. Positions save automatically when signed in.
        </p>
      </div>

      {/* Active Widget List */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active widgets
          </span>
          <span className="text-[10px] text-slate-500">{enabledWidgets.length} enabled</span>
        </div>

        {enabledWidgets.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-6 text-center">
            <p className="text-xs text-slate-500">No widgets enabled.</p>
            <p className="mt-1 text-[10px] text-slate-600">
              Switch to the Catalog tab to enable widgets.
            </p>
          </div>
        ) : (
          enabledWidgets.map((w) => {
            const def = getWidgetDefinition(w.type);
            const Icon = def.icon;
            return (
              <div
                key={w.id}
                draggable={isWidgetEditMode}
                onDragStart={(e) => {
                  if (!isWidgetEditMode) return;
                  e.dataTransfer.setData('text/plain', w.type);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-2 transition',
                  'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] group'
                )}
              >
                {isWidgetEditMode ? (
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-600 cursor-grab" />
                ) : null}
                <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="flex-1 min-w-0 text-sm text-slate-200 truncate">{def.label}</span>
                <span className="text-[8px] uppercase tracking-wider text-white/25 bg-white/5 px-1.5 py-0.5 rounded font-semibold shrink-0">
                  {w.type.replace('_', ' ')}
                </span>
                <button
                  type="button"
                  title={`Disable ${def.label}`}
                  className="h-6 w-6 flex items-center justify-center rounded text-slate-600 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all"
                  onClick={() => setEnabledByType(w.type, false)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Reset Layout */}
      <button
        type="button"
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2',
          'text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition'
        )}
        onClick={onResetLayout}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset layout to defaults
      </button>
    </div>
  );
}
