'use client';

import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import styles from '../DevToolApp.module.css';

export function ToolPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.panel}>
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      {description ? (
        <p className="text-sm text-slate-400 mt-1 mb-4">{description}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center gap-2 text-indigo-300 py-8 justify-center">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>Processing…</span>
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles.btnSecondary}`}
      onClick={() => void navigator.clipboard.writeText(text)}
    >
      Copy
    </button>
  );
}
