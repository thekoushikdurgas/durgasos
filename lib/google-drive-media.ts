import { extensionFromFileName } from '@/lib/app-file-associations';

/** Google Workspace types that are not plain downloadable blobs. */
export function isGoogleDriveNativeAppMime(mime?: string | null): boolean {
  if (!mime || typeof mime !== 'string') return false;
  return (
    mime.startsWith('application/vnd.google-apps.') && mime !== 'application/vnd.google-apps.folder'
  );
}

/** MIME used with Drive `files.export` for native Workspace files. */
export function googleDriveExportMime(nativeMime: string): string | null {
  switch (nativeMime) {
    case 'application/vnd.google-apps.document':
      return 'application/pdf';
    case 'application/vnd.google-apps.spreadsheet':
      return 'text/csv';
    case 'application/vnd.google-apps.presentation':
      return 'application/pdf';
    case 'application/vnd.google-apps.drawing':
      return 'image/png';
    default:
      return null;
  }
}

export function buildGoogleDriveFetchUrl(
  fileId: string,
  mimeType?: string | null
): { url: string; useExport: boolean } {
  const exportMime =
    mimeType && isGoogleDriveNativeAppMime(mimeType) ? googleDriveExportMime(mimeType) : null;
  if (exportMime) {
    return {
      url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMime)}`,
      useExport: true,
    };
  }
  return {
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    useExport: false,
  };
}

export async function fetchGoogleDriveBlob(
  accessToken: string,
  fileId: string,
  mimeType?: string | null
): Promise<Blob> {
  const { url } = buildGoogleDriveFetchUrl(fileId, mimeType);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Drive download failed (${res.status})`);
  }
  return res.blob();
}

/**
 * Prefer in-OS apps when we can resolve an extension or export a native Workspace file.
 * Fall back to opening `webViewLink` in the system browser only for native types without export.
 */
export function shouldOpenGoogleDriveInBrowser(entry: {
  name: string;
  googleDrive?: { mimeType?: string; webViewLink?: string | null };
}): boolean {
  const gd = entry.googleDrive;
  if (!gd) return false;
  const ext = extensionFromFileName(entry.name);
  if (ext) return false;
  if (!isGoogleDriveNativeAppMime(gd.mimeType)) return false;
  if (googleDriveExportMime(gd.mimeType ?? '')) return false;
  return Boolean(gd.webViewLink);
}
