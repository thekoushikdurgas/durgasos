'use client';

import { cn } from '@/lib/utils';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface Character {
  id?: string | number;
  emoji: string;
  name: string;
  online: boolean;
  backgroundColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientColors?: string;
  avatar?: string;
}

export interface MessageDockProps {
  characters?: Character[];
  onMessageSend?: (message: string, character: Character, characterIndex: number) => void;
  onCharacterSelect?: (character: Character, characterIndex: number) => void;
  onDockToggle?: (isExpanded: boolean) => void;
  className?: string;
  expandedWidth?: number;
  /** `inline`: parent positions the dock (e.g. flex row). `fixed-center`: centered fixed pill. */
  dockLayout?: 'inline' | 'fixed-center';
  position?: 'bottom' | 'top';
  showSparkleButton?: boolean;
  showMenuButton?: boolean;
  enableAnimations?: boolean;
  animationDuration?: number;
  placeholder?: (characterName: string) => string;
  theme?: 'light' | 'dark' | 'auto';
  autoFocus?: boolean;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  closeOnSend?: boolean;
}

/** Demo personas for the avatar strip (sparkle control is separate UI, not in this list). */
export const DEFAULT_MESSAGE_DOCK_CHARACTERS: Character[] = [
  {
    emoji: '🧙‍♂️',
    name: 'Wizard',
    online: true,
    backgroundColor: 'bg-emerald-600/35 ring-1 ring-white/20',
    gradientColors: '#059669, #0f766e',
  },
  {
    emoji: '🦄',
    name: 'Unicorn',
    online: true,
    backgroundColor: 'bg-fuchsia-600/35 ring-1 ring-white/20',
    gradientColors: '#c026d3, #701a75',
  },
  {
    emoji: '🐵',
    name: 'Monkey',
    online: true,
    backgroundColor: 'bg-amber-500/35 ring-1 ring-white/20',
    gradientColors: '#d97706, #78350f',
  },
  {
    emoji: '🤖',
    name: 'Robot',
    online: false,
    backgroundColor: 'bg-rose-600/35 ring-1 ring-white/20',
    gradientColors: '#e11d48, #881337',
  },
];

const getGradientColors = (character: Character) => {
  return character.gradientColors || '#06b6d4, #1e3a8a';
};

/** Stable references so Framer Motion does not re-run the entrance spring on unrelated parent re-renders. */
const MESSAGE_DOCK_CONTAINER_VARIANTS_FULL: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8,
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const MESSAGE_DOCK_CONTAINER_VARIANTS_REDUCED: Variants = {
  hidden: { opacity: 0, y: 0, scale: 1 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0 },
  },
};

export function MessageDock({
  characters = DEFAULT_MESSAGE_DOCK_CHARACTERS,
  onMessageSend,
  onCharacterSelect,
  onDockToggle,
  className,
  expandedWidth = 448,
  dockLayout = 'inline',
  position = 'bottom',
  showSparkleButton = true,
  showMenuButton = true,
  enableAnimations = true,
  animationDuration = 1,
  placeholder = (name: string) => `Message ${name}…`,
  theme = 'dark',
  autoFocus = true,
  closeOnClickOutside = true,
  closeOnEscape = true,
  closeOnSend = true,
}: MessageDockProps) {
  const shouldReduceMotion = useReducedMotion();
  const [expandedCharacter, setExpandedCharacter] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const dockRef = useRef<HTMLDivElement>(null);
  const characterButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [collapsedWidth, setCollapsedWidth] = useState(280);
  const [hasInitialized, setHasInitialized] = useState(false);
  const inputId = useId();

  const isDark = theme === 'dark' || theme === 'auto';

  useEffect(() => {
    if (dockRef.current && !hasInitialized) {
      const width = dockRef.current.offsetWidth;
      if (width > 0) {
        setCollapsedWidth(width);
        setHasInitialized(true);
      }
    }
  }, [hasInitialized]);

  const focusCharacterTrigger = useCallback((index: number | null) => {
    if (index === null) return;
    requestAnimationFrame(() => characterButtonRefs.current[index]?.focus());
  }, []);

  const collapse = useCallback(
    (returnFocusIndex: number | null) => {
      setExpandedCharacter(null);
      setMessageInput('');
      onDockToggle?.(false);
      focusCharacterTrigger(returnFocusIndex);
    },
    [focusCharacterTrigger, onDockToggle]
  );

  useEffect(() => {
    if (!closeOnClickOutside || expandedCharacter === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        collapse(expandedCharacter);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeOnClickOutside, collapse, expandedCharacter]);

  const containerVariants = shouldReduceMotion
    ? MESSAGE_DOCK_CONTAINER_VARIANTS_REDUCED
    : MESSAGE_DOCK_CONTAINER_VARIANTS_FULL;

  const hoverAnimation = shouldReduceMotion
    ? { scale: 1.02 }
    : {
        scale: 1.06,
        y: -6,
        transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
      };

  const handleCharacterClick = (index: number) => {
    const character = characters[index];

    if (expandedCharacter === index) {
      collapse(index);
    } else {
      setExpandedCharacter(index);
      onCharacterSelect?.(character, index);
      onDockToggle?.(true);
    }
  };

  const handleSendMessage = () => {
    if (messageInput.trim() && expandedCharacter !== null) {
      const character = characters[expandedCharacter];
      onMessageSend?.(messageInput, character, expandedCharacter);
      setMessageInput('');
      if (closeOnSend) {
        collapse(expandedCharacter);
      }
    }
  };

  const selectedCharacter =
    expandedCharacter !== null ? (characters[expandedCharacter] ?? null) : null;
  const isExpanded = expandedCharacter !== null;

  const positionClasses =
    dockLayout === 'fixed-center'
      ? position === 'top'
        ? 'fixed left-1/2 top-6 z-[55] -translate-x-1/2'
        : 'fixed bottom-6 left-1/2 z-[55] -translate-x-1/2'
      : 'relative z-[55]';

  const shellBorder = isDark ? 'border-white/20' : 'border-gray-200/50';
  const sepClass = isDark ? 'bg-white/15' : 'bg-gray-300';
  const ink = isDark ? 'text-slate-100' : 'text-gray-700';
  const mutedInk = isDark ? 'text-slate-400' : 'text-gray-600';
  const strokeIcon = isDark ? 'text-slate-300' : 'text-gray-600';

  const collapsedBg = isDark ? 'rgba(15, 23, 42, 0.72)' : '#ffffff';

  return (
    <motion.div
      ref={dockRef}
      className={cn(positionClasses, className)}
      initial={enableAnimations ? 'hidden' : 'visible'}
      animate="visible"
      variants={enableAnimations ? containerVariants : undefined}
    >
      <motion.div
        className={cn(
          'rounded-full px-3 py-2 shadow-2xl backdrop-blur-2xl',
          shellBorder,
          'border bg-white/10'
        )}
        animate={{
          width: isExpanded ? expandedWidth : collapsedWidth,
          background:
            isExpanded && selectedCharacter
              ? `linear-gradient(to right, ${getGradientColors(selectedCharacter)})`
              : collapsedBg,
        }}
        transition={
          enableAnimations
            ? {
                type: 'spring' as const,
                stiffness: isExpanded ? 300 : 500,
                damping: isExpanded ? 30 : 35,
                mass: isExpanded ? 0.8 : 0.6,
                background: {
                  duration: 0.2 * animationDuration,
                  ease: 'easeInOut',
                },
              }
            : { duration: 0 }
        }
      >
        <div className="relative flex items-center gap-2">
          {showSparkleButton && (
            <motion.div
              className="flex items-center justify-center"
              animate={{
                opacity: isExpanded ? 0 : 1,
                x: isExpanded ? -16 : 0,
                scale: isExpanded ? 0.85 : 1,
                pointerEvents: isExpanded ? 'none' : 'auto',
              }}
              transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
            >
              <motion.button
                type="button"
                className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                whileHover={
                  !isExpanded
                    ? {
                        scale: 1.04,
                        y: -2,
                        transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
                      }
                    : undefined
                }
                whileTap={{ scale: 0.95 }}
                aria-label="Quick sparkle"
              >
                <span className="text-2xl" aria-hidden>
                  ✨
                </span>
              </motion.button>
            </motion.div>
          )}

          <motion.div
            className={cn('-ml-2 mr-2 h-6 w-px', sepClass)}
            animate={{ opacity: isExpanded ? 0 : 1, scaleY: isExpanded ? 0 : 1 }}
            transition={{
              type: 'spring' as const,
              stiffness: 300,
              damping: 30,
              delay: isExpanded ? 0 : 0.2,
            }}
            aria-hidden
          />

          {characters.map((character, index) => {
            const isSelected = expandedCharacter === index;

            return (
              <motion.div
                key={character.id ?? `${character.name}-${index}`}
                className={cn('relative', isSelected && isExpanded && 'absolute left-1 top-1 z-20')}
                style={{
                  width: isSelected && isExpanded ? 0 : 'auto',
                  minWidth: isSelected && isExpanded ? 0 : 'auto',
                  overflow: 'visible',
                }}
                animate={{
                  opacity: isExpanded && !isSelected ? 0 : 1,
                  y: isExpanded && !isSelected ? 48 : 0,
                  scale: isExpanded && !isSelected ? 0.82 : 1,
                  x: 0,
                }}
                transition={{
                  type: 'spring' as const,
                  stiffness: 400,
                  damping: 30,
                  delay: isExpanded && !isSelected ? index * 0.04 : isExpanded ? 0.08 : 0,
                }}
              >
                <motion.button
                  type="button"
                  ref={(el) => {
                    characterButtonRefs.current[index] = el;
                  }}
                  className={cn(
                    'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50',
                    isSelected && isExpanded
                      ? 'bg-white/90 ring-2 ring-white/40'
                      : (character.backgroundColor ?? 'bg-white/15 ring-1 ring-white/15')
                  )}
                  onClick={() => handleCharacterClick(index)}
                  whileHover={!isExpanded ? hoverAnimation : { scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={`Message ${character.name}`}
                  aria-pressed={isSelected && isExpanded}
                >
                  <span className="text-2xl" aria-hidden>
                    {character.emoji}
                  </span>
                  {character.online && (
                    <motion.div
                      className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400"
                      initial={{ scale: 0 }}
                      animate={{ scale: isExpanded && !isSelected ? 0 : 1 }}
                      transition={{
                        delay: isExpanded ? (isSelected ? 0.25 : 0) : index * 0.08 + 0.35,
                        type: 'spring' as const,
                        stiffness: 500,
                        damping: 30,
                      }}
                      aria-hidden
                    />
                  )}
                </motion.button>
              </motion.div>
            );
          })}

          <AnimatePresence>
            {isExpanded && (
              <motion.input
                id={inputId}
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                  if (e.key === 'Escape' && closeOnEscape) {
                    e.preventDefault();
                    collapse(expandedCharacter);
                  }
                }}
                placeholder={placeholder(selectedCharacter?.name || '')}
                className={cn(
                  'absolute left-14 right-12 z-50 w-[min(300px,calc(100%-7rem))] border-none bg-transparent text-sm font-medium outline-none focus-visible:ring-0',
                  ink,
                  isDark ? 'placeholder:text-slate-400' : 'placeholder:text-gray-600'
                )}
                autoFocus={autoFocus}
                initial={{ opacity: 0, x: 16 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: { delay: 0.15, type: 'spring' as const, stiffness: 400, damping: 30 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.1, ease: 'easeOut' },
                }}
              />
            )}
          </AnimatePresence>

          <motion.div
            className={cn('-mr-2 ml-2 h-6 w-px', sepClass)}
            animate={{ opacity: isExpanded ? 0 : 1, scaleY: isExpanded ? 0 : 1 }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
            aria-hidden
          />

          {showMenuButton && (
            <motion.div
              className={cn(
                'z-20 flex items-center justify-center',
                isExpanded && 'absolute right-0'
              )}
              transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
            >
              <AnimatePresence mode="wait">
                {!isExpanded ? (
                  <motion.button
                    key="menu"
                    type="button"
                    className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                    whileHover={{
                      scale: 1.04,
                      y: -2,
                      transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
                    }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Message dock menu"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={strokeIcon}
                      aria-hidden
                    >
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  </motion.button>
                ) : (
                  <motion.button
                    key="send"
                    type="button"
                    onClick={handleSendMessage}
                    className="relative z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/90 outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-cyan-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    disabled={!messageInput.trim()}
                    aria-label="Send message"
                    initial={{ opacity: 0, scale: 0, rotate: -90 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotate: 0,
                      transition: {
                        delay: 0.2,
                        type: 'spring' as const,
                        stiffness: 400,
                        damping: 30,
                      },
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0,
                      rotate: 90,
                      transition: { duration: 0.1, ease: 'easeIn' },
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={mutedInk}
                      aria-hidden
                    >
                      <path d="m22 2-7 20-4-9-9-4z" />
                      <path d="M22 2 11 13" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
