import { extensionFromFileName } from '@/lib/app-file-associations';
import type { LaunchPayload } from '@/lib/window-launch';

const GALLERY_IMAGE_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'avif',
  'heic',
  'tiff',
  'tif',
  'jxl',
  'raw',
  'cr2',
  'nef',
  'dng',
  'psd',
]);

/** True when opening this file with Gallery should use the infinite-drag viewer launch hint. */
export function galleryImageLaunchExtras(
  appId: string,
  fileName: string
): Pick<LaunchPayload, 'galleryView'> | undefined {
  if (appId !== 'gallery') return undefined;
  const ext = extensionFromFileName(fileName);
  if (!ext || !GALLERY_IMAGE_EXTS.has(ext)) return undefined;
  return { galleryView: 'viewer' };
}
