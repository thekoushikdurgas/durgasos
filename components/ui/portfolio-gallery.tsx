'use client';

import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export type PortfolioImage = {
  src: string;
  alt: string;
  title?: string;
};

const FALLBACK_IMAGES: PortfolioImage[] = [
  {
    src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&q=80',
    alt: 'SaaS Dashboard Design',
  },
  {
    src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&q=80',
    alt: 'Web Development',
  },
  {
    src: 'https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=800&h=600&fit=crop&q=80',
    alt: 'E-Commerce Platform',
  },
  {
    src: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop&q=80',
    alt: 'Mobile App Design',
  },
  {
    src: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&h=600&fit=crop&q=80',
    alt: 'Brand Identity',
  },
  {
    src: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop&q=80',
    alt: 'Marketing Campaign',
  },
  {
    src: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop&q=80',
    alt: 'Product Photography',
  },
  {
    src: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&h=600&fit=crop&q=80',
    alt: 'Packaging Design',
  },
];

export interface PortfolioGalleryProps {
  title?: string;
  primaryCta?: { text: string };
  onPrimaryClick?: () => void;
  images?: PortfolioImage[];
  className?: string;
  maxHeight?: number;
  spacing?: string;
  onImageClick?: (index: number) => void;
}

export function PortfolioGallery({
  title = 'Browse my library',
  primaryCta = { text: 'Browse library' },
  onPrimaryClick,
  images: customImages,
  className = '',
  maxHeight = 120,
  spacing = '-space-x-72 md:-space-x-80',
  onImageClick,
}: PortfolioGalleryProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const images = customImages?.length ? customImages : FALLBACK_IMAGES;

  return (
    <section
      aria-label={title}
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-auto py-8 px-3 md:px-4',
        className
      )}
    >
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl backdrop-blur-sm">
        <div className="relative z-10 px-6 pt-10 pb-6 text-center md:pt-14 md:pb-8">
          <h2 className="mb-6 text-balance text-3xl font-bold text-slate-100 md:text-5xl">
            {title}
          </h2>

          <button
            type="button"
            onClick={onPrimaryClick}
            className="group mb-12 inline-flex items-center gap-3 rounded-full bg-slate-100 px-6 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!onPrimaryClick}
          >
            <span>{primaryCta.text}</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="relative hidden h-[320px] overflow-hidden md:block md:h-[400px] md:-mb-[200px]">
          <div className={cn('flex items-end justify-center pb-6 pt-28 md:pt-40', spacing)}>
            {images.map((image, index) => {
              const totalImages = images.length;
              const middle = Math.floor(totalImages / 2);
              const distanceFromMiddle = Math.abs(index - middle);
              const staggerOffset = maxHeight - distanceFromMiddle * 20;
              const zIndex = totalImages - index;
              const isHovered = hoveredIndex === index;
              const isOtherHovered = hoveredIndex !== null && hoveredIndex !== index;
              const yOffset = isHovered ? -120 : isOtherHovered ? 0 : -staggerOffset;

              return (
                <motion.div
                  key={`${image.src}-${index}`}
                  className="group flex-shrink-0 cursor-pointer"
                  style={{ zIndex }}
                  initial={{
                    transform: 'perspective(5000px) rotateY(-45deg) translateY(200px)',
                    opacity: 0,
                  }}
                  animate={{
                    transform: `perspective(5000px) rotateY(-45deg) translateY(${yOffset}px)`,
                    opacity: 1,
                  }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.05,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  onHoverStart={() => setHoveredIndex(index)}
                  onHoverEnd={() => setHoveredIndex(null)}
                  onClick={() => onImageClick?.(index)}
                >
                  <div
                    className="relative aspect-video w-56 overflow-hidden rounded-lg transition-transform duration-300 group-hover:scale-105 md:w-80 lg:w-96"
                    style={{
                      boxShadow: `
                        rgba(0, 0, 0, 0.01) 0.796192px 0px 0.796192px 0px,
                        rgba(0, 0, 0, 0.03) 2.41451px 0px 2.41451px 0px,
                        rgba(0, 0, 0, 0.08) 6.38265px 0px 6.38265px 0px,
                        rgba(0, 0, 0, 0.25) 20px 0px 20px 0px
                      `,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.src || '/placeholder.svg'}
                      alt={image.alt}
                      className="h-full w-full object-cover object-left-top"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="group relative block overflow-hidden pb-6 md:hidden">
          <div
            className={cn(
              'flex w-max animate-marquee [--duration:35s]',
              'group-hover:[animation-play-state:paused]'
            )}
            style={{ animationDuration: 'var(--duration, 35s)' }}
          >
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 gap-4 pr-8">
                {images.map((image, index) => (
                  <div
                    key={`${dup}-${index}`}
                    className="group w-56 flex-shrink-0 cursor-pointer sm:w-64"
                    onClick={() => onImageClick?.(index)}
                  >
                    <div
                      className="relative aspect-video overflow-hidden rounded-lg transition-transform duration-300 group-hover:scale-105"
                      style={{
                        boxShadow: `
                          rgba(0, 0, 0, 0.01) 0.796192px 0px 0.796192px 0px,
                          rgba(0, 0, 0, 0.03) 2.41451px 0px 2.41451px 0px,
                          rgba(0, 0, 0, 0.08) 6.38265px 0px 6.38265px 0px,
                          rgba(0, 0, 0, 0.25) 20px 0px 20px 0px
                        `,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.src || '/placeholder.svg'}
                        alt={image.alt}
                        className="h-full w-full object-cover object-left-top"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
