'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { useNeonFlicker } from '@/hooks/use-neon-flicker';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';

export type StretchMenuItem = {
  id: string;
  label: string;
  icon: ReactNode;
  action: string;
  disabled?: boolean;
};

export type StretchBottomMenuProps = {
  items: StretchMenuItem[];
  onSelect: (action: string) => void;
  className?: string;
  defaultActiveId?: string;
  /** When true, menu closes and ignores hover (e.g. maximized app covers shell). */
  recessed?: boolean;
};

/** Neon-blink hamburger bars (main_Screen/neon-blink) with stretch open/close morph. */
export function StretchHamburger({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'stretch-menu-hamburger stretch-menu-hamburger--neon',
        active && 'stretch-menu-hamburger--active'
      )}
      aria-hidden
    >
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

/**
 * Bottom-left stretch nav: neon-blink trigger when closed; hover expands the liquid-glass panel (no close toggle when open).
 */
export function StretchBottomMenu({
  items,
  onSelect,
  className,
  defaultActiveId,
  recessed = false,
}: StretchBottomMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(defaultActiveId ?? items[0]?.id ?? '');
  const rootRef = useRef<HTMLElement>(null);
  const menuId = useId();
  const tooltipId = useId();
  const reduceMotion = usePrefersReducedMotion();

  const openMenu = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const [tooltip, setTooltip] = useState<{
    id: string;
    label: string;
    top: number;
    left: number;
  } | null>(null);

  const showTooltip = useCallback((item: StretchMenuItem, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setTooltip({
      id: item.id,
      label: item.label,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  const menuOpen = open && !recessed;

  useEffect(() => {
    if (!recessed) return;
    queueMicrotask(() => {
      setOpen(false);
      setTooltip(null);
    });
  }, [recessed]);
  const visibleTooltip = menuOpen ? tooltip : null;
  const { flickering, triggerHoverFlicker } = useNeonFlicker({ enabled: !menuOpen });

  useEffect(() => {
    if (!tooltip) return;
    const scrollEl = rootRef.current?.querySelector('.stretch-menu-panel-scroll');
    if (!scrollEl) return;
    const onScroll = () => hideTooltip();
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [tooltip, hideTooltip]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, close]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (rootRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [menuOpen, close]);

  const handleSelect = (item: StretchMenuItem) => {
    if (item.disabled) return;
    setActiveId(item.id);
    onSelect(item.action);
    close();
  };

  return (
    <nav
      ref={rootRef}
      aria-label="Main menu"
      data-shell-overlay
      className={cn(
        'stretch-menu-root',
        recessed ? 'pointer-events-none' : 'pointer-events-auto',
        className
      )}
      onMouseEnter={recessed || reduceMotion ? undefined : openMenu}
      onMouseLeave={recessed || reduceMotion ? undefined : close}
    >
      <div
        className={cn(
          'stretch-menu-box',
          menuOpen ? 'stretch-menu-box--open' : 'stretch-menu-box--closed',
          reduceMotion && 'stretch-menu-box--reduce-motion'
        )}
      >
        {menuOpen ? (
          <LiquidGlassSurface
            variant="liquid"
            withLiquidShell
            aria-hidden
            className="stretch-menu-glass pointer-events-none absolute inset-0 rounded-[inherit] border border-white/20"
            liquidFrostStyle={{ background: 'var(--color-stretch-menu-liquid-frost)' }}
          />
        ) : null}

        <div className="stretch-menu-content">
          <div
            className={cn('stretch-menu-panel', menuOpen && 'stretch-menu-panel--open')}
            id={menuId}
            role="menu"
            aria-hidden={!menuOpen}
          >
            <div className="stretch-menu-panel-scroll">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  aria-label={item.label}
                  aria-describedby={visibleTooltip?.id === item.id ? tooltipId : undefined}
                  className={cn(
                    'stretch-menu-item',
                    activeId === item.id && 'stretch-menu-item--active',
                    menuOpen && 'stretch-menu-item--visible'
                  )}
                  style={{ '--stretch-menu-i': index } as React.CSSProperties}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={(e) => showTooltip(item, e.currentTarget)}
                  onMouseLeave={hideTooltip}
                  onFocus={(e) => showTooltip(item, e.currentTarget)}
                  onBlur={hideTooltip}
                >
                  <span className="stretch-menu-item__icon">{item.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {!menuOpen ? (
            <button
              type="button"
              className={cn(
                'stretch-menu-toggle group/toggle stretch-menu-toggle--neon',
                flickering && 'is-flicker'
              )}
              aria-label="Open main menu"
              aria-expanded={false}
              aria-controls={menuId}
              onMouseEnter={triggerHoverFlicker}
              onClick={(e) => {
                e.stopPropagation();
                openMenu();
              }}
            >
              <StretchHamburger active={false} />
              <span className="sr-only">Open menu</span>
            </button>
          ) : null}
        </div>
      </div>

      {visibleTooltip && typeof document !== 'undefined'
        ? createPortal(
            <span
              id={tooltipId}
              className="stretch-menu-item__tooltip stretch-menu-item__tooltip--fixed"
              role="tooltip"
              style={{
                top: visibleTooltip.top,
                left: visibleTooltip.left,
              }}
            >
              {visibleTooltip.label}
            </span>,
            document.body
          )
        : null}
    </nav>
  );
}
