'use client';

import { ArrowLeft, LayoutGrid, ImageIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  DraggableContainer,
  GridBody,
  GridItem,
  type InfiniteDragVariant,
} from '@/components/ui/infinite-drag-scroll';
import { cn } from '@/lib/utils';

export type GalleryInfiniteImage = {
  id: string;
  src: string;
  alt: string;
};

export type GalleryInfiniteViewerProps = {
  images: GalleryInfiniteImage[];
  initialImageId?: string;
  variant?: InfiniteDragVariant;
  onBack: () => void;
};

export function GalleryInfiniteViewer({
  images,
  initialImageId,
  variant: initialVariant = 'masonry',
  onBack,
}: GalleryInfiniteViewerProps) {
  const [variant, setVariant] = useState<InfiniteDragVariant>(initialVariant);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const toggleVariant = useCallback(() => {
    setVariant((v) => (v === 'polaroid' ? 'masonry' : 'polaroid'));
  }, []);

  if (images.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center">
        <ImageIcon className="h-12 w-12 text-slate-500" aria-hidden />
        <p className="max-w-sm text-sm text-slate-400">No images to show in this view.</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a]">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950/90 px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-slate-100 hover:bg-white/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">Photos</h1>
        <button
          type="button"
          onClick={toggleVariant}
          title={variant === 'polaroid' ? 'Switch to masonry' : 'Switch to polaroid'}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium',
            variant === 'polaroid'
              ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
              : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
          {variant === 'polaroid' ? 'Polaroid' : 'Masonry'}
        </button>
      </header>

      <div className="min-h-0 flex-1">
        <DraggableContainer variant={variant}>
          <GridBody>
            {images.map((image) => {
              const isInitial =
                Boolean(initialImageId) &&
                (image.id === initialImageId || image.src === initialImageId);
              return (
                <GridItem
                  key={image.id}
                  className={cn(
                    'relative h-44 w-28 sm:h-64 sm:w-44 md:h-96 md:w-64',
                    isInitial && 'ring-2 ring-cyan-400/80 ring-offset-2 ring-offset-[#0a0a0a]'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </GridItem>
              );
            })}
          </GridBody>
        </DraggableContainer>
      </div>
    </div>
  );
}
