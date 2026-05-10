'use client';

import { useThemePreferences } from '@/components/ThemePreferences';
import { AsmrDesktopBackground } from '@/components/ui/asmr-desktop-background';
import { BackgroundPathsDesktop } from '@/components/ui/background-paths';
import { StarsCanvas } from '@/components/ui/stars-canvas';

import { useDesktopBackground } from './DesktopBackgroundProvider';

export function DesktopBackgroundLayer() {
  const { backgroundId } = useDesktopBackground();
  const { prefersReducedMotion } = useThemePreferences();

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {backgroundId === 'stars' && <StarsCanvas paused={prefersReducedMotion} />}
      {backgroundId === 'classic' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1c2c] via-[#4a1942] to-[#12355b] opacity-60" />
          <div
            className="desktop-liquid-bg absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                'url("https://images.unsplash.com/photo-1432251407527-504a6b4174a2?q=80&w=1480&auto=format&fit=crop")',
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.05) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.2) 0%, transparent 50%)',
            }}
          />
        </>
      )}
      {backgroundId === 'paths' && <BackgroundPathsDesktop animate={!prefersReducedMotion} />}
      {backgroundId === 'asmr' && <AsmrDesktopBackground paused={prefersReducedMotion} />}
    </div>
  );
}
