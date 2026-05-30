'use client';

import React, { useState } from 'react';
import { Search, BookOpen, Bell, Sidebar, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import type { LibraryNotification } from '@/components/apps/library/types';

type Props = {
  userLabel: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: (v: boolean) => void;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (v: boolean) => void;
  notifications: LibraryNotification[];
  onClearNotification: (id: string) => void;
};

export function LibraryHeader({
  userLabel,
  searchQuery,
  setSearchQuery,
  leftSidebarOpen,
  setLeftSidebarOpen,
  rightSidebarOpen,
  setRightSidebarOpen,
  notifications,
  onClearNotification,
}: Props) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-slate-800 bg-[#0F1117] px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className={`p-1.5 rounded-lg border transition-colors ${
            leftSidebarOpen
              ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400'
              : 'border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
          aria-label="Toggle book catalog"
        >
          <Sidebar className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-1.5 rounded-lg">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-200 text-sm truncate">AuraBook Library</h1>
            <p className="text-[10px] text-slate-500 truncate">{userLabel}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md relative hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search title, author, ISBN…"
          className="w-full bg-[#0A0C10] border border-slate-700 rounded-full pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className={`p-1.5 rounded-lg border text-xs ${
            rightSidebarOpen
              ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400'
              : 'border-slate-800 text-slate-400'
          }`}
        >
          Insights
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white relative"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full" />
            )}
          </button>
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1 w-72 max-h-64 overflow-y-auto bg-[#0F1117] border border-slate-800 rounded-lg shadow-xl z-50"
              >
                {notifications.length === 0 ? (
                  <p className="p-3 text-xs text-slate-500">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="flex gap-2 p-2 border-b border-slate-800/80 text-xs">
                      {n.type === 'warning' ? (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300">{n.message}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">{n.timestamp}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onClearNotification(n.id)}
                        className="text-slate-600 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
