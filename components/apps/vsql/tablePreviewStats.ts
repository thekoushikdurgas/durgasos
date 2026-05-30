import type { SchemaColumn } from '@/lib/vsql-api';

export type PreviewColumnStat = {
  column: string;
  nonNull: number;
  distinct: number;
  rangeHint: string;
};

function isEmptyCell(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

/**
 * Derive per-column stats from the preview row window only (not full table).
 */
export function computePreviewColumnStats(
  columns: string[],
  rows: unknown[][]
): PreviewColumnStat[] {
  const dataCols = columns.filter((c) => c !== '_rowid' && c !== 'rowid');

  return dataCols.map((column) => {
    const idx = columns.indexOf(column);
    const values = idx >= 0 ? rows.map((r) => r[idx]) : [];
    const strVals: string[] = [];
    for (const v of values) {
      if (isEmptyCell(v)) continue;
      strVals.push(String(v));
    }
    const nonNull = strVals.length;
    const distinct = new Set(strVals).size;

    let rangeHint = '—';
    const nums = strVals.map((s) => Number(s)).filter((n) => Number.isFinite(n));
    if (nums.length === strVals.length && nums.length > 0) {
      rangeHint = `${Math.min(...nums)} – ${Math.max(...nums)}`;
    } else if (strVals.length > 0) {
      const lens = strVals.map((s) => s.length);
      rangeHint = `chars ${Math.min(...lens)}–${Math.max(...lens)}`;
    }

    return { column, nonNull, distinct, rangeHint };
  });
}

export function schemaColumnsByName(schema: SchemaColumn[]): Map<string, SchemaColumn> {
  return new Map(schema.map((c) => [c.name, c]));
}
