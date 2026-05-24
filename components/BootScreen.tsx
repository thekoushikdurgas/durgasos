'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSystemHealth } from '@/hooks/use-system-health';

/* ─── Types ─── */

type CheckStep = {
  id: string;
  label: string;
  sublabel?: string;
  minMs: number; // minimum ms before this step can complete
};

type StepState = 'pending' | 'running' | 'done' | 'skipped';

/* ─── Config ─── */

const BOOT_STEPS: CheckStep[] = [
  {
    id: 'shell',
    label: 'Initialising OS shell',
    sublabel: 'Loading window manager & dock',
    minMs: 400,
  },
  {
    id: 'backend',
    label: 'Connecting to AI backend',
    sublabel: 'WebSocket gateway handshake',
    minMs: 800,
  },
  {
    id: 'providers',
    label: 'Loading AI providers',
    sublabel: 'Ollama · OpenAI · Anthropic',
    minMs: 1200,
  },
  {
    id: 'workspace',
    label: 'Syncing workspace',
    sublabel: 'Files · embeddings · agents',
    minMs: 1600,
  },
  {
    id: 'ready',
    label: 'DurgasOS ready',
    sublabel: 'Welcome back',
    minMs: 2000,
  },
];

const BOOT_SEEN_KEY = 'durgasos_boot_seen_v2';
const DISMISS_AFTER_MS = 3200; // auto-dismiss even if health check is still loading

/* ─── Helpers ─── */

function shouldShowBoot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !window.sessionStorage.getItem(BOOT_SEEN_KEY);
  } catch {
    return true;
  }
}

function markBootSeen() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(BOOT_SEEN_KEY, '1');
  } catch {
    /* quota */
  }
}

/* ─── StepRow ─── */

function StepRow({ step, state }: { step: CheckStep; state: StepState }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 transition-all duration-500',
        state === 'pending' && 'opacity-0 translate-y-2',
        state === 'running' && 'opacity-70 translate-y-0',
        (state === 'done' || state === 'skipped') && 'opacity-100 translate-y-0'
      )}
    >
      <span className="shrink-0">
        {state === 'done' || state === 'skipped' ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />
        ) : state === 'running' ? (
          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" aria-hidden />
        ) : (
          <Circle className="h-4 w-4 text-white/20" aria-hidden />
        )}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'text-sm font-medium transition-colors duration-300',
            state === 'done'
              ? 'text-white/90'
              : state === 'running'
                ? 'text-cyan-200'
                : 'text-white/30'
          )}
        >
          {step.label}
        </p>
        {step.sublabel && (
          <p
            className={cn(
              'text-xs transition-colors duration-300',
              state === 'done'
                ? 'text-white/40'
                : state === 'running'
                  ? 'text-cyan-400/60'
                  : 'text-white/15'
            )}
          >
            {step.sublabel}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── BootScreen ─── */

export function BootScreen() {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const startedRef = useRef(false);
  const dismissedRef = useRef(false);

  const { overall, loading: healthLoading } = useSystemHealth(5000);

  const dismissAfter = useCallback((delay: number) => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    markBootSeen();
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => setShow(false), 600);
    }, delay);
  }, []);

  // Only show on first session load (defer setState to avoid sync updates in effect)
  useEffect(() => {
    if (!shouldShowBoot()) return;
    const init: Record<string, StepState> = {};
    BOOT_STEPS.forEach((s) => (init[s.id] = 'pending'));
    queueMicrotask(() => {
      setShow(true);
      setStepStates(init);
    });
  }, []);

  // Drive the step animation sequence
  useEffect(() => {
    if (!show || startedRef.current) return;
    startedRef.current = true;

    let idx = 0;

    const advance = () => {
      if (idx >= BOOT_STEPS.length) return;

      const step = BOOT_STEPS[idx];
      setCurrentIdx(idx);

      // Mark current as running
      setStepStates((prev) => ({ ...prev, [step.id]: 'running' }));

      // Wait minMs then mark done and advance
      setTimeout(
        () => {
          setStepStates((prev) => ({ ...prev, [step.id]: 'done' }));
          idx += 1;

          if (idx < BOOT_STEPS.length) {
            // Small stagger before next step becomes running
            setTimeout(advance, 120);
          }
        },
        step.minMs - (idx > 0 ? BOOT_STEPS[idx - 1].minMs : 0)
      );
    };

    advance();
  }, [show]);

  // Dismiss once all steps done OR after timeout
  useEffect(() => {
    if (!show || dismissedRef.current) return;

    const allDone = BOOT_STEPS.every((s) => stepStates[s.id] === 'done');
    const backendReady = !healthLoading && overall !== 'offline';

    if (allDone && backendReady) {
      dismissAfter(300);
    }
  }, [stepStates, overall, healthLoading, show, dismissAfter]);

  // Safety timeout — always dismiss
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => dismissAfter(0), DISMISS_AFTER_MS + 500);
    return () => clearTimeout(timer);
  }, [show, dismissAfter]);

  if (!show) return null;

  const progress = Math.round(
    (Object.values(stepStates).filter((s) => s === 'done').length / BOOT_STEPS.length) * 100
  );

  return (
    <div
      role="status"
      aria-label="DurgasOS starting up"
      aria-live="polite"
      className={cn(
        'fixed inset-0 z-[9999] flex flex-col items-center justify-center',
        'bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(6,182,212,0.12)_0%,hsl(217_64%_4%)_60%)]',
        'transition-all duration-700',
        exiting ? 'opacity-0 scale-105 blur-sm' : 'opacity-100 scale-100 blur-0'
      )}
    >
      {/* Background particle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow orb */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(6,182,212,0.18) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)',
          animation: 'boot-pulse 3s ease-in-out infinite',
        }}
      />

      {/* Logo + brand */}
      <div className="relative mb-10 flex flex-col items-center gap-4">
        {/* Icon */}
        <div
          className="flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 via-violet-500/10 to-transparent shadow-[0_0_40px_rgba(6,182,212,0.25)]"
          style={{ animation: 'boot-icon-float 4s ease-in-out infinite' }}
        >
          <Zap className="h-9 w-9 text-cyan-400" aria-hidden />
        </div>

        {/* Name */}
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            DurgasOS
          </h1>
          <p className="mt-1 text-sm tracking-[0.25em] text-white/35 uppercase">
            AI Desktop Environment
          </p>
        </div>
      </div>

      {/* Step checklist */}
      <div className="mb-8 flex w-full max-w-xs flex-col gap-3">
        {BOOT_STEPS.map((step, i) => (
          <StepRow key={step.id} step={step} state={stepStates[step.id] ?? 'pending'} />
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="mb-2 flex items-center justify-between text-[10px] text-white/30">
          <span>Loading</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Version */}
      <p className="absolute bottom-6 text-[10px] text-white/20">
        v0.1.0-alpha · thekoushikdurgas.ai
      </p>

      {/* Keyframes */}
      <style>{`
        @keyframes boot-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50%       { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
        }
        @keyframes boot-icon-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
