'use client';

import { cn } from '@/lib/utils';
import { Presence } from '@/components/motion/PresenceList';
import { SpringBox } from '@/components/motion/SpringBox';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { overlaySpring, pressSpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
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

function CharacterDockAvatar({
  character,
  index,
  isExpanded,
  isSelected,
  onClick,
  buttonRef,
}: {
  character: Character;
  index: number;
  isExpanded: boolean;
  isSelected: boolean;
  onClick: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const charStyle = useReducedMotionStyle(
    {
      opacity: isExpanded && !isSelected ? 0 : 1,
      y: isExpanded && !isSelected ? 48 : 0,
      scale: isExpanded && !isSelected ? 0.82 : 1,
    },
    pressSpring
  );

  return (
    <SpringBox
      className={cn('relative', isSelected && isExpanded && 'absolute left-1 top-1 z-20')}
      style={charStyle}
      mapStyle={(s) => ({
        width: isSelected && isExpanded ? 0 : 'auto',
        minWidth: isSelected && isExpanded ? 0 : 'auto',
        overflow: 'visible',
        opacity: s.opacity,
        transform: `translate3d(0, ${s.y ?? 0}px, 0) scale(${s.scale ?? 1})`,
      })}
    >
      <button
        type="button"
        ref={buttonRef}
        className={cn(
          'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-xl outline-none transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-400/50',
          !isExpanded && 'hover:-translate-y-1.5 hover:scale-110',
          isSelected && isExpanded
            ? 'bg-white/90 ring-2 ring-white/40'
            : (character.backgroundColor ?? 'bg-white/10 ring-1 ring-white/20')
        )}
        onClick={onClick}
        aria-label={`Message ${character.name}`}
        aria-pressed={isSelected && isExpanded ? true : false}
      >
        <span className="text-2xl" aria-hidden>
          {character.emoji}
        </span>
        {character.online && (
          <span
            className={cn(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400 transition-transform',
              isExpanded && !isSelected ? 'scale-0' : 'scale-100'
            )}
            aria-hidden
          />
        )}
      </button>
    </SpringBox>
  );
}

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
  const shouldReduceMotion = usePrefersReducedMotion();
  const [expandedCharacter, setExpandedCharacter] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const dockRef = useRef<HTMLDivElement>(null);
  const characterButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const inputId = useId();

  const isDark = theme === 'dark' || theme === 'auto';

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

  const rootStyle = useReducedMotionStyle(
    enableAnimations && !shouldReduceMotion
      ? { opacity: 1, y: 0, scale: 1 }
      : { opacity: 1, y: 0, scale: 1 },
    overlaySpring
  );
  const shellWidthStyle = useReducedMotionStyle(
    { width: isExpanded ? expandedWidth : 0 },
    pressSpring
  );

  const positionClasses =
    dockLayout === 'fixed-center'
      ? position === 'top'
        ? 'fixed left-1/2 top-6 z-[55] -translate-x-1/2'
        : 'fixed bottom-6 left-1/2 z-[55] -translate-x-1/2'
      : 'relative z-[55]';

  const sepClass = isDark ? 'bg-white/15' : 'bg-gray-300';
  const ink = isDark ? 'text-slate-100' : 'text-gray-700';
  const mutedInk = isDark ? 'text-slate-400' : 'text-gray-600';
  const strokeIcon = isDark ? 'text-slate-300' : 'text-gray-600';

  const shellBackground =
    isExpanded && selectedCharacter
      ? `linear-gradient(to right, ${getGradientColors(selectedCharacter)})`
      : undefined;

  return (
    <SpringBox
      className={cn(positionClasses, className)}
      defaultStyle={
        enableAnimations && !shouldReduceMotion ? { opacity: 0, y: 24, scale: 0.96 } : undefined
      }
      style={rootStyle}
      mapStyle={(s) => ({
        opacity: s.opacity,
        transform: `translate3d(0, ${s.y ?? 0}px, 0) scale(${s.scale ?? 1})`,
      })}
    >
      <div ref={dockRef}>
        <SpringBox
          className={cn('rounded-[50px]', !isExpanded && 'w-fit')}
          style={shellWidthStyle}
          mapStyle={(s) => ({
            width: isExpanded ? s.width : 'fit-content',
          })}
        >
          <LiquidGlassSurface
            variant="liquid"
            className={cn(
              'h-fit shrink-0 rounded-[50px] border border-white/20 px-[10px] transition-[background] duration-200',
              !isExpanded && 'w-fit',
              isExpanded && 'w-full min-w-0'
            )}
            style={shellBackground ? { background: shellBackground } : undefined}
            liquidFrostStyle={shellBackground ? { background: 'transparent' } : undefined}
            contentClassName="relative flex flex-row flex-nowrap items-center justify-center gap-[5px] py-[5px]"
          >
            {showSparkleButton && (
              <div
                className={cn(
                  'flex items-center justify-center transition-all duration-200',
                  isExpanded ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100'
                )}
              >
                <button
                  type="button"
                  className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full outline-none transition-transform hover:scale-105 hover:-translate-y-0.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                  aria-label="Quick sparkle"
                >
                  <span className="text-2xl" aria-hidden>
                    ✨
                  </span>
                </button>
              </div>
            )}

            <div
              className={cn(
                'mx-0.5 h-10 w-px shrink-0 origin-center transition-all duration-200',
                sepClass,
                isExpanded ? 'scale-x-0 opacity-0' : 'scale-x-100 opacity-100'
              )}
              aria-hidden
            />

            <div className="flex flex-row flex-nowrap items-center justify-center gap-[5px]">
              {characters.map((character, index) => {
                const isSelected = expandedCharacter === index;

                return (
                  <CharacterDockAvatar
                    key={character.id ?? `${character.name}-${index}`}
                    character={character}
                    index={index}
                    isExpanded={isExpanded}
                    isSelected={isSelected}
                    onClick={() => handleCharacterClick(index)}
                    buttonRef={(el) => {
                      characterButtonRefs.current[index] = el;
                    }}
                  />
                );
              })}
            </div>

            <Presence show={isExpanded} presenceKey="dock-input">
              <input
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
              />
            </Presence>

            <div
              className={cn(
                'mx-0.5 h-10 w-px shrink-0 origin-center transition-all duration-200',
                sepClass,
                isExpanded ? 'scale-x-0 opacity-0' : 'scale-x-100 opacity-100'
              )}
              aria-hidden
            />

            {showMenuButton && (
              <div
                className={cn(
                  'z-20 flex items-center justify-center',
                  isExpanded && 'absolute right-0'
                )}
              >
                <Presence show={!isExpanded} presenceKey="menu">
                  <button
                    type="button"
                    className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full outline-none transition-transform hover:scale-105 hover:-translate-y-0.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                    aria-label="Message dock menu"
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
                  </button>
                </Presence>
                <Presence show={isExpanded} presenceKey="send">
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="relative z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/90 outline-none transition-transform hover:scale-110 active:scale-95 hover:bg-white focus-visible:ring-2 focus-visible:ring-cyan-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!messageInput.trim()}
                    aria-label="Send message"
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
                  </button>
                </Presence>
              </div>
            )}
          </LiquidGlassSurface>
        </SpringBox>
      </div>
    </SpringBox>
  );
}
