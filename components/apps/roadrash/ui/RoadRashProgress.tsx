'use client';

import { Progress, type ProgressProps } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type RoadRashProgressProps = ProgressProps & {
  label?: string;
  valueLabel?: string;
};

export function RoadRashProgress({
  className,
  label,
  valueLabel,
  ...props
}: RoadRashProgressProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {(label || valueLabel) && (
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
          {label ? <span>{label}</span> : <span />}
          {valueLabel ? <span>{valueLabel}</span> : null}
        </div>
      )}
      <Progress
        className={cn(
          'h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-amber-500',
          className
        )}
        {...props}
      />
    </div>
  );
}
