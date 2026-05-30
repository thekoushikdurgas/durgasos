'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/apps/vsql/ui/dialog';
import type { SchemaColumn } from '@/lib/vsql-api';
import { motion } from 'framer-motion';
import { Maximize2, Pin, PinOff, RefreshCw } from 'lucide-react';
import rail from './AppRail.module.css';
import { FullTableSpreadsheet } from './FullTableSpreadsheet';
import { TableColumnPreviewInsights } from './TableColumnPreviewInsights';
import styles from './TableExplorer.module.css';
import { DataTable } from './TableExplorerDataTable';
import type { TableExplorerActions, TableExplorerState } from './types';
import { railTransition, useAppRailLayout } from './useAppRailLayout';

const PREVIEW_ROW_LIMIT = 50;
const TABLES_RAIL_OPEN = '18rem';

type TableExplorerProps = {
  state: TableExplorerState;
  actions: TableExplorerActions;
  dbId: string;
  busy: boolean;
};

export function TableExplorer({ state, actions, dbId, busy }: TableExplorerProps) {
  const {
    tables,
    expandedTable,
    tableSchema,
    previewColumns,
    previewData,
    previewTotalRowCount,
    sheetColumns,
    sheetData,
    sheetRowOffset,
    sheetColOffset,
    sheetTotalRows,
    sheetTotalCols,
    sheetWindowLoading,
    tableDetailLoading,
    editingCell,
    editValue,
    sheetFullscreenOpen,
  } = state;

  const railLayout = useAppRailLayout(TABLES_RAIL_OPEN);
  const {
    layoutStacked,
    pinnedOpen,
    setPinnedOpen,
    showLabels,
    railWidth,
    railAsideHandlers,
    railDataProps,
  } = railLayout;

  const sheetState = {
    sheetColumns,
    sheetData,
    sheetRowOffset,
    sheetColOffset,
    sheetTotalRows,
    sheetTotalCols,
    sheetWindowLoading,
  };

  const sheetActions = {
    loadSheetWindow: actions.loadSheetWindow,
    setEditingCell: actions.setEditingCell,
    setEditValue: actions.setEditValue,
    saveCell: actions.saveCell,
    cancelCellEdit: actions.cancelCellEdit,
    requestDeleteRow: actions.requestDeleteRow,
  };

  return (
    <>
      <aside
        className={`${rail.aside} ${styles.explorerAside}`}
        aria-label="Database tables"
        {...railAsideHandlers}
        {...railDataProps}
      >
        <motion.div
          className={rail.motion}
          initial={false}
          animate={{ width: railWidth }}
          transition={railTransition}
        >
          <div className={rail.inner}>
            <header className={rail.headerStrip}>
              <div className={styles.explorerRailBrand}>
                <motion.div
                  className={styles.explorerRailTitleWrap}
                  initial={false}
                  animate={{
                    opacity: showLabels ? 1 : 0,
                    x: showLabels ? 0 : -8,
                    maxWidth: showLabels ? 200 : 0,
                    display: showLabels ? 'block' : 'none',
                  }}
                  transition={railTransition}
                  style={{
                    overflow: 'hidden',
                    pointerEvents: showLabels ? 'auto' : 'none',
                  }}
                >
                  <span className={styles.explorerRailTitle}>Tables</span>
                  <span className={styles.explorerRailMeta}>{tables.length} in DB</span>
                </motion.div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className={styles.explorerRailRefresh}
                  onClick={() => void actions.refreshTables()}
                  disabled={busy}
                  aria-label="Refresh tables"
                  title="Refresh tables"
                >
                  <RefreshCw className={styles.explorerRailRefreshIcon} />
                </Button>
              </div>
            </header>

            <div className={`${rail.body} ${styles.explorerRailBody}`}>
              <nav className={styles.tablesRailNav} aria-label="Table list">
                {tables.map((table) => (
                  <button
                    key={table}
                    type="button"
                    className={`${styles.tableRailRow} ${expandedTable === table ? styles.tableRailRowActive : ''}`}
                    onClick={() => {
                      if (expandedTable === table) {
                        actions.setExpandedTable(null);
                      } else {
                        actions.setExpandedTable(table);
                        void actions.loadSelectedTableDetails(table);
                      }
                    }}
                    title={table}
                  >
                    <motion.span
                      className={`${styles.tableRailName} ${showLabels ? rail.interactiveOn : rail.interactiveOff}`}
                      initial={false}
                      animate={{
                        opacity: showLabels ? 1 : 0,
                        x: showLabels ? 0 : -6,
                        maxWidth: showLabels ? 220 : 0,
                      }}
                      transition={railTransition}
                      style={{ overflow: 'hidden' }}
                    >
                      {table}
                    </motion.span>
                    <motion.span
                      className={`${styles.tableRailChevron} ${showLabels ? rail.interactiveOn : rail.interactiveOff}`}
                      initial={false}
                      animate={{
                        opacity: showLabels ? 1 : 0,
                        maxWidth: showLabels ? 24 : 0,
                      }}
                      transition={railTransition}
                      style={{ overflow: 'hidden' }}
                      aria-hidden
                    >
                      {expandedTable === table ? '▼' : '▶'}
                    </motion.span>
                  </button>
                ))}
                {tables.length === 0 && <div className={styles.noTablesRail}>No tables</div>}
              </nav>
            </div>

            {!layoutStacked ? (
              <div className={rail.footer}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`${rail.pinButton} ${pinnedOpen ? rail.pinButtonActive : ''}`}
                  aria-pressed={pinnedOpen}
                  aria-label={pinnedOpen ? 'Unpin tables rail' : 'Pin tables rail open'}
                  title={pinnedOpen ? 'Unpin rail (collapse when idle)' : 'Pin rail open'}
                  onClick={() => setPinnedOpen((p) => !p)}
                >
                  {pinnedOpen ? (
                    <PinOff className={rail.pinIcon} aria-hidden />
                  ) : (
                    <Pin className={rail.pinIcon} aria-hidden />
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </motion.div>
      </aside>

      <div className={styles.explorerMain}>
        {expandedTable ? (
          <div className={styles.explorerDetail}>
            <div className={styles.headerStack}>
              <div className={styles.headerTopRow}>
                <div className={styles.headerTopLeft}>
                  <div className={styles.mainTableTitle}>{expandedTable}</div>
                  <p className={styles.headerHint}>
                    Double-click a cell to edit, then Save or Cancel. Use the delete action at the
                    end of a row to remove it.
                  </p>
                </div>
                <div className={styles.headerTopActions}>
                  <span className={styles.dbIdChip} title={dbId}>
                    {dbId.slice(0, 8)}…
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className={styles.fullTableButton}
                    disabled={busy || tableDetailLoading}
                    onClick={() => {
                      actions.setSheetFullscreenOpen(true);
                      void actions.loadSheetWindow(expandedTable, 0, 0);
                    }}
                  >
                    <Maximize2 className={styles.fullTableButtonIcon} aria-hidden />
                    Full table
                  </Button>
                </div>
              </div>

              <div className={styles.schemaSection}>
                <div className={styles.schemaSectionTitle}>Columns</div>
                {tableDetailLoading && !tableSchema?.length ? (
                  <p className={styles.mutedLine}>Loading schema…</p>
                ) : (
                  <SchemaStrip schema={tableSchema ?? []} />
                )}
              </div>

              <TableColumnPreviewInsights
                tableSchema={tableSchema}
                previewColumns={previewColumns}
                previewData={previewData}
              />
            </div>

            <div className={styles.tableWorkspace}>
              <div className={styles.previewBody}>
                <div className={styles.previewTableCard}>
                  {tableDetailLoading ? (
                    <div className={styles.previewLoading}>Loading preview…</div>
                  ) : previewColumns && previewData ? (
                    <>
                      <div className={styles.dataPreviewWrap}>
                        <DataTable
                          table={expandedTable}
                          columns={previewColumns}
                          data={previewData}
                          editingCell={editingCell}
                          editValue={editValue}
                          setEditValue={actions.setEditValue}
                          setEditingCell={actions.setEditingCell}
                          saveCell={actions.saveCell}
                          cancelCellEdit={actions.cancelCellEdit}
                          requestDeleteRow={actions.requestDeleteRow}
                          variant="preview"
                        />
                      </div>
                      <div className={styles.previewFooter}>
                        {previewTotalRowCount > PREVIEW_ROW_LIMIT
                          ? `Showing first ${PREVIEW_ROW_LIMIT} of ${previewTotalRowCount} rows.`
                          : previewTotalRowCount > 0
                            ? `${previewTotalRowCount} row${previewTotalRowCount === 1 ? '' : 's'}.`
                            : 'No rows in this slice.'}
                      </div>
                    </>
                  ) : (
                    <div className={styles.previewEmpty}>No preview rows.</div>
                  )}
                </div>
              </div>
            </div>

            <Dialog open={sheetFullscreenOpen} onOpenChange={actions.setSheetFullscreenOpen}>
              <DialogContent className={styles.sheetDialogContent}>
                <DialogHeader>
                  <DialogTitle>Table {expandedTable}</DialogTitle>
                </DialogHeader>
                <FullTableSpreadsheet
                  table={expandedTable}
                  embedded={false}
                  sheetFullscreenOpen={sheetFullscreenOpen}
                  onToggleFullscreen={() => actions.setSheetFullscreenOpen(false)}
                  state={sheetState}
                  actions={sheetActions}
                  editingCell={editingCell}
                  editValue={editValue}
                  busy={busy}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className={styles.explorerEmpty}>
            <p className={styles.explorerEmptyTitle}>No table selected</p>
            <p className={styles.explorerEmptyHint}>
              Choose a table in the rail to see column details, preview statistics, and up to{' '}
              {PREVIEW_ROW_LIMIT} rows. Use Full table for the windowed spreadsheet view.
            </p>
            {tables.length === 0 && (
              <p className={styles.explorerEmptySub}>
                No tables found. Import a CSV or create a table in the SQL console.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function SchemaStrip({ schema }: { schema: SchemaColumn[] }) {
  if (schema.length === 0) {
    return <div className={styles.noData}>No columns found.</div>;
  }

  return (
    <div className={styles.schemaStrip}>
      <div className={styles.schemaStripScroll}>
        {schema.map((col) => (
          <div key={col.name} className={styles.schemaCard}>
            <div className={styles.schemaCardName}>{col.name}</div>
            <div className={styles.schemaCardType}>{col.type}</div>
            <div className={styles.schemaCardBadges}>
              {col.pk ? <span className={styles.schemaBadge}>PK</span> : null}
              {col.notnull ? (
                <span className={styles.schemaBadge}>NOT NULL</span>
              ) : (
                <span className={styles.schemaBadgeMuted}>NULL</span>
              )}
              {col.unique ? <span className={styles.schemaBadge}>UNIQUE</span> : null}
            </div>
            {col.default !== null && col.default !== undefined ? (
              <div className={styles.schemaCardDefault} title={String(col.default)}>
                Default: {String(col.default)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
