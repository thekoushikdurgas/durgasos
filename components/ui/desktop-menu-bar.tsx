'use client';

import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { cn } from '@/lib/utils';

export type MenuItemOption =
  | { type: 'separator' }
  | {
      label: string;
      action?: string;
      shortcut?: string;
      type?: 'item';
      disabled?: boolean;
    };

export type MenuConfig = {
  label: string;
  items: MenuItemOption[];
};

const LOGO_MENU_KEY = '__logo__';

export type DesktopMenuBarProps = {
  className?: string;
  /** Items for the left “Durgasos” / app root menu */
  logoMenuItems: MenuItemOption[];
  /** Top-level menus (File, Edit, …) */
  menus: MenuConfig[];
  /** Fired when a menu item with an `action` is activated */
  onMenuAction: (action: string) => void;
  /** Optional label shown after the brand (foreground app name) */
  activeAppName?: string | null;
  /** Right cluster (clock, tray icons); not part of the menubar for click-outside */
  rightSlot: ReactNode;
  /** Brand control: typically logo + title opening `logoMenuItems` */
  brandSlot: ReactNode;
};

function getMenuItems(root: HTMLElement | null): HTMLButtonElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not([disabled])')
  );
}

function MenuDropdownPanel({
  id,
  items,
  position,
  panelRef,
  onRequestClose,
  onSelect,
}: {
  id: string;
  items: MenuItemOption[];
  position: { top: number; left: number };
  panelRef: RefObject<HTMLDivElement | null>;
  onRequestClose: () => void;
  onSelect: (action: string) => void;
}) {
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const buttons = getMenuItems(panelRef.current);
    if (buttons.length === 0) return;
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onRequestClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = i < 0 ? 0 : Math.min(i + 1, buttons.length - 1);
      buttons[next]?.focus();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = i <= 0 ? buttons.length - 1 : i - 1;
      buttons[next]?.focus();
    }
  };

  return (
    <div
      ref={panelRef}
      id={id}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={cn(
        'fixed z-[2000] min-w-56 rounded-lg py-1 frost-glass-surface shadow-2xl',
        'animate-[menuFadeIn_0.15s_cubic-bezier(0.23,1,0.32,1)_forwards]'
      )}
      style={{ top: position.top, left: position.left }}
    >
      {items.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={`sep-${index}`} className="my-1 h-px bg-white/10" role="separator" />;
        }
        return (
          <button
            key={`${item.label}-${index}`}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={cn(
              'flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left text-[13px] text-slate-100',
              'outline-none hover:bg-white/10 focus-visible:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40'
            )}
            onClick={() => {
              if (item.action) onSelect(item.action);
            }}
          >
            <span>{item.label}</span>
            {item.shortcut ? (
              <span className="font-mono text-[11px] text-slate-400">{item.shortcut}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function DesktopMenuBar({
  className,
  logoMenuItems,
  menus,
  onMenuAction,
  activeAppName,
  rightSlot,
  brandSlot,
}: DesktopMenuBarProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const menubarRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const logoButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const baseId = useId();
  const logoMenuId = `${baseId}-logo-menu`;

  const close = useCallback(() => {
    setOpenKey(null);
  }, []);

  const openAt = useCallback((key: string, trigger: HTMLButtonElement | null) => {
    if (!trigger) return;
    lastTriggerRef.current = trigger;
    const rect = trigger.getBoundingClientRect();
    setPanelPos({ top: rect.bottom + 2, left: rect.left });
    setOpenKey(key);
  }, []);

  const toggleLogoMenu = useCallback(() => {
    if (openKey === LOGO_MENU_KEY) {
      close();
      return;
    }
    openAt(LOGO_MENU_KEY, logoButtonRef.current);
  }, [close, openKey, openAt]);

  const toggleMenu = useCallback(
    (label: string) => {
      if (openKey === label) {
        close();
        return;
      }
      openAt(label, menuButtonRefs.current[label] ?? null);
    },
    [close, openKey, openAt]
  );

  useLayoutEffect(() => {
    if (!openKey) return;
    const trigger =
      openKey === LOGO_MENU_KEY ? logoButtonRef.current : menuButtonRefs.current[openKey];
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 2, left: rect.left });
    }
  }, [openKey]);

  useEffect(() => {
    if (!openKey) return;

    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      const t = event.target as Node;
      if (menubarRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      close();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [openKey, close]);

  useEffect(() => {
    if (!openKey) return;

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        lastTriggerRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openKey, close]);

  useEffect(() => {
    if (!openKey) return;
    const t = requestAnimationFrame(() => {
      const first = getMenuItems(panelRef.current)[0];
      first?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [openKey]);

  const handleSelect = useCallback(
    (action: string) => {
      onMenuAction(action);
      close();
      lastTriggerRef.current?.focus();
    },
    [onMenuAction, close]
  );

  const openItems =
    openKey === LOGO_MENU_KEY
      ? logoMenuItems
      : openKey
        ? (menus.find((m) => m.label === openKey)?.items ?? [])
        : [];

  const openMenuDomId = openKey === LOGO_MENU_KEY ? logoMenuId : `${baseId}-menu-${openKey}`;

  const portal =
    openKey && typeof document !== 'undefined'
      ? createPortal(
          <MenuDropdownPanel
            id={openMenuDomId}
            items={openItems}
            position={panelPos}
            panelRef={panelRef}
            onRequestClose={() => {
              close();
              lastTriggerRef.current?.focus();
            }}
            onSelect={handleSelect}
          />,
          document.body
        )
      : null;

  return (
    <>
      <LiquidGlassSurface
        variant="liquid"
        withLiquidShell={false}
        className={cn('rounded-none border-b border-white/10', className)}
      >
        <div className="flex h-8 w-full items-center justify-between px-4 text-[13px] font-medium text-slate-200">
          <div ref={menubarRef} className="flex min-w-0 flex-1 items-center gap-1" role="menubar">
            <button
              ref={logoButtonRef}
              type="button"
              role="menuitem"
              className="flex max-w-[min(100%,14rem)] shrink-0 items-center gap-2 rounded px-1 py-0.5 font-bold tracking-tight text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-400/40"
              aria-haspopup="menu"
              aria-expanded={openKey === LOGO_MENU_KEY}
              aria-controls={openKey === LOGO_MENU_KEY ? logoMenuId : undefined}
              onClick={(e) => {
                e.stopPropagation();
                toggleLogoMenu();
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (openKey !== LOGO_MENU_KEY) openAt(LOGO_MENU_KEY, logoButtonRef.current);
                }
              }}
            >
              {brandSlot}
            </button>

            {activeAppName ? (
              <span className="shrink-0 px-2 font-semibold text-white" aria-live="polite">
                {activeAppName}
              </span>
            ) : null}

            {menus.map((menu) => (
              <button
                key={menu.label}
                ref={(el) => {
                  menuButtonRefs.current[menu.label] = el;
                }}
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={openKey === menu.label}
                aria-controls={openKey === menu.label ? `${baseId}-menu-${menu.label}` : undefined}
                className="shrink-0 rounded px-2 py-0.5 text-slate-300 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMenu(menu.label);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (openKey !== menu.label)
                      openAt(menu.label, menuButtonRefs.current[menu.label]);
                  }
                }}
              >
                {menu.label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {rightSlot}
          </div>
        </div>
      </LiquidGlassSurface>
      {portal}
    </>
  );
}
