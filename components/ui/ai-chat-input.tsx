'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { BrainCog, FolderCode, Globe, Mic, Paperclip, Send, Square } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';

import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

const PLACEHOLDERS = [
  'Ask anything about your desktop…',
  'Search the web, summarize, or plan your day',
  'What should Durgasos help you with?',
  'Draft a message or debug an idea',
  'Explain a concept in simple terms',
];

const EXPANDED_PLACEHOLDER = 'Type your message here…';

/** Max textarea height in px (matches ~max-h-60). */
const TEXTAREA_MAX_HEIGHT_PX = 240;

const AI_CHAT_GLASS_LAYOUT_ID = 'desktop-ai-chat-glass';

/** Shared layout morph between idle pill and expanded panel (skipped when reduced motion). */
const shellLayoutTransition = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 34,
  mass: 0.85,
};

export type AIChatSubmitPayload = {
  text: string;
  think: boolean;
  deepSearch: boolean;
};

export type AIChatInputProps = {
  className?: string;
  disabled?: boolean;
  /** While the assistant is streaming; shows Stop instead of Send. */
  streaming?: boolean;
  /** Stop generation (does not close WebSocket). */
  onStop?: () => void;
  /** Send message; Enter submits, Shift+Enter newline. Cleared after resolved promise. */
  onSubmit?: (payload: AIChatSubmitPayload) => void | Promise<void>;
};

export function AIChatInput({
  className,
  disabled = false,
  streaming = false,
  onStop,
  onSubmit,
}: AIChatInputProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [thinkActive, setThinkActive] = useState(false);
  const [deepSearchActive, setDeepSearchActive] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevExpandedRef = useRef(false);

  const expanded = isActive || Boolean(inputValue.trim());

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX);
    el.style.height = `${Math.max(next, 44)}px`;
  };

  useLayoutEffect(() => {
    if (expanded) resizeTextarea();
  }, [inputValue, expanded]);

  useEffect(() => {
    if (expanded || inputValue) return;

    const interval = setInterval(() => {
      setShowPlaceholder(false);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        setShowPlaceholder(true);
      }, 400);
    }, 3000);

    return () => clearInterval(interval);
  }, [expanded, inputValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        if (!inputValue.trim()) setIsActive(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue]);

  useEffect(() => {
    if (expanded && !prevExpandedRef.current) {
      queueMicrotask(() => textareaRef.current?.focus());
    }
    prevExpandedRef.current = expanded;
  }, [expanded]);

  const handleActivate = () => setIsActive(true);

  const placeholderContainerVariants = {
    initial: {},
    animate: { transition: { staggerChildren: 0.025 } },
    exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
  };

  const letterVariants = {
    initial: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 10,
    },
    animate: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        opacity: { duration: 0.25 },
        filter: { duration: 0.4 },
        y: { type: 'spring' as const, stiffness: 80, damping: 20 },
      },
    },
    exit: {
      opacity: 0,
      filter: 'blur(12px)',
      y: -10,
      transition: {
        opacity: { duration: 0.2 },
        filter: { duration: 0.3 },
        y: { type: 'spring' as const, stiffness: 80, damping: 20 },
      },
    },
  };

  const submit = async () => {
    const text = inputValue.trim();
    if (!text || disabled || streaming || !onSubmit) return;
    try {
      await onSubmit({
        text,
        think: thinkActive,
        deepSearch: deepSearchActive,
      });
      setInputValue('');
      setIsActive(false);
    } catch {
      /* parent may throw; keep input */
    }
  };

  const idleGlassVariant = reducedMotion ? 'frost' : 'liquid';
  const expandedGlassVariant = reducedMotion ? 'frost' : 'liquid';

  const iconBtnIdle =
    'shrink-0 rounded-full p-2.5 text-zinc-800/90 transition hover:bg-black/5 disabled:opacity-40';
  const toolbarIconBtn = cn(
    'rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-slate-200',
    'disabled:pointer-events-none disabled:opacity-40'
  );
  const toolbarIconActive = 'bg-cyan-500/20 text-cyan-100 outline outline-cyan-400/40';

  const enableShellLayoutMorph = !reducedMotion;
  const shellMotionProps = enableShellLayoutMorph
    ? ({
        layout: true as const,
        layoutId: AI_CHAT_GLASS_LAYOUT_ID,
        transition: shellLayoutTransition,
      } as const)
    : ({} as const);

  return (
    <div
      ref={wrapperRef}
      data-ai-chat-surface={expanded ? 'expanded' : 'idle'}
      className={cn('w-full max-w-3xl', className)}
    >
      <div className="w-full" onClick={!expanded ? handleActivate : undefined}>
        <LayoutGroup id="ai-chat-input-shell">
          <AnimatePresence initial={false} mode="popLayout">
            {!expanded ? (
              <motion.div
                key="idle"
                initial={false}
                className="overflow-hidden rounded-full"
                {...shellMotionProps}
              >
                <LiquidGlassSurface
                  variant={idleGlassVariant}
                className={cn(
                  'rounded-full border border-white/45 text-slate-900 shadow-[0_2px_14px_rgba(0,0,0,0.1)]',
                  idleGlassVariant === 'frost' &&
                    '!border-white/40 !bg-white/50 text-slate-900 backdrop-blur-xl'
                )}
                contentClassName="rounded-full"
                liquidFrostStyle={
                  idleGlassVariant === 'liquid'
                    ? { background: 'var(--color-ai-chat-idle-liquid-frost)' }
                    : undefined
                }
              >
                <div className="flex items-center gap-1 px-1.5 py-1.5 sm:px-2">
                  <button
                    className={iconBtnIdle}
                    type="button"
                    tabIndex={-1}
                    disabled
                    aria-disabled
                    title="Attach files (coming soon)"
                    aria-label="Attach files — coming soon"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Paperclip size={20} strokeWidth={1.75} aria-hidden />
                  </button>

                  <div className="relative min-h-[40px] min-w-0 flex-1">
                    <input
                      type="text"
                      value={inputValue}
                      disabled={disabled}
                      onChange={(e) => setInputValue(e.target.value)}
                      onFocus={handleActivate}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void submit();
                        }
                      }}
                      aria-label="AI assistant message"
                      title="Enter to send"
                      className={cn(
                        'relative z-[1] h-10 w-full rounded-md border-0 bg-transparent py-2 pr-2 pl-1',
                        'text-base font-normal text-slate-900 outline-none placeholder:text-transparent disabled:opacity-50'
                      )}
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-1 flex items-center">
                      <AnimatePresence mode="wait">
                        {showPlaceholder && !inputValue && (
                          <motion.span
                            key={placeholderIndex}
                            className="z-0 max-w-full select-none truncate text-slate-500"
                            variants={placeholderContainerVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                          >
                            {PLACEHOLDERS[placeholderIndex].split('').map((char, i) => (
                              <motion.span
                                key={i}
                                variants={letterVariants}
                                style={{ display: 'inline-block' }}
                              >
                                {char === ' ' ? '\u00A0' : char}
                              </motion.span>
                            ))}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <button
                    className={iconBtnIdle}
                    type="button"
                    tabIndex={-1}
                    disabled
                    aria-disabled
                    title="Voice input (coming soon)"
                    aria-label="Voice input — coming soon"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mic size={20} strokeWidth={1.75} aria-hidden />
                  </button>

                  {streaming && onStop ? (
                    <button
                      className="flex shrink-0 items-center justify-center rounded-full bg-amber-500 p-2.5 text-white transition hover:bg-amber-400"
                      type="button"
                      tabIndex={-1}
                      title="Stop generation"
                      aria-label="Stop generation"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStop();
                      }}
                    >
                      <Square size={18} className="fill-current" aria-hidden />
                    </button>
                  ) : (
                    <button
                      className="flex shrink-0 items-center justify-center rounded-full bg-zinc-900 p-2.5 text-white transition hover:bg-zinc-800 disabled:opacity-35"
                      type="button"
                      tabIndex={-1}
                      disabled={disabled || streaming || !inputValue.trim()}
                      title="Send message (Enter)"
                      aria-label="Send message"
                      onClick={(e) => {
                        e.stopPropagation();
                        void submit();
                      }}
                    >
                      <Send size={18} aria-hidden />
                    </button>
                  )}
                </div>
              </LiquidGlassSurface>
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={false}
                className="overflow-hidden rounded-3xl"
                {...shellMotionProps}
              >
                <LiquidGlassSurface
                  variant={expandedGlassVariant}
                className={cn(
                  'rounded-3xl border border-white/12 text-slate-100',
                  expandedGlassVariant === 'frost' &&
                    '!border-white/12 !bg-slate-950/75 backdrop-blur-xl'
                )}
                contentClassName="rounded-3xl"
                liquidFrostStyle={
                  expandedGlassVariant === 'liquid'
                    ? { background: 'var(--color-ai-chat-expanded-liquid-frost)' }
                    : undefined
                }
              >
                <div
                  className="flex flex-col gap-0 p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputValue}
                    disabled={disabled}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void submit();
                      }
                    }}
                    placeholder={EXPANDED_PLACEHOLDER}
                    aria-label="AI assistant message"
                    title="Enter to send · Shift+Enter for new line"
                    className={cn(
                      'max-h-[240px] min-h-[52px] w-full resize-none rounded-xl border-0 bg-transparent px-3 py-2.5',
                      'text-base leading-snug font-normal text-slate-100 outline-none placeholder:text-slate-500',
                      'disabled:opacity-50',
                      '[scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent]'
                    )}
                    onFocus={handleActivate}
                  />

                  <div className="flex items-center justify-between gap-2 border-t border-white/10 px-1 pt-1.5">
                    <div className="flex min-w-0 flex-1 items-center gap-0.5 sm:gap-1">
                      <button
                        className={toolbarIconBtn}
                        type="button"
                        tabIndex={-1}
                        disabled
                        aria-disabled
                        title="Attach files (coming soon)"
                        aria-label="Attach files — coming soon"
                      >
                        <Paperclip size={18} aria-hidden />
                      </button>
                      <button
                        className={cn(toolbarIconBtn, deepSearchActive && toolbarIconActive)}
                        type="button"
                        tabIndex={-1}
                        title="Use RAG / deep retrieval when available"
                        aria-label="Deep search — retrieval augmented generation"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeepSearchActive((a) => !a);
                        }}
                      >
                        <Globe size={18} aria-hidden />
                      </button>
                      <span className="mx-0.5 h-6 w-px shrink-0 bg-white/15" aria-hidden />
                      <button
                        className={cn(toolbarIconBtn, thinkActive && toolbarIconActive)}
                        type="button"
                        tabIndex={-1}
                        title="Reason step by step before answering (adds context for the model)"
                        aria-label="Think — step-by-step reasoning hint"
                        onClick={(e) => {
                          e.stopPropagation();
                          setThinkActive((a) => !a);
                        }}
                      >
                        <BrainCog size={18} aria-hidden />
                      </button>
                      <span className="mx-0.5 h-6 w-px shrink-0 bg-white/15" aria-hidden />
                      <button
                        className={cn(toolbarIconBtn, deepSearchActive && toolbarIconActive)}
                        type="button"
                        tabIndex={-1}
                        title="Project / code context — uses deep retrieval (RAG)"
                        aria-label="Project / code context — deep retrieval"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeepSearchActive((a) => !a);
                        }}
                      >
                        <FolderCode size={18} aria-hidden />
                      </button>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-900 transition hover:bg-white/90 disabled:opacity-40"
                        type="button"
                        tabIndex={-1}
                        disabled
                        aria-disabled
                        title="Voice input (coming soon)"
                        aria-label="Voice input — coming soon"
                      >
                        <Mic size={20} strokeWidth={1.75} aria-hidden />
                      </button>
                      {streaming && onStop ? (
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-white transition hover:bg-amber-500"
                          type="button"
                          tabIndex={-1}
                          title="Stop generation"
                          aria-label="Stop generation"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStop();
                          }}
                        >
                          <Square size={16} className="fill-current" aria-hidden />
                        </button>
                      ) : (
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition hover:bg-white disabled:opacity-40"
                          type="button"
                          tabIndex={-1}
                          disabled={disabled || streaming || !inputValue.trim()}
                          title="Send message (Enter)"
                          aria-label="Send message"
                          onClick={(e) => {
                            e.stopPropagation();
                            void submit();
                          }}
                        >
                          <Send size={17} aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </LiquidGlassSurface>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </div>
  );
}
