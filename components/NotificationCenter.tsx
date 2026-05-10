'use client';

import { useOS } from '@/components/os-context';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, Volume2, Sun } from 'lucide-react';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';

export function NotificationCenter() {
  const { isNotifOpen } = useOS();

  return (
    <AnimatePresence>
      {isNotifOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
          className="fixed bottom-20 right-2 top-10 z-30 flex w-[280px] flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()} // Prevent click-away
        >
          <LiquidGlassSurface
            variant="liquid"
            className="flex h-full flex-col space-y-6 overflow-hidden rounded-2xl border border-white/10 p-4 text-sm shadow-2xl"
          >
            {/* Quick Settings (Android/Windows style) */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quick Controls
                </h3>
                <span className="text-[10px] text-blue-400 cursor-pointer">Edit</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button className="h-16 bg-white/10 rounded-xl flex flex-col items-center justify-center border border-white/5 hover:bg-white/20 transition-colors">
                  <Wifi className="w-5 h-5 mb-1 text-slate-200" />
                  <span className="text-[9px] text-slate-200">Wi-Fi</span>
                </button>
                <button className="h-16 bg-blue-500/40 rounded-xl flex flex-col items-center justify-center border border-blue-500/20 text-blue-100 hover:bg-blue-500/50 transition-colors">
                  <Volume2 className="w-5 h-5 mb-1" />
                  <span className="text-[9px]">Audio</span>
                </button>
                <button className="h-16 bg-white/10 rounded-xl flex flex-col items-center justify-center border border-white/5 hover:bg-white/20 transition-colors">
                  <Sun className="w-5 h-5 mb-1 text-slate-200" />
                  <span className="text-[9px] text-slate-200">Display</span>
                </button>
              </div>
            </div>

            {/* Notifications (macOS/iOS style) */}
            <div className="flex-1 overflow-y-auto">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Notifications
              </h3>

              <div className="space-y-3">
                <div className="bg-white/5 p-3 rounded-xl border-l-4 border-blue-500">
                  <p className="text-[11px] font-bold text-white">System Update</p>
                  <p className="text-[10px] opacity-70 text-white mt-0.5">
                    Kernel v5.12.4 is ready to install.
                  </p>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border-l-4 border-slate-600">
                  <p className="text-[11px] font-bold text-white">Calendar</p>
                  <p className="text-[10px] opacity-70 text-white mt-0.5">
                    Team standup in 15 mins.
                  </p>
                </div>
              </div>
            </div>
          </LiquidGlassSurface>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
