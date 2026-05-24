'use client';

import {
  ArrowLeft,
  LayoutGrid,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { useCallback, useEffect, useState, useMemo } from 'react';

import {
  DraggableContainer,
  GridBody,
  GridItem,
  type InfiniteDragVariant,
} from '@/components/ui/infinite-drag-scroll';
import { cn } from '@/lib/utils';
import { SpringBox } from '@/components/motion/SpringBox';
import { Presence } from '@/components/motion/PresenceList';
import { usePointerDragSpring } from '@/components/motion/use-pointer-drag-spring';

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
  const [selectedImageId, setSelectedImageId] = useState<string | null>(() =>
    initialImageId ? initialImageId : null
  );
  const [zoom, setZoom] = useState<number>(1);

  const activeImage = useMemo(() => {
    if (!selectedImageId) return null;
    return images.find((img) => img.id === selectedImageId || img.src === selectedImageId) ?? null;
  }, [selectedImageId, images]);

  const selectImage = useCallback((image: GalleryInfiniteImage | null) => {
    setSelectedImageId(image?.id ?? null);
    setZoom(1);
  }, []);

  // Spring physics for pointer dragging when zoomed in
  const {
    style: dragStyle,
    dragHandlers,
    setPosition,
    dragging,
  } = usePointerDragSpring({ x: 0, y: 0 });

  // Reset panning offset when zoom resets or active image changes
  useEffect(() => {
    if (zoom === 1) {
      setPosition(0, 0);
    }
  }, [zoom, setPosition, activeImage]);

  const currentIndex = useMemo(() => {
    if (!activeImage) return -1;
    return images.findIndex((img) => img.id === activeImage.id);
  }, [activeImage, images]);

  const handlePrev = useCallback(() => {
    if (images.length === 0) return;
    if (!activeImage) {
      selectImage(images[0]!);
      return;
    }
    const idx = images.findIndex((img) => img.id === activeImage.id);
    selectImage(idx > 0 ? images[idx - 1]! : images[images.length - 1]!);
  }, [images, activeImage, selectImage]);

  const handleNext = useCallback(() => {
    if (images.length === 0) return;
    if (!activeImage) {
      selectImage(images[0]!);
      return;
    }
    const idx = images.findIndex((img) => img.id === activeImage.id);
    selectImage(idx < images.length - 1 ? images[idx + 1]! : images[0]!);
  }, [images, activeImage, selectImage]);

  const handleDoubleToggleZoom = useCallback(() => {
    setZoom((z) => (z > 1 ? 1 : 2));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.5, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.5, 1));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeImage) {
          selectImage(null);
        } else {
          onBack();
        }
      } else if (e.key === 'ArrowLeft' && activeImage) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && activeImage) {
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack, activeImage, handlePrev, handleNext, selectImage]);

  const toggleVariant = useCallback(() => {
    setVariant((v) => (v === 'polaroid' ? 'masonry' : 'polaroid'));
  }, []);

  const zoomMapStyle = useCallback(
    (s: Record<string, number>) => ({
      transform: `translate3d(${s.x ?? 0}px, ${s.y ?? 0}px, 0) scale(${zoom})`,
      cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
    }),
    [zoom, dragging]
  );

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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Grid Header */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950/90 px-3 py-2 z-10">
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

      {/* Infinite Grid View */}
      <div className="min-h-0 flex-1 relative">
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
                    'relative h-44 w-28 sm:h-64 sm:w-44 md:h-96 md:w-64 transition-shadow duration-300',
                    isInitial && 'ring-2 ring-cyan-400/80 ring-offset-2 ring-offset-[#0a0a0a]'
                  )}
                >
                  <div
                    onClick={() => selectImage(image)}
                    className="absolute inset-0 select-none cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover rounded-inherit"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </GridItem>
              );
            })}
          </GridBody>
        </DraggableContainer>
      </div>

      {/* Lightbox / Image Detail Overlay */}
      {activeImage && (
        <div className="absolute inset-0 z-40 flex flex-col bg-slate-950/95 backdrop-blur-xl transition-all duration-300 select-none">
          {/* Lightbox Header */}
          <header className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md shrink-0">
            <button
              type="button"
              onClick={() => selectImage(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Grid view
            </button>
            <div className="text-center min-w-0 flex-1 px-4">
              <h2 className="text-sm font-semibold text-white truncate max-w-md mx-auto">
                {activeImage.alt || 'Image Viewer'}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {currentIndex + 1} of {images.length}
              </p>
            </div>
            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                title="Zoom Out"
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-mono text-slate-300 min-w-[36px] text-center">
                {zoom.toFixed(1)}x
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                title="Zoom In"
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                disabled={zoom === 1}
                title="Reset Zoom"
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <span className="w-px h-4 bg-white/20 mx-1" />
              <button
                type="button"
                onClick={() => selectImage(null)}
                title="Close"
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-red-500/20 hover:text-red-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          {/* Lightbox Center Image Viewport */}
          <div className="relative flex-1 min-h-0 flex items-center justify-center p-4 bg-slate-950/20 overflow-hidden">
            {/* Prev Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-4 z-10 rounded-full border border-white/10 bg-slate-950/40 p-3 text-white backdrop-blur-md hover:bg-slate-900/60 hover:scale-105 active:scale-95 transition-all shadow-lg"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Main Interactive Zoom / Drag Container */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <Presence
                show={true}
                presenceKey={activeImage.id}
                enterStyle={{ opacity: 0, scale: 0.95 }}
                leaveStyle={{ opacity: 0, scale: 0.95 }}
                targetStyle={{ opacity: 1, scale: 1 }}
              >
                <SpringBox
                  style={dragStyle}
                  mapStyle={zoomMapStyle}
                  className="relative select-none will-change-transform max-h-full max-w-full flex items-center justify-center"
                  onDoubleClick={handleDoubleToggleZoom}
                  {...(zoom > 1 ? dragHandlers : {})}
                >
                  {variant === 'polaroid' ? (
                    <div className="bg-white p-3 sm:p-4 pb-14 sm:pb-16 shadow-2xl rounded-sm flex flex-col items-center border border-slate-200 border-b-[40px] border-b-white select-none">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeImage.src}
                        alt={activeImage.alt}
                        className="max-h-[50vh] sm:max-h-[58vh] max-w-full object-contain pointer-events-none select-none rounded-sm"
                        draggable={false}
                      />
                      <div className="absolute bottom-3 text-center w-full px-2">
                        <span className="font-mono text-[10px] sm:text-xs text-slate-700 tracking-wider font-semibold truncate block max-w-full">
                          {activeImage.alt || 'Snapshot'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={activeImage.src}
                      alt={activeImage.alt}
                      className="max-h-[66vh] sm:max-h-[72vh] max-w-full rounded-lg shadow-2xl object-contain border border-white/10 pointer-events-none select-none"
                      draggable={false}
                    />
                  )}
                </SpringBox>
              </Presence>
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-4 z-10 rounded-full border border-white/10 bg-slate-950/40 p-3 text-white backdrop-blur-md hover:bg-slate-900/60 hover:scale-105 active:scale-95 transition-all shadow-lg"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Lightbox Bottom Thumbnail Bar */}
          <div className="shrink-0 border-t border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
            <div className="flex gap-2 overflow-x-auto py-1 justify-start md:justify-center scrollbar-thin scrollbar-thumb-white/20 select-none">
              {images.map((img, idx) => {
                const isActive = img.id === activeImage.id;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => selectImage(img)}
                    className={cn(
                      'relative h-12 w-16 sm:h-14 sm:w-20 shrink-0 overflow-hidden border-2 transition-all duration-300 focus:outline-none',
                      variant === 'polaroid'
                        ? 'bg-white p-0.5 pb-2 shadow border-slate-200 rounded-sm'
                        : 'rounded-md',
                      variant === 'polaroid' && (idx % 2 === 0 ? '-rotate-3' : 'rotate-3'),
                      isActive
                        ? variant === 'polaroid'
                          ? 'border-cyan-400 scale-110 rotate-0 shadow-lg'
                          : 'border-cyan-400 scale-110 shadow-lg'
                        : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="h-full w-full object-cover pointer-events-none select-none rounded-inherit"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
