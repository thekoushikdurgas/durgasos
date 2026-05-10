'use client';

import { useDesktopBackground } from '@/components/desktop-background/DesktopBackgroundProvider';
import { Settings, Wifi, Bluetooth, Monitor, Battery, Lock, Bell, Palette } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  DESKTOP_BACKGROUND_OPTIONS,
  type DesktopBackgroundId,
} from '@/lib/desktop-background-storage';

function DesktopBackgroundThumb({ id }: { id: DesktopBackgroundId }) {
  switch (id) {
    case 'stars':
      return (
        <div
          className="h-full w-full"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(147,197,253,0.35) 0%, hsl(217 64% 6%) 55%)',
          }}
        />
      );
    case 'classic':
      return (
        <div className="h-full w-full bg-gradient-to-br from-[#1a1c2c] via-[#4a1942] to-[#12355b] opacity-95" />
      );
    case 'paths':
      return (
        <div className="h-full w-full bg-[#1a1c2c]">
          <svg
            className="h-full w-full opacity-70"
            viewBox="0 0 696 316"
            preserveAspectRatio="none"
          >
            <path
              d="M-200 -100 C 100 50 400 200 600 250"
              fill="none"
              stroke="rgba(148,163,184,0.45)"
              strokeWidth="2"
            />
            <path
              d="M 600 50 C 400 120 200 280 -50 200"
              fill="none"
              stroke="rgba(148,163,184,0.3)"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      );
    case 'asmr':
      return (
        <div
          className="h-full w-full"
          style={{
            background: 'radial-gradient(circle at 30% 40%, rgba(180,220,255,0.1) 0%, #0a0a0c 65%)',
          }}
        />
      );
    default:
      return <div className="h-full w-full bg-slate-900" />;
  }
}

export function SettingsApp() {
  const [activeTab, setActiveTab] = useState('Personalization');
  const [transparencyOn, setTransparencyOn] = useState(true);
  const { backgroundId, setBackgroundId } = useDesktopBackground();

  const TABS = [
    { name: 'System', icon: Settings },
    { name: 'Network & internet', icon: Wifi },
    { name: 'Bluetooth & devices', icon: Bluetooth },
    { name: 'Personalization', icon: Palette },
    { name: 'Display', icon: Monitor },
    { name: 'Power & battery', icon: Battery },
    { name: 'Privacy & security', icon: Lock },
    { name: 'Notifications', icon: Bell },
  ];

  return (
    <div className="absolute inset-0 flex bg-slate-900/90 text-slate-200">
      <LiquidGlassSurface
        variant="frost"
        className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-white/10 p-3"
      >
        <div className="mb-8 mt-2 flex items-center gap-3 px-2">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-slate-800">
            {/* Avatar placeholder */}
            <div className="w-full h-full flex items-center justify-center text-xl text-white/50">
              U
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-white/90">Local Account</span>
            <span className="text-xs text-white/50">Administrator</span>
          </div>
        </div>

        <div className="space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                activeTab === tab.name
                  ? 'bg-blue-600/30 text-blue-400'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>
      </LiquidGlassSurface>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-900/50 p-8">
        <h1 className="text-3xl font-bold text-white/90 mb-8">{activeTab}</h1>

        {activeTab === 'Personalization' && (
          <div className="max-w-2xl space-y-8">
            <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Monitor className="h-5 w-5 text-cyan-400" />
                Desktop background
              </h2>
              <p className="mb-4 text-sm text-white/50">
                Choose the animation behind the desktop. Your choice is saved in this browser.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DESKTOP_BACKGROUND_OPTIONS.map((opt) => {
                  const selected = backgroundId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBackgroundId(opt.id)}
                      className={cn(
                        'flex flex-col rounded-xl border p-4 text-left transition-colors',
                        selected
                          ? 'border-cyan-500/80 bg-cyan-950/30'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                      )}
                    >
                      <div className="mb-2 h-20 w-full overflow-hidden rounded-lg border border-white/10">
                        <DesktopBackgroundThumb id={opt.id} />
                      </div>
                      <span className="font-medium text-white/90">{opt.title}</span>
                      <span className="mt-1 text-xs text-white/45">{opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-blue-400" />
                Select a theme
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-blue-500 rounded-xl overflow-hidden cursor-pointer">
                  <div className="h-24 bg-gradient-to-br from-blue-900 to-slate-900" />
                  <div className="p-3 bg-slate-800 text-sm font-medium text-center">
                    Dark Modern
                  </div>
                </div>
                <div className="border-2 border-transparent hover:border-white/20 rounded-xl overflow-hidden cursor-pointer transition-colors">
                  <div className="h-24 bg-gradient-to-br from-blue-100 to-white" />
                  <div className="p-3 bg-slate-800 text-sm font-medium text-center text-white/70">
                    Light Clean
                  </div>
                </div>
              </div>
            </section>

            <section className="frost-glass-surface rounded-2xl border border-white/10 p-2">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl p-4 transition-colors hover:bg-white/5">
                <div>
                  <div className="font-medium text-white/90">Transparency effects</div>
                  <div className="text-sm text-white/50">
                    Windows and surfaces appear translucent
                  </div>
                </div>
                <Checkbox
                  checked={transparencyOn}
                  onChange={(e) => setTransparencyOn(e.target.checked)}
                  aria-label="Transparency effects"
                  className="border-white/30"
                />
              </label>
              <div className="mx-2 my-1 h-px bg-white/10" />
              <div className="flex items-center justify-between p-4 transition-colors hover:bg-white/5 rounded-xl cursor-default">
                <div>
                  <div className="font-medium text-white/90">Accent color</div>
                  <div className="text-sm text-white/50">Blue</div>
                </div>
                <div className="h-6 w-6 rounded-full bg-blue-500 border-2 border-white/20" />
              </div>
            </section>

            <section className="frost-glass-surface rounded-2xl border border-white/10 p-4">
              <h3 className="mb-3 text-sm font-medium text-white/80">
                Liquid glass intensity (preview)
              </h3>
              <Progress value={72} max={100} className="mb-2" />
              <p className="text-xs text-white/45">Visual-only demo bar using theme tokens.</p>
            </section>
          </div>
        )}

        {/* Fallback for other tabs */}
        {activeTab !== 'Personalization' && (
          <div className="flex flex-col items-center justify-center h-64 text-white/30 border-2 border-dashed border-white/10 rounded-2xl">
            <Settings className="w-12 h-12 mb-4 opacity-50" />
            <p>Settings modules for {activeTab} are under construction.</p>
          </div>
        )}
      </div>
    </div>
  );
}
