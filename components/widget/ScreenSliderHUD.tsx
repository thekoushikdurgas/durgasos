'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

import { SpringBox } from '@/components/motion/SpringBox';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { cn } from '@/lib/utils';

export const DESKTOP_SCREENS = [
  { id: 0, title: 'Dashboard', desc: 'Home & Productivity' },
  { id: 1, title: 'Workspaces', desc: 'Apps & Communication' },
  { id: 2, title: 'Diagnostics', desc: 'System & Status Info' },
] as const;

export const DESKTOP_SCREENS_COUNT = DESKTOP_SCREENS.length;

const HUD_BTN = cn(
  'rounded-xl border border-white/12 bg-white/10 p-1.5 text-white/80 transition-all duration-300',
  'hover:border-cyan-400/35 hover:bg-white/15 hover:text-cyan-300',
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40',
  'disabled:pointer-events-none disabled:opacity-25'
);

type ScreenSliderHUDProps = {
  activeScreen: number;
  onChange: (idx: number) => void;
};

export function ScreenSliderHUD({ activeScreen, onChange }: ScreenSliderHUDProps) {
  const enterStyle = useReducedMotionStyle({ opacity: 1, y: 0 }, overlaySpring);

  return (
    <SpringBox
      className="hud-panel pointer-events-auto absolute right-6 top-1/2 z-50 -translate-y-1/2 select-none"
      defaultStyle={{ opacity: 0, y: 8 }}
      style={enterStyle}
      mapStyle={(s) => ({
        opacity: s.opacity,
        transform: `translate3d(0, calc(-50% + ${s.y ?? 0}px), 0)`,
      })}
    >
      <div className="w-fit rounded-2xl border border-white/10 shadow-lg">
        <LiquidGlassSurface
          variant="liquid"
          className="bg-white/8 text-white"
          contentClassName="flex flex-col items-center gap-5 px-3.5 py-5"
        >
          <button
            type="button"
            onClick={() => onChange(Math.max(activeScreen - 1, 0))}
            disabled={activeScreen === 0}
            className={HUD_BTN}
            aria-label="Previous screen"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          <div className="flex flex-col gap-5 py-1">
            {DESKTOP_SCREENS.map((screen) => {
              const isActive = screen.id === activeScreen;
              return (
                <div
                  key={screen.id}
                  className="group relative flex h-5 w-5 items-center justify-center"
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute right-8 origin-right whitespace-nowrap rounded-lg border border-white/12',
                      'bg-slate-950/90 px-3 py-2 text-right opacity-0 shadow-lg transition-all duration-300',
                      'translate-x-2 scale-95 group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100'
                    )}
                  >
                    <div className="text-xs font-semibold text-white/95">{screen.title}</div>
                    <div className="mt-0.5 text-[10px] font-medium text-white/55">
                      {screen.desc}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onChange(screen.id)}
                    className={cn(
                      'relative flex items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/50',
                      isActive
                        ? 'h-2.5 w-2.5 scale-[2.1] bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.65)]'
                        : 'h-2.5 w-2.5 bg-white/30 hover:scale-150 hover:bg-white/70'
                    )}
                    aria-label={`Go to ${screen.title}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {isActive ? (
                      <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/40 opacity-75" />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onChange(Math.min(activeScreen + 1, DESKTOP_SCREENS_COUNT - 1))}
            disabled={activeScreen === DESKTOP_SCREENS_COUNT - 1}
            className={HUD_BTN}
            aria-label="Next screen"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </LiquidGlassSurface>
      </div>
    </SpringBox>
  );
}
