'use client';

import * as React from 'react';

import { SpringTabIndicator } from '@/components/motion/SpringTabIndicator';
import { cn } from '@/lib/utils';

export type TabsVariant = 'default' | 'underline' | 'pill';

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  variant: TabsVariant;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error(`${component} must be used within <Tabs>`);
  return ctx;
}

export type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  variant?: TabsVariant;
};

export function Tabs({
  value,
  onValueChange,
  children,
  className,
  variant = 'default',
}: TabsProps) {
  const contextValue = React.useMemo(
    () => ({ value, onValueChange, variant }),
    [value, onValueChange, variant]
  );
  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn('flex flex-col gap-2', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export function TabsList({ className, onKeyDown, children, ...props }: TabsListProps) {
  const { variant } = useTabsContext('TabsList');
  const listRef = React.useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const root = listRef.current;
    if (!root) {
      onKeyDown?.(e);
      return;
    }
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]')).filter(
      (b) => !b.disabled
    );
    if (tabs.length === 0) {
      onKeyDown?.(e);
      return;
    }
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = tabs[(i + 1 + tabs.length) % tabs.length];
      next?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = tabs[(i - 1 + tabs.length) % tabs.length];
      prev?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      tabs[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      tabs[tabs.length - 1]?.focus();
    }
    onKeyDown?.(e);
  };

  const showIndicator = variant === 'underline' || variant === 'pill';

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        'relative inline-flex items-center justify-start gap-1',
        variant === 'default' &&
          'h-9 rounded-xl border border-white/10 bg-white/5 p-1 shadow-sm backdrop-blur-md',
        variant === 'underline' && 'h-10 gap-0 border-b border-white/15 bg-transparent p-0',
        variant === 'pill' &&
          'h-10 rounded-full border border-white/10 bg-white/5 p-1 shadow-sm backdrop-blur-md',
        className
      )}
      {...props}
    >
      {showIndicator ? (
        <SpringTabIndicator
          containerRef={listRef}
          activeSelector={`[role="tab"][aria-selected="true"]`}
          className={
            variant === 'underline'
              ? '!top-auto h-0.5 bg-[var(--color-accent-primary,#3b82f6)]'
              : 'rounded-full bg-[var(--color-accent-primary,#3b82f6)]/25 shadow-[0_0_12px_rgba(59,130,246,0.35)]'
          }
        />
      ) : null}
      {children}
    </div>
  );
}

export type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const { value: selected, onValueChange, variant } = useTabsContext('TabsTrigger');
  const isSelected = selected === value;
  return (
    <button
      type="button"
      role="tab"
      tabIndex={isSelected ? 0 : -1}
      aria-selected={isSelected}
      className={cn(
        'rounded-lg px-3 py-1 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary,#3b82f6)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base,#050711)]',
        variant === 'default' &&
          (isSelected
            ? 'frost-glass-surface text-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'),
        variant === 'underline' &&
          cn(
            'rounded-none border-b-2 border-transparent px-4 py-2',
            isSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          ),
        variant === 'pill' &&
          cn(
            'rounded-full px-4 py-1.5',
            isSelected
              ? 'bg-[var(--color-accent-primary,#3b82f6)]/25 text-foreground shadow-[0_0_12px_rgba(59,130,246,0.35)]'
              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
          ),
        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    />
  );
}

export type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { value: selected } = useTabsContext('TabsContent');
  if (selected !== value) return null;
  return (
    <div
      role="tabpanel"
      className={cn(
        'rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-foreground shadow-sm backdrop-blur-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
