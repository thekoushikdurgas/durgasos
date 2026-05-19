'use client';

import { motion } from 'motion/react';

export function CategoryCard({
  colorClass,
  title,
  count,
  isActive,
  onClick,
}: {
  colorClass: string;
  title: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      className={`flex h-44 w-full flex-col justify-center rounded-[2rem] border bg-white p-5 text-left transition-all ${
        isActive
          ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
          : 'border-slate-100 shadow-sm hover:shadow-md'
      }`}
    >
      <div className={`mb-4 h-10 w-10 rounded-2xl ${colorClass}`} />
      <div
        className={`mt-2 pr-4 text-lg font-black leading-snug tracking-tight transition-colors ${
          isActive ? 'text-indigo-600' : 'text-slate-900'
        }`}
      >
        {title}
      </div>
      <div className="mt-auto text-sm font-bold text-slate-400">{count} events</div>
    </motion.button>
  );
}
