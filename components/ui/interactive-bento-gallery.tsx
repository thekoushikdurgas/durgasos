'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface MediaItemType {
  id: string;
  type: 'image' | 'video';
  title: string;
  desc: string;
  url: string;
  span: string;
}

const MediaItem = ({
  item,
  className,
  onClick,
}: {
  item: MediaItemType;
  className?: string;
  onClick?: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  useEffect(() => {
    if (item.type !== 'video') return;
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setIsInView(entry.isIntersecting));
      },
      { root: null, rootMargin: '50px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.type, item.url]);

  useEffect(() => {
    if (item.type !== 'video') return;
    let mounted = true;
    const el = videoRef.current;
    if (!el) return;

    const handleVideoPlay = async () => {
      if (!isInView || !mounted) return;
      try {
        if (el.readyState >= 3) {
          setIsBuffering(false);
          await el.play();
        } else {
          setIsBuffering(true);
          await new Promise<void>((resolve) => {
            el.oncanplay = () => resolve();
          });
          if (mounted) {
            setIsBuffering(false);
            await el.play();
          }
        }
      } catch {
        /* autoplay restrictions */
      }
    };

    if (isInView) {
      void handleVideoPlay();
    } else {
      el.pause();
    }

    return () => {
      mounted = false;
      el.pause();
    };
  }, [isInView, item.type]);

  if (item.type === 'video') {
    return (
      <div className={`${className ?? ''} relative overflow-hidden`}>
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          onClick={onClick}
          playsInline
          muted
          loop
          preload="metadata"
          style={{
            opacity: isBuffering ? 0.8 : 1,
            transition: 'opacity 0.2s',
            transform: 'translateZ(0)',
            willChange: 'transform',
          }}
        >
          <source src={item.url} type="video/mp4" />
        </video>
        {isBuffering ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt={item.title}
      className={`${className ?? ''} cursor-pointer object-cover`}
      onClick={onClick}
      loading="lazy"
      decoding="async"
    />
  );
};

function GalleryModal({
  selectedItem,
  onClose,
  setSelectedItem,
  mediaItems,
}: {
  selectedItem: MediaItemType;
  onClose: () => void;
  setSelectedItem: (item: MediaItemType | null) => void;
  mediaItems: MediaItemType[];
}) {
  const [dockPosition, setDockPosition] = useState({ x: 0, y: 0 });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-40 flex min-h-0 flex-col overflow-hidden rounded-lg bg-slate-950/92 backdrop-blur-lg"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-900/40 p-2 sm:p-3 md:p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedItem.id}
              className="relative aspect-video h-auto max-h-[min(70vh,520px)] w-full max-w-[95%] overflow-hidden rounded-lg shadow-lg sm:max-w-[85%] md:max-w-3xl"
              initial={{ y: 20, scale: 0.97 }}
              animate={{
                y: 0,
                scale: 1,
                transition: { type: 'spring', stiffness: 500, damping: 30, mass: 0.5 },
              }}
              exit={{ y: 20, scale: 0.97, transition: { duration: 0.15 } }}
              onClick={onClose}
            >
              <MediaItem
                item={selectedItem}
                className="h-full w-full bg-slate-900/30 object-contain"
                onClick={onClose}
              />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 sm:p-3 md:p-4">
                <h3 className="text-base font-semibold text-white sm:text-lg md:text-xl">
                  {selectedItem.title}
                </h3>
                <p className="mt-1 text-xs text-white/80 sm:text-sm">{selectedItem.desc}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.button
          type="button"
          className="absolute top-2 right-2 z-10 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25 sm:top-2.5 sm:right-2.5 md:top-3 md:right-3"
          onClick={onClose}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </motion.button>
      </div>

      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        initial={false}
        animate={{ x: dockPosition.x, y: dockPosition.y }}
        onDragEnd={(_, info) => {
          setDockPosition((prev) => ({
            x: prev.x + info.offset.x,
            y: prev.y + info.offset.y,
          }));
        }}
        className="pointer-events-auto shrink-0 pb-3 touch-none md:pb-4"
      >
        <motion.div className="relative mx-auto w-max cursor-grab rounded-xl border border-cyan-400/25 bg-cyan-500/15 shadow-lg backdrop-blur-xl active:cursor-grabbing">
          <div className="-space-x-2 flex items-center px-3 py-2">
            {mediaItems.map((item, index) => (
              <motion.div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                }}
                style={{
                  zIndex: selectedItem.id === item.id ? 30 : mediaItems.length - index,
                }}
                className={cn(
                  'relative flex h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg sm:h-10 sm:w-10 md:h-11 md:w-11',
                  selectedItem.id === item.id
                    ? 'shadow-lg ring-2 ring-white/70'
                    : 'hover:z-20 hover:ring-2 hover:ring-white/30'
                )}
                initial={{ rotate: index % 2 === 0 ? -15 : 15 }}
                animate={{
                  scale: selectedItem.id === item.id ? 1.15 : 1,
                  rotate: selectedItem.id === item.id ? 0 : index % 2 === 0 ? -15 : 15,
                  y: selectedItem.id === item.id ? -8 : 0,
                }}
                whileHover={{
                  scale: 1.25,
                  rotate: 0,
                  y: -10,
                  transition: { type: 'spring', stiffness: 400, damping: 25 },
                }}
              >
                <MediaItem
                  item={item}
                  className="h-full w-full"
                  onClick={() => setSelectedItem(item)}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-white/20" />
                {selectedItem.id === item.id ? (
                  <motion.div
                    layoutId="activeGlow"
                    className="absolute -inset-2 bg-white/20 blur-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                ) : null}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export const BENTO_SPAN_PRESETS = [
  'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2',
  'md:col-span-2 md:row-span-2 sm:col-span-2 sm:row-span-2',
  'md:col-span-1 md:row-span-3 sm:col-span-2 sm:row-span-2',
  'md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2',
  'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2',
  'md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2',
  'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2',
];

export type InteractiveBentoGalleryProps = {
  mediaItems: MediaItemType[];
  title: string;
  description: string;
  onBack?: () => void;
};

/** Remount when resolved URLs / list changes so grid state stays in sync without setState in an effect. */
export function InteractiveBentoGallery(props: InteractiveBentoGalleryProps) {
  const resetKey = useMemo(
    () => props.mediaItems.map((m) => `${m.id}:${m.url}`).join('|'),
    [props.mediaItems]
  );
  return <InteractiveBentoGalleryInner key={resetKey} {...props} />;
}

function InteractiveBentoGalleryInner({
  mediaItems,
  title,
  description,
  onBack,
}: InteractiveBentoGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItemType | null>(null);
  const [items, setItems] = useState(mediaItems);
  const [isDragging, setIsDragging] = useState(false);

  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              Overview
            </button>
          ) : null}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="truncate text-sm font-semibold text-slate-100 sm:text-base">{title}</h2>
            <p className="truncate text-xs text-slate-400">{description}</p>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4">
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <GalleryModal
                key="lightbox"
                selectedItem={selectedItem}
                onClose={() => setSelectedItem(null)}
                setSelectedItem={setSelectedItem}
                mediaItems={items}
              />
            ) : (
              <motion.div
                key="grid"
                className="grid auto-rows-[60px] grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-4"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
                }}
              >
                {items.length === 0 ? (
                  <div className="col-span-full flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-900/40 px-4 py-12 text-center sm:col-span-3 md:col-span-4">
                    <p className="text-sm text-slate-400">
                      No images or videos in this folder yet.
                    </p>
                    <p className="mt-2 max-w-sm text-xs text-slate-500">
                      Upload media to your workspace storage to see it here.
                    </p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layoutId={`media-${encodeURIComponent(item.id)}`}
                      className={cn('relative cursor-move overflow-hidden rounded-xl', item.span)}
                      onClick={() => !isDragging && setSelectedItem(item)}
                      variants={{
                        hidden: { y: 36, scale: 0.94, opacity: 0 },
                        visible: {
                          y: 0,
                          scale: 1,
                          opacity: 1,
                          transition: {
                            type: 'spring',
                            stiffness: 350,
                            damping: 26,
                            delay: index * 0.04,
                          },
                        },
                      }}
                      whileHover={{ scale: 1.02 }}
                      drag
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      dragElastic={1}
                      onDragStart={() => setIsDragging(true)}
                      onDragEnd={(_, info) => {
                        setIsDragging(false);
                        const moveDistance = info.offset.x + info.offset.y;
                        if (Math.abs(moveDistance) > 50) {
                          setItems((prev) => {
                            const next = [...prev];
                            const draggedItem = next[index];
                            const targetIndex =
                              moveDistance > 0
                                ? Math.min(index + 1, next.length - 1)
                                : Math.max(index - 1, 0);
                            next.splice(index, 1);
                            next.splice(targetIndex, 0, draggedItem);
                            return next;
                          });
                        }
                      }}
                    >
                      <MediaItem
                        item={item}
                        className="absolute inset-0 h-full w-full"
                        onClick={() => !isDragging && setSelectedItem(item)}
                      />
                      <motion.div
                        className="pointer-events-none absolute inset-0 flex flex-col justify-end p-2 sm:p-3 md:p-4"
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        <h3 className="relative line-clamp-1 text-xs font-medium text-white sm:text-sm md:text-base">
                          {item.title}
                        </h3>
                        <p className="relative mt-0.5 line-clamp-2 text-[10px] text-white/70 sm:text-xs md:text-sm">
                          {item.desc}
                        </p>
                      </motion.div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
