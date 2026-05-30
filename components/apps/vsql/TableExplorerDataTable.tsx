'use client';

import { MoreHorizontal, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './TableExplorer.module.css';
import type { TableExplorerActions, TableExplorerState } from './types';

function previewCellContent(cell: unknown): ReactNode {
  if (cell == null) {
    return <span className={styles.dataCellNull}>null</span>;
  }
  const s = String(cell).trim();
  const lower = s.toLowerCase();
  if (lower === 'active') {
    return <span className={styles.previewBadgeActive}>Active</span>;
  }
  if (lower === 'inactive') {
    return <span className={styles.previewBadgeInactive}>Inactive</span>;
  }
  return s;
}

export function DataTable({
  table,
  columns,
  data,
  editingCell,
  editValue,
  setEditValue,
  setEditingCell,
  saveCell,
  cancelCellEdit,
  requestDeleteRow,
  variant = 'default',
}: {
  table: string;
  columns: string[];
  data: unknown[][];
  editingCell: TableExplorerState['editingCell'];
  editValue: string;
  setEditValue: (value: string) => void;
  setEditingCell: TableExplorerActions['setEditingCell'];
  saveCell: () => Promise<void>;
  cancelCellEdit: () => void;
  requestDeleteRow: (table: string, rowid: number) => void;
  variant?: 'default' | 'preview' | 'sheet';
}) {
  if (data.length === 0) {
    return <div className={styles.noData}>No data found.</div>;
  }

  const rowidIdx =
    columns.indexOf('_rowid') >= 0 ? columns.indexOf('_rowid') : columns.indexOf('rowid');

  const containerClass =
    variant === 'sheet' ? `${styles.dataContainer} ${styles.sheetHost}` : styles.dataContainer;

  return (
    <div className={containerClass}>
      <table className={styles.dataTable}>
        <thead className={styles.dataHeader}>
          <tr>
            {columns
              .filter((col) => col !== '_rowid' && col !== 'rowid')
              .map((col) => (
                <th key={col} className={styles.dataHeaderCell}>
                  {col}
                </th>
              ))}
            <th className={styles.dataHeaderActions}>Actions</th>
          </tr>
        </thead>
        <tbody className={styles.dataBody}>
          {data.map((row, rowIdx) => {
            const rowid = rowidIdx >= 0 ? Number(row[rowidIdx]) : rowIdx + 1;
            return (
              <tr key={`${table}-${rowid}-${rowIdx}`} className={styles.dataRow}>
                {row.map((cell, colIdx) => {
                  const colName = columns[colIdx];
                  if (colName === '_rowid' || colName === 'rowid') return null;
                  const isEditing =
                    editingCell?.rowIdx === rowIdx && editingCell?.colIdx === colIdx;
                  return (
                    <td key={`${colName}-${colIdx}`} className={styles.dataCell}>
                      {isEditing ? (
                        <div className={styles.editWrap}>
                          <input
                            autoFocus
                            className={styles.editInput}
                            aria-label="Edit cell value"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void saveCell();
                              if (e.key === 'Escape') cancelCellEdit();
                            }}
                          />
                          <div className={styles.editActions}>
                            <button
                              type="button"
                              className={styles.editSaveBtn}
                              onClick={() => void saveCell()}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className={styles.editCancelBtn}
                              onClick={cancelCellEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.dataCellButton}
                          onDoubleClick={() => {
                            setEditingCell({
                              rowIdx,
                              colIdx,
                              colName,
                              dbRowId: rowid,
                            });
                            setEditValue(cell == null ? '' : String(cell));
                          }}
                        >
                          {variant === 'preview' ? (
                            previewCellContent(cell)
                          ) : cell == null ? (
                            <span className={styles.dataCellNull}>null</span>
                          ) : (
                            String(cell)
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
                <td className={styles.deleteCell}>
                  <button
                    type="button"
                    className={
                      variant === 'preview'
                        ? `${styles.deleteButton} ${styles.deleteButtonPreview}`
                        : variant === 'sheet'
                          ? `${styles.deleteButton} ${styles.deleteButtonSheet}`
                          : styles.deleteButton
                    }
                    onClick={() => requestDeleteRow(table, rowid)}
                    title="Delete row"
                    aria-label="Delete row"
                  >
                    {variant === 'preview' ? (
                      <MoreHorizontal className={styles.deleteButtonIconPreview} aria-hidden />
                    ) : variant === 'sheet' ? (
                      <Trash2 className={styles.deleteButtonIconSheet} aria-hidden />
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3" aria-hidden />
                        Delete
                      </>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
