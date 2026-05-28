/**
 * Client-side utility for chunked uploads.
 * Splits files (up to 10 GB+) into 5MB chunks and uploads them sequentially.
 */
export type ChunkedUploadResult = {
  success: boolean;
  path: string;
  public_url?: string;
  signed_url?: string;
  bucket_type?: string;
};

export async function uploadFileInChunks(
  file: File,
  relativePath: string,
  authHeader: string | null,
  onProgress: (progress: number) => void
): Promise<ChunkedUploadResult> {
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers['authorization'] = authHeader;
  }

  // 1. Initialize chunked upload session
  onProgress(2);
  const initRes = await fetch('/api/storage/upload-init', {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      file_path: relativePath,
      total_size: file.size,
      content_type: file.type || 'application/octet-stream',
    }),
  });

  if (!initRes.ok) {
    const errorData = await initRes.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || 'Failed to initialize upload');
  }

  const { upload_id, file_path, chunk_size = 5 * 1024 * 1024 } = await initRes.json();

  // 2. Upload chunks sequentially
  const totalChunks = Math.ceil(file.size / chunk_size);
  logger(`Starting chunked upload: ${totalChunks} chunks of size ${chunk_size} bytes`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunk_size;
    const end = Math.min(start + chunk_size, file.size);
    const chunkSlice = file.slice(start, end);

    const formData = new FormData();
    formData.append('upload_id', upload_id);
    formData.append('chunk_index', String(i));
    // Provide a generic filename to form-data chunk part
    formData.append('file', chunkSlice, 'chunk');

    const chunkRes = await fetch('/api/storage/upload-chunk', {
      method: 'POST',
      headers, // content-type is set automatically by fetch for FormData
      body: formData,
    });

    if (!chunkRes.ok) {
      const errorData = await chunkRes.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || `Failed to upload chunk ${i}`);
    }

    const progress = Math.round(5 + ((i + 1) / totalChunks) * 85);
    onProgress(progress);
  }

  // 3. Finalize upload
  onProgress(95);
  const finalizeRes = await fetch('/api/storage/upload-finalize', {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      upload_id,
      file_path,
      content_type: file.type || 'application/octet-stream',
    }),
  });

  if (!finalizeRes.ok) {
    const errorData = await finalizeRes.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || 'Failed to finalize upload');
  }

  const finalResult = await finalizeRes.json();
  onProgress(100);
  return finalResult;
}

function logger(msg: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[ChunkedUpload]', msg);
  }
}
