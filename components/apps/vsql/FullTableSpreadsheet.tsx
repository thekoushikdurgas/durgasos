'use client';

import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import styles from './FullTableSpreadsheet.module.css';
import { DataTable } from './TableExplorerDataTable';
import type { EditingCell, TableExplorerActions, TableExplorerState } from './types';

const PAGE = 50;
const EDGE = 48;
const SCROLL_DEBOUNCE_MS = 120;

type FullTableSpreadsheetProps = {
  table: string;
  embedded: boolean;
  sheetFullscreenOpen: boolean;
  onToggleFullscreen: () => void;
  state: Pick<
    TableExplorerState,
    | 'sheetColumns'
    | 'sheetData'
    | 'sheetRowOffset'
    | 'sheetColOffset'
    | 'sheetTotalRows'
    | 'sheetTotalCols'
    | 'sheetWindowLoading'
  >;
  actions: Pick<
    TableExplorerActions,
    | 'loadSheetWindow'
    | 'setEditingCell'
    | 'setEditValue'
    | 'saveCell'
    | 'cancelCellEdit'
    | 'requestDeleteRow'
  >;
  editingCell: EditingCell;
  editValue: string;
  busy: boolean;
};

export function FullTableSpreadsheet({
  table,
  embedded,
  sheetFullscreenOpen,
  onToggleFullscreen,
  state,
  actions,
  editingCell,
  editValue,
  busy,
}: FullTableSpreadsheetProps) {
  const {
    sheetColumns,
    sheetData,
    sheetRowOffset,
    sheetColOffset,
    sheetTotalRows,
    sheetTotalCols,
    sheetWindowLoading,
  } = state;

  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchRef = useRef<{ r: number; c: number } | null>(null);

  const scheduleFetch = useCallback(
    (rowOff: number, colOff: number) => {
      const last = lastFetchRef.current;
      if (last && last.r === rowOff && last.c === colOff) return;
      lastFetchRef.current = { r: rowOff, c: colOff };
      void actions.loadSheetWindow(table, rowOff, colOff);
    },
    [actions, table]
  );

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || sheetWindowLoading || busy) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const { scrollTop, scrollLeft, clientHeight, clientWidth, scrollHeight, scrollWidth } = el;

      let nextR = sheetRowOffset;
      let nextC = sheetColOffset;

      if (scrollTop < EDGE && sheetRowOffset > 0) {
        nextR = Math.max(0, sheetRowOffset - PAGE);
      } else if (
        scrollTop + clientHeight > scrollHeight - EDGE &&
        sheetRowOffset + PAGE < sheetTotalRows
      ) {
        nextR = Math.min(Math.max(0, sheetTotalRows - PAGE), sheetRowOffset + PAGE);
      }

      if (scrollLeft < EDGE && sheetColOffset > 0) {
        nextC = Math.max(0, sheetColOffset - PAGE);
      } else if (
        scrollLeft + clientWidth > scrollWidth - EDGE &&
        sheetColOffset + PAGE < sheetTotalCols
      ) {
        nextC = Math.min(Math.max(0, sheetTotalCols - PAGE), sheetColOffset + PAGE);
      }

      if (nextR !== sheetRowOffset || nextC !== sheetColOffset) {
        scheduleFetch(nextR, nextC);
        el.scrollTop = clientHeight / 2;
        el.scrollLeft = clientWidth / 2;
      }
    }, SCROLL_DEBOUNCE_MS);
  }, [
    busy,
    scheduleFetch,
    sheetColOffset,
    sheetRowOffset,
    sheetTotalCols,
    sheetTotalRows,
    sheetWindowLoading,
  ]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const rowEnd = Math.min(sheetRowOffset + (sheetData?.length ?? 0), sheetTotalRows);
  const visibleDataCols = sheetColumns?.filter((c) => c !== '_rowid' && c !== 'rowid').length ?? 0;
  const colEnd = Math.min(sheetColOffset + visibleDataCols, sheetTotalCols);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLead}>
          <span className={styles.sheetToolbarTitle}>{table}</span>
          <span className={styles.rangeLabel}>
            Rows {sheetTotalRows === 0 ? 0 : sheetRowOffset + 1}–{rowEnd} of {sheetTotalRows} · Cols{' '}
            {sheetTotalCols === 0 ? 0 : sheetColOffset + 1}–{colEnd} of {sheetTotalCols}
          </span>
        </div>
        <div className={styles.toolbarActions}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onToggleFullscreen}
            disabled={busy}
          >
            {sheetFullscreenOpen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 mr-1" aria-hidden />
                Exit full view
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 mr-1" aria-hidden />
                Fullscreen
              </>
            )}
          </Button>
        </div>
      </div>

      <p className={styles.hint}>
        Double-click a cell to edit · Scroll near an edge to load the previous or next {PAGE} rows
        or columns (window swaps in place).
      </p>

      <div
        className={`${styles.scrollShellOuter} ${embedded ? '' : styles.scrollShellOuterFullscreen}`}
      >
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className={`${styles.scrollShell} ${embedded ? '' : styles.scrollShellFullscreen}`}
        >
          {sheetWindowLoading ? <div className={styles.loadingOverlay}>Loading…</div> : null}
          {sheetColumns && sheetData && sheetData.length > 0 ? (
            <DataTable
              table={table}
              columns={sheetColumns}
              data={sheetData}
              editingCell={editingCell}
              editValue={editValue}
              setEditValue={actions.setEditValue}
              setEditingCell={actions.setEditingCell}
              saveCell={actions.saveCell}
              cancelCellEdit={actions.cancelCellEdit}
              requestDeleteRow={actions.requestDeleteRow}
              variant="sheet"
            />
          ) : (
            <div className={`${styles.hint} ${styles.emptyWindow}`}>
              {sheetWindowLoading ? ' ' : 'No rows in this window.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
