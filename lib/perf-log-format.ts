/** Formatting helpers for the Performance log UI. */

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function mbPerSec(bytes: number, durationMs: number): string {
  if (durationMs <= 0 || bytes <= 0) return '—';
  const sec = durationMs / 1000;
  const mb = bytes / (1024 * 1024);
  return `${(mb / sec).toFixed(2)}`;
}

export function metaNotes(meta: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return '—';
  try {
    const s = JSON.stringify(meta);
    return s.length > 140 ? `${s.slice(0, 137)}…` : s;
  } catch {
    return '—';
  }
}

export function formatMetaPretty(meta: Record<string, unknown>): string {
  try {
    return JSON.stringify(meta, null, 2);
  } catch {
    return String(meta);
  }
}

export function operationBadgeVariant(operation: string): 'info' | 'warning' | 'error' | 'neutral' {
  if (operation.endsWith('_failed') || operation === 'perf_persist_failed') return 'error';
  if (operation.includes('warning')) return 'warning';
  if (
    operation === 'encode_video' ||
    operation === 'mkv_write' ||
    operation === 'csv_import' ||
    operation === 'parquet_index_build'
  )
    return 'info';
  return 'neutral';
}
