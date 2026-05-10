'use client';

import { useState, useEffect } from 'react';
import { Sun } from 'lucide-react';

export function DesktopWidgets() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute bottom-32 right-12 flex flex-col gap-6 z-0 pointer-events-none items-end text-right">
      {/* Clock Widget (Android Vibe) */}
      <div className="pointer-events-auto">
        <div className="text-[80px] font-thin leading-none text-white/90 tracking-tight drop-shadow-md">
          {time
            ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : '00:00'}
        </div>
        <div className="text-lg font-medium text-blue-400 -mt-2 tracking-widest uppercase mb-4 drop-shadow-md">
          Durgasos Interface
        </div>
      </div>

      {/* Weather Widget */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center space-x-3 pointer-events-auto shadow-lg hover:bg-white/10 transition-colors">
        <div className="text-3xl">
          <Sun className="w-8 h-8 text-yellow-300 drop-shadow-sm" fill="currentColor" />
        </div>
        <div className="text-left text-white">
          <p className="text-xs font-bold opacity-90">Mostly Sunny</p>
          <p className="text-lg leading-none font-medium">74°F</p>
        </div>
      </div>
    </div>
  );
}
