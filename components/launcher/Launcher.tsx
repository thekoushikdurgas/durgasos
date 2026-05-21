'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useState } from 'react';

import { Presence } from '@/components/motion/PresenceList';
import { SpringBox } from '@/components/motion/SpringBox';
import { useOS } from '@/components/os-context';
import { useInstalledApps } from '@/hooks/use-installed-apps';
import { useLauncherFilters } from '@/hooks/use-launcher-filters';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { getAppsForLauncher, type AppId } from '@/lib/apps';
import { SHELL_Z } from '@/lib/shell-z-index';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';

import { LauncherAppGrid } from './LauncherAppGrid';
import { LauncherToolbar } from './LauncherToolbar';

/** Centered modal height restrictions. */
const LAUNCHER_MAX_HEIGHT = 'min(75vh, 640px)';

export function Launcher() {
  const { isLauncherOpen, closeLauncher, openApp } = useOS();
  const { installApp, uninstallApp } = useInstalledApps();
  const filters = useLauncherFilters();
  const [backdropArmed, setBackdropArmed] = useState(false);
  const backdropReady = isLauncherOpen && backdropArmed;

  const totalCount = getAppsForLauncher().length;

  useEffect(() => {
    if (!isLauncherOpen) return;
    const id = requestAnimationFrame(() => setBackdropArmed(true));
    return () => {
      cancelAnimationFrame(id);
      setBackdropArmed(false);
    };
  }, [isLauncherOpen]);

  useEffect(() => {
    if (!isLauncherOpen) return;
    const id = requestAnimationFrame(() => {
      const panel = document.querySelector('[aria-labelledby="launcher-title"]');
      const backdrop = document.querySelector(
        '[data-shell-overlay][aria-label="Close app launcher"]'
      );
      const panelEl = panel?.closest('[class*="max-w-4xl"]') as HTMLElement | null;
      const panelRect = panelEl?.getBoundingClientRect();
      let maxDomWidgetZ = 0;
      document
        .querySelectorAll('[aria-label="Desktop widgets"] .pointer-events-auto')
        .forEach((el) => {
          const z = parseInt(getComputedStyle(el).zIndex, 10);
          if (!Number.isNaN(z)) maxDomWidgetZ = Math.max(maxDomWidgetZ, z);
        });
      const panelZ = panelEl ? parseInt(getComputedStyle(panelEl).zIndex, 10) : -1;
      const backdropZ = backdrop ? parseInt(getComputedStyle(backdrop as Element).zIndex, 10) : -1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panelLeft = panelRect?.left ?? 0;
      const panelWidth = panelRect?.width ?? 0;
      const panelBottom = panelRect ? panelRect.top + panelRect.height : 0;
      const dockNav = document.querySelector(
        'nav[aria-label="Application dock and quick messages"]'
      );
      const dockRect = dockNav?.getBoundingClientRect();
      const centerDeltaX = panelWidth ? panelLeft + panelWidth / 2 - vw / 2 : null;
      const scrim = document.querySelector('[data-launcher-scrim]');
      const scrimRect = scrim?.getBoundingClientRect();
      const dockOverlapPx =
        dockRect && panelRect
          ? Math.max(0, panelBottom - dockRect.top, dockRect.bottom - (panelRect?.top ?? 0))
          : null;
      const scrimCoversViewport =
        scrimRect != null
          ? Math.abs(scrimRect.height - vh) < 2 && Math.abs(scrimRect.width - vw) < 2
          : null;
      // #region agent log
      fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f051be' },
        body: JSON.stringify({
          sessionId: 'f051be',
          hypothesisId: 'H-BAND',
          location: 'Launcher.tsx:layout-probe',
          message: 'Launcher scrim viewport coverage and panel layout',
          data: {
            shellPanelZ: SHELL_Z.launcherPanel,
            panelZ,
            backdropZ,
            maxDomWidgetZ,
            vw,
            vh,
            scrimHeight: scrimRect?.height,
            scrimWidth: scrimRect?.width,
            scrimCoversViewport,
            panelTop: panelRect?.top,
            panelHeight: panelRect?.height,
            panelBottom,
            panelLeft,
            panelWidth,
            centerDeltaX,
            dockOverlapPx,
            dockTop: dockRect?.top,
            dockBottom: dockRect?.bottom,
          },
          timestamp: Date.now(),
          runId: 'layout-fix-v3',
        }),
      }).catch(() => {});
      // #endregion
    });
    return () => cancelAnimationFrame(id);
  }, [isLauncherOpen]);

  useEffect(() => {
    if (!isLauncherOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLauncher('escape');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLauncherOpen, closeLauncher]);

  const handleOpen = useCallback(
    (id: AppId) => {
      openApp(id);
      closeLauncher('open-app');
    },
    [openApp, closeLauncher]
  );

  const backdropStyle = useReducedMotionStyle({ opacity: 1 }, overlaySpring);
  const panelStyle = useReducedMotionStyle({ opacity: 1, scale: 1 }, overlaySpring);

  if (!isLauncherOpen || typeof document === 'undefined') return null;

  return createPortal(
    <Presence show={isLauncherOpen} presenceKey="app-launcher" itemClassName="">
      <>
        <SpringBox
          defaultStyle={{ opacity: 0 }}
          style={backdropStyle}
          className="fixed inset-0 size-full"
          mapStyle={(s) => ({
            opacity: s.opacity,
            zIndex: SHELL_Z.launcherBackdrop,
            pointerEvents: backdropReady ? 'auto' : 'none',
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
          })}
        >
          <button
            type="button"
            data-launcher-scrim
            data-shell-overlay
            aria-label="Close app launcher"
            className="size-full cursor-default bg-black/60 backdrop-blur-md"
            onPointerDown={(e) => {
              if (!backdropReady) return;
              if (e.target !== e.currentTarget) return;
              e.stopPropagation();
              closeLauncher('backdrop');
            }}
          />
        </SpringBox>

        <div
          className="pointer-events-none fixed inset-0 flex items-center justify-center p-4 sm:p-6"
          style={{
            zIndex: SHELL_Z.launcherPanel,
          }}
        >
          <SpringBox
            defaultStyle={{ opacity: 0, scale: 0.96 }}
            style={panelStyle}
            className="pointer-events-auto flex min-h-0 w-full max-w-4xl flex-col"
            mapStyle={(s) => ({
              opacity: s.opacity,
              transform: `scale(${s.scale ?? 1})`,
              transformOrigin: 'center center',
              maxHeight: LAUNCHER_MAX_HEIGHT,
              width: 'min(100%, 56rem)',
            })}
          >
            <div
              data-shell-overlay
              role="dialog"
              aria-modal="true"
              aria-labelledby="launcher-title"
              className="flex max-h-[min(75vh,640px)] min-h-0 w-full flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <LiquidGlassSurface
                variant="frost"
                className="flex max-h-[min(75vh,640px)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-950/75 shadow-2xl shadow-black/50"
                contentClassName="flex min-h-0 flex-1 flex-col p-0"
              >
                <LauncherToolbar
                  filters={filters}
                  onClose={() => closeLauncher('toolbar-close')}
                  totalCount={totalCount}
                  filteredCount={filters.apps.length}
                />
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">
                  <LauncherAppGrid
                    apps={filters.apps}
                    filterKey={filters.filterKey}
                    query={filters.query}
                    onOpen={handleOpen}
                    onInstall={installApp}
                    onUninstall={uninstallApp}
                  />
                </div>
              </LiquidGlassSurface>
            </div>
          </SpringBox>
        </div>
      </>
    </Presence>,
    document.body
  );
}
