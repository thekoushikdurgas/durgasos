'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RoadRashButton({ className, variant, ...props }: ButtonProps) {
  const arcade = variant === 'default' || variant === undefined;
  return (
    <Button
      variant={variant}
      disableMotion
      className={cn(
        arcade && 'rr-btn-arcade',
        !arcade && 'rr-btn-3d rounded-xl font-bold tracking-wider uppercase',
        !arcade &&
          'bg-gradient-to-b from-rose-500 to-rose-700 text-white hover:from-rose-400 hover:to-rose-600 border border-rose-400/30',
        className
      )}
      {...props}
    />
  );
}
