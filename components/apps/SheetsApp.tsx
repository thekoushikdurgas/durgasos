'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Input } from '@/components/ui/input';
import { useWindowLaunch } from '@/components/window-launch-context';
import { STORAGE_GET_URL } from '@/lib/graphql-modules';
import { fetchStorageText } from '@/lib/storage-signed-url';
import { cn } from '@/lib/utils';

const COLS = 26;
const ROWS = 80;

function colName(c: number): string {
  return String.fromCharCode(65 + c);
}

function addr(r: number, c: number): string {
  return `${colName(c)}${r + 1}`;
}

function parseAddr(s: string): { r: number; c: number } | null {
  const m = /^([A-Z]+)(\d+)$/i.exec(s.trim());
  if (!m) return null;
  const c = m[1]!.toUpperCase().charCodeAt(0) - 65;
  const r = Number(m[2]) - 1;
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  return { r, c };
}

function csvTsvToGrid(text: string): Record<string, string> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out: Record<string, string> = {};
  if (lines.length === 0) return out;
  const delim = lines[0]!.includes('\t') ? '\t' : ',';
  const rows = lines.map((l) => {
    const parts: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i]!;
      if (ch === '"') {
        inQ = !inQ;
      } else if ((ch === delim && !inQ) || (delim === '\t' && ch === '\t' && !inQ)) {
        parts.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    parts.push(cur.trim());
    return parts.map((c) => c.replace(/^"|"$/g, ''));
  });
  const maxCols = Math.min(COLS, Math.max(1, ...rows.map((r) => r.length)));
  const maxRows = Math.min(ROWS, rows.length);
  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      out[addr(r, c)] = rows[r]?.[c] ?? '';
    }
  }
  return out;
}

const DEFAULT_GRID: Record<string, string> = {
  A1: 'Segment',
  B1: 'Country',
  C1: '100',
  C2: '200',
  C3: '50',
};

export function SheetsApp() {
  const launch = useWindowLaunch();
  const [getUrl] = useMutation(STORAGE_GET_URL);
  const loadedRef = useRef(false);

  const [data, setData] = useState<Record<string, string>>(() => ({ ...DEFAULT_GRID }));
  const [active, setActive] = useState('A1');
  const [formula, setFormula] = useState('');
  const [sheetTabs] = useState(['Sheet1']);

  useEffect(() => {
    const s = launch?.storage;
    const fn = launch?.fileName ?? '';
    if (!s?.file_path || loadedRef.current) return;
    if (!/\.(csv|tsv)$/i.test(fn)) return;
    loadedRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const text = await fetchStorageText(getUrl, {
          bucket_type: s.bucket_type,
          file_path: s.file_path,
        });
        if (!text || cancelled) return;
        const grid = csvTsvToGrid(text);
        if (Object.keys(grid).length > 0) {
          setData((prev) => ({ ...prev, ...grid }));
        }
      } catch {
        loadedRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [launch?.fileName, launch?.storage, getUrl]);

  const cell = useCallback(
    (r: number, c: number) => {
      const a = addr(r, c);
      return data[a] ?? '';
    },
    [data]
  );

  const setCell = (a: string, v: string) => {
    setData((d) => ({ ...d, [a]: v }));
  };

  const activeParsed = parseAddr(active);
  const activeVal = activeParsed ? cell(activeParsed.r, activeParsed.c) : '';

  const sumSelection = useMemo(() => {
    if (!activeParsed) return 0;
    const v = cell(activeParsed.r, activeParsed.c);
    const n = Number(v.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [activeParsed, cell]);

  const colWidths = useMemo(() => Array.from({ length: COLS }, () => 72), []);

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950/95 text-slate-100">
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-white/10 px-2 text-[10px] uppercase text-white/45">
        {['File', 'Edit', 'View', 'Insert', 'Format', 'Sheet', 'Data', 'Tools'].map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-white/5 px-2">
        <button type="button" className="rounded border border-white/10 px-2 py-0.5 text-[10px]">
          $
        </button>
        <button type="button" className="rounded border border-white/10 px-2 py-0.5 text-[10px]">
          %
        </button>
      </div>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-2">
        <span className="w-14 shrink-0 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-center text-[11px] text-white/70">
          {active}
        </span>
        <span className="text-white/40">fx</span>
        <Input
          className="min-w-0 flex-1 border-white/10 bg-black/40 py-1 text-xs text-white"
          value={formula}
          placeholder={activeVal}
          onChange={(e) => setFormula(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && activeParsed) {
              setCell(active, formula);
              setFormula('');
            }
          }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="border-collapse text-left text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-[2] w-8 border border-white/10 bg-slate-800 p-0" />
              {Array.from({ length: COLS }, (_, c) => (
                <th
                  key={c}
                  className="sticky top-0 z-[1] border border-white/10 bg-slate-800 px-1 py-0.5 text-center font-normal text-white/50"
                  style={{ minWidth: colWidths[c] }}
                >
                  {colName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, r) => (
              <tr key={r}>
                <td className="sticky left-0 z-[1] border border-white/10 bg-slate-800/95 py-0.5 text-center text-white/40">
                  {r + 1}
                </td>
                {Array.from({ length: COLS }, (_, c) => {
                  const a = addr(r, c);
                  const raw = cell(r, c);
                  return (
                    <td
                      key={a}
                      className={cn(
                        'cursor-cell border border-white/10 px-1 py-0.5 tabular-nums outline-none',
                        active === a ? 'bg-blue-500/25 ring-1 ring-blue-400/50' : 'hover:bg-white/5'
                      )}
                      style={{ minWidth: colWidths[c], maxWidth: colWidths[c] }}
                      onClick={() => {
                        setActive(a);
                        setFormula(data[a] ?? '');
                      }}
                      title={a}
                    >
                      <span className="block truncate">{raw}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex h-8 shrink-0 items-center gap-2 border-t border-white/10 bg-black/30 px-2">
        {sheetTabs.map((t) => (
          <button
            key={t}
            type="button"
            className="rounded-t border border-b-0 border-white/15 bg-white/10 px-3 py-0.5 text-[11px]"
          >
            {t}
          </button>
        ))}
        <button type="button" className="text-white/40 hover:text-white">
          +
        </button>
      </div>
      <footer className="flex h-7 shrink-0 items-center justify-between border-t border-white/10 bg-black/40 px-3 text-[10px] text-white/50">
        <span>Sum={sumSelection} (single-cell demo)</span>
        <span>100%</span>
      </footer>
    </div>
  );
}
