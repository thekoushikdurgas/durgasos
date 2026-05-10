'use client';

import { useOS } from '@/components/os-context';
import { motion, AnimatePresence } from 'motion/react';
import { Search } from 'lucide-react';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { APPS } from '@/lib/apps';

export function Launcher() {
  const { isLauncherOpen, toggleLauncher, openApp } = useOS();

  return (
    <AnimatePresence>
      {isLauncherOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
          className="fixed bottom-24 left-1/2 z-50 flex h-[500px] w-[600px] -translate-x-1/2 flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <LiquidGlassSurface
            variant="liquid"
            className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/15 shadow-2xl"
          >
            {/* Search Bar (Android/Windows vibe) */}
            <div className="p-6 pb-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search apps, files, and web..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                  autoFocus
                />
              </div>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <h3 className="text-xs font-semibold text-white/50 mb-4 px-1">Pinned Apps</h3>
              <div className="grid grid-cols-6 gap-y-6 gap-x-2">
                {Object.values(APPS).map((app) => (
                  <button
                    key={app.id}
                    onClick={() => openApp(app.id)}
                    className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-b from-slate-700/80 to-slate-800/80 shadow-sm border border-white/5 group-hover:scale-105 transition-transform duration-200">
                      <app.icon className={`w-7 h-7 ${app.color}`} strokeWidth={1.5} />
                    </div>
                    <span className="text-xs font-medium text-white/80 group-hover:text-white">
                      {app.name}
                    </span>
                  </button>
                ))}
              </div>

              <h3 className="text-xs font-semibold text-white/50 mb-4 mt-8 px-1">Recent Files</h3>
              <div className="flex flex-col gap-1">
                {[1, 2, 3].map((i) => (
                  <button
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-sm text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-md bg-blue-500/20 flex items-center justify-center">
                      <Search className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-white/90">Project_Report_v{i}.pdf</div>
                      <div className="text-xs text-white/40">Opened {i} hours ago</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </LiquidGlassSurface>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
