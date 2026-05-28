'use client';

import Image, { type ImageProps } from 'next/image';

type RemoteImageProps = Omit<ImageProps, 'unoptimized'>;

/**
 * Dynamic/signed URL images where `next/image` domains cannot be preconfigured.
 * Uses `unoptimized` to satisfy `@next/next/no-img-element`.
 */
export function RemoteImage({ alt, className, fill, width, height, ...rest }: RemoteImageProps) {
  if (fill) {
    return <Image alt={alt} className={className} fill unoptimized {...rest} />;
  }

  return (
    <Image
      alt={alt}
      className={className}
      height={height ?? 256}
      unoptimized
      width={width ?? 256}
      {...rest}
    />
  );
}
