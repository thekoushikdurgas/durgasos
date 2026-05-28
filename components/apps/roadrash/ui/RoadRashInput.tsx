'use client';

import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function RoadRashInput({ className, ...props }: InputProps) {
  return (
    <Input
      className={cn(
        'rr-panel-3d rounded-xl bg-slate-950/60 border-white/10 text-sm',
        'focus-visible:ring-rose-500/50 focus-visible:border-rose-500/40',
        className
      )}
      {...props}
    />
  );
}
