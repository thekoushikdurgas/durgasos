'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/apps/vsql/ui/dialog';
import { FileSpreadsheet } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import styles from './CsvImportModal.module.css';
import type { CsvConfig, CsvImportProgress } from './types';

const CREATE_NEW_VALUE = '__create_new__';

type CsvImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: File[];
  configs: CsvConfig[];
  setConfigs: (configs: CsvConfig[]) => void;
  /** Workspace table names for the import target dropdown. */
  tables: string[];
  progress: CsvImportProgress | null;
  busy: boolean;
  onAnalyze: (index: number) => Promise<void>;
  onConfirm: () => Promise<void>;
};

export function CsvImportModal({
  open,
  onOpenChange,
  files,
  configs,
  setConfigs,
  tables,
  progress,
  busy,
  onAnalyze,
  onConfirm,
}: CsvImportModalProps) {
  /** True when the user chose “create new table” and may still be typing a name. */
  const [createTableFlow, setCreateTableFlow] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (open) {
      setCreateTableFlow({});
    }
  }, [open, files.length]);

  const sortedTables = useMemo(() => [...tables].sort((a, b) => a.localeCompare(b)), [tables]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader className={styles.dialogHeader}>
          <DialogTitle className={styles.dialogTitle}>Configure CSV Import</DialogTitle>
          <DialogDescription className={styles.dialogDescription}>
            Choose an existing table or create a new one for each file. Optional delimiter and
            quote, then analyze for mapping. Use append only when merging into an existing table.
          </DialogDescription>
        </DialogHeader>

        {busy && progress && (
          <div className={styles.importStatusBar}>
            <div className={styles.importStatusRow}>
              <span className={styles.importStatusLabel}>{progress.label}</span>
              <span className={styles.importStatusCounts}>
                File {progress.currentFileIdx + 1} of {progress.totalFiles}
              </span>
              <span className={styles.importStatusPct}>{progress.progressPct.toFixed(1)}%</span>
            </div>
            <p className={styles.importStageLine}>{csvStageLine(progress.stage)}</p>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.importGlobalFill}
                style={{ width: `${Math.min(100, progress.progressPct)}%` }}
              >
                <span className={styles.importShimmer} aria-hidden />
              </div>
            </div>
          </div>
        )}

        <div className={styles.content}>
          <p className={styles.fileSummary}>
            Selected <span className={styles.fileCount}>{files.length}</span> file
            {files.length === 1 ? '' : 's'}.
          </p>

          <div className={styles.filesList}>
            {files.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className={styles.fileCard}>
                <div className={styles.fileHeader}>
                  <div className={styles.fileInfo}>
                    <FileSpreadsheet className={styles.fileIcon} />
                    <span className={styles.fileName}>{file.name}</span>
                  </div>
                  <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                </div>

                <div className={styles.configGrid}>
                  <div className={styles.configGridFull}>
                    <Field label="Import to table">
                      <div className={styles.tablePickRow}>
                        <select
                          title="Target workspace table"
                          className={styles.selectInput}
                          value={tableSelectValue(configs[idx], sortedTables, createTableFlow[idx])}
                          onChange={(e) => {
                            const value = e.target.value;
                            const next = [...configs];
                            const patch = { ...next[idx] };
                            if (value === '') {
                              patch.tableName = '';
                              setCreateTableFlow((prev) => ({
                                ...prev,
                                [idx]: false,
                              }));
                            } else if (value === CREATE_NEW_VALUE) {
                              patch.tableName = '';
                              patch.appendToExisting = false;
                              setCreateTableFlow((prev) => ({
                                ...prev,
                                [idx]: true,
                              }));
                            } else {
                              patch.tableName = value;
                              patch.appendToExisting = true;
                              setCreateTableFlow((prev) => ({
                                ...prev,
                                [idx]: false,
                              }));
                            }
                            next[idx] = patch;
                            setConfigs(next);
                          }}
                        >
                          <option value="">— Select table —</option>
                          {sortedTables.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                          <option value={CREATE_NEW_VALUE}>+ Create new table…</option>
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={styles.createTableBtn}
                          title="Type a new table name for this file"
                          onClick={() => {
                            setCreateTableFlow((prev) => ({
                              ...prev,
                              [idx]: true,
                            }));
                            const next = [...configs];
                            next[idx] = {
                              ...next[idx],
                              tableName: '',
                              appendToExisting: false,
                            };
                            setConfigs(next);
                          }}
                        >
                          Create table
                        </Button>
                      </div>
                      {showNewTableNameField(configs[idx], sortedTables, createTableFlow[idx]) && (
                        <input
                          type="text"
                          title="New logical table name"
                          placeholder="new_table_name"
                          value={configs[idx]?.tableName ?? ''}
                          onChange={(e) => {
                            const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_');
                            const next = [...configs];
                            const exists = sanitized !== '' && sortedTables.includes(sanitized);
                            next[idx] = {
                              ...next[idx],
                              tableName: sanitized,
                              appendToExisting: exists,
                            };
                            setConfigs(next);
                            setCreateTableFlow((prev) => ({
                              ...prev,
                              [idx]: !exists,
                            }));
                          }}
                          className={styles.newTableInput}
                        />
                      )}
                    </Field>
                  </div>
                  <Field label="Append if table exists">
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        title="Append rows to existing table instead of replacing"
                        checked={configs[idx]?.appendToExisting ?? false}
                        onChange={(e) => {
                          const next = [...configs];
                          next[idx] = {
                            ...next[idx],
                            appendToExisting: e.target.checked,
                          };
                          setConfigs(next);
                        }}
                      />
                      <span className={styles.checkboxHint}>
                        Merge into existing rows (same workspace table name)
                      </span>
                    </label>
                  </Field>
                  <Field label="Delimiter">
                    <select
                      title="CSV delimiter"
                      value={configs[idx]?.delimiter ?? ','}
                      onChange={(e) => {
                        const next = [...configs];
                        next[idx] = { ...next[idx], delimiter: e.target.value };
                        setConfigs(next);
                      }}
                      className={styles.selectInput}
                    >
                      <option value=",">, (Comma)</option>
                      <option value=";">; (Semicolon)</option>
                      <option value="\t">Tab</option>
                      <option value="|">| (Pipe)</option>
                    </select>
                  </Field>
                  <Field label="Quote Char">
                    <input
                      type="text"
                      title="CSV quote character"
                      placeholder={'"'}
                      maxLength={1}
                      value={configs[idx]?.quoteChar ?? '"'}
                      onChange={(e) => {
                        const next = [...configs];
                        next[idx] = { ...next[idx], quoteChar: e.target.value };
                        setConfigs(next);
                      }}
                      className={`${styles.textInput} ${styles.textCenter}`}
                    />
                  </Field>
                </div>

                <div className={styles.actionRow}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void onAnalyze(idx)}
                    disabled={busy || configs[idx]?.analyzing}
                    className={styles.analyzeButton}
                  >
                    {configs[idx]?.analyzing
                      ? 'Analyzing...'
                      : configs[idx]?.analysis
                        ? 'Re-analyze CSV'
                        : 'Analyze CSV'}
                  </Button>
                  {configs[idx]?.analysis && (
                    <span className={styles.rowCount}>
                      {configs[idx]?.analysis?.rowCount ?? 0} rows detected
                    </span>
                  )}
                </div>

                {configs[idx]?.analysisError && (
                  <p className={styles.errorText}>{configs[idx]?.analysisError}</p>
                )}

                {configs[idx]?.analysis && (
                  <ImportAnalysis
                    config={configs[idx]}
                    onChange={(nextConfig) => {
                      const next = [...configs];
                      next[idx] = nextConfig;
                      setConfigs(next);
                    }}
                  />
                )}

                {busy && progress && progress.currentFileIdx === idx && (
                  <div className={styles.progressContainer}>
                    <div className={styles.progressText}>
                      <span>{progress.label}</span>
                      <span>{progress.progressPct.toFixed(1)}%</span>
                    </div>
                    <div className={styles.fileProgressMeta}>
                      File {progress.currentFileIdx + 1} of {progress.totalFiles} ·{' '}
                      {csvStageLine(progress.stage)}
                    </div>
                    <div className={styles.fileProgressBar}>
                      <div
                        className={styles.fileProgressFill}
                        style={{
                          width: `${Math.min(100, progress.progressPct)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className={styles.footer}>
          <div className={styles.footerActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onConfirm()}
              disabled={
                busy || files.length === 0 || configs.some((config) => !config.tableName.trim())
              }
              className={styles.importButton}
            >
              {busy
                ? 'Importing...'
                : `Import ${files.length} file${files.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function tableSelectValue(
  config: CsvConfig | undefined,
  tables: string[],
  creating: boolean | undefined
): string {
  const name = config?.tableName?.trim() ?? '';
  const inList = name !== '' && tables.includes(name);
  if (!name && !creating) {
    return '';
  }
  if (inList) {
    return name;
  }
  return CREATE_NEW_VALUE;
}

function showNewTableNameField(
  config: CsvConfig | undefined,
  tables: string[],
  creating: boolean | undefined
): boolean {
  return tableSelectValue(config, tables, creating) === CREATE_NEW_VALUE;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function csvStageLine(stage: CsvImportProgress['stage']) {
  switch (stage) {
    case 'upload':
      return 'Uploading & sending to server';
    case 'pixels':
      return 'Encoding to video pixels (RGBA)…';
    case 'finalize':
      return 'Almost done…';
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function ImportAnalysis({
  config,
  onChange,
}: {
  config: CsvConfig;
  onChange: (config: CsvConfig) => void;
}) {
  const analysis = config.analysis;
  if (!analysis) return null;
  const plan = config.importPlan ?? {
    tableName: config.tableName,
    mode: 'replace' as const,
    columns: analysis.columns.map((column) => ({
      sourceName: column.sourceName,
      targetName: column.suggestedName,
      dataType: column.inferredType,
      include: true,
      nullable: column.emptyCount > 0,
      unique: column.isUniqueCandidate,
      primaryKey: false,
    })),
    selectedResolution:
      analysis.resolutions.find((resolution) => resolution.isRecommended) ??
      analysis.resolutions.find((resolution) => resolution.isCurrent) ??
      null,
  };

  const setColumn = (columnIndex: number, patch: Partial<(typeof plan.columns)[number]>) => {
    const nextColumns = plan.columns.map((column, index) =>
      index === columnIndex ? { ...column, ...patch } : column
    );
    onChange({ ...config, importPlan: { ...plan, columns: nextColumns } });
  };

  const setResolution = (value: string) => {
    const selected =
      analysis.resolutions.find(
        (resolution) => `${resolution.width}x${resolution.height}` === value
      ) ?? null;
    onChange({
      ...config,
      selectedResolution: selected,
      importPlan: { ...plan, selectedResolution: selected },
    });
  };

  return (
    <div className={styles.analysisPanel}>
      <div className={styles.analysisHeader}>Column Mapping and Type Suggestions</div>
      {analysis.warnings.length > 0 && (
        <div className={styles.analysisWarnings}>{analysis.warnings.join(' ')}</div>
      )}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.tableHeaderCell}>Use</th>
              <th className={styles.tableHeaderCell}>CSV Column</th>
              <th className={styles.tableHeaderCell}>Create Column</th>
              <th className={styles.tableHeaderCell}>Type</th>
              <th className={styles.tableHeaderCell}>Unique</th>
              <th className={styles.tableHeaderCell}>Empty</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {analysis.columns.map((column, index) => {
              const mapped = plan.columns[index];
              return (
                <tr key={`${column.sourceName}-${index}`} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <input
                      type="checkbox"
                      title={`Include ${column.sourceName}`}
                      checked={mapped?.include ?? true}
                      onChange={(event) => setColumn(index, { include: event.target.checked })}
                    />
                  </td>
                  <td className={styles.tableCellSource}>
                    <div>{column.sourceName}</div>
                    <div className={styles.sampleValues}>
                      {column.sampleValues.slice(0, 3).join(', ')}
                    </div>
                  </td>
                  <td className={styles.tableCellTarget}>
                    <input
                      title={`Destination column for ${column.sourceName}`}
                      value={mapped?.targetName ?? column.suggestedName}
                      onChange={(event) =>
                        setColumn(index, {
                          targetName: event.target.value.replace(/[^a-zA-Z0-9_]/g, '_'),
                        })
                      }
                      className={styles.tableInput}
                    />
                  </td>
                  <td className={styles.tableCellType}>
                    <select
                      title={`Data type for ${column.sourceName}`}
                      value={mapped?.dataType ?? column.inferredType}
                      onChange={(event) => setColumn(index, { dataType: event.target.value })}
                      className={styles.tableSelect}
                    >
                      <option value="TEXT">TEXT</option>
                      <option value="INTEGER">INTEGER</option>
                      <option value="REAL">REAL</option>
                      <option value="BLOB">BLOB</option>
                    </select>
                  </td>
                  <td className={styles.tableCellUnique}>
                    <label className={styles.tableCheckbox}>
                      <input
                        type="checkbox"
                        title={`Mark ${column.sourceName} as unique`}
                        checked={mapped?.unique ?? false}
                        onChange={(event) => setColumn(index, { unique: event.target.checked })}
                      />
                      {column.uniqueCount}
                    </label>
                  </td>
                  <td className={styles.tableCellEmpty}>{column.emptyCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={styles.resolutionPanel}>
        <Field label="Resolution Recommendation">
          <select
            title="Recommended frame resolution"
            value={`${(plan.selectedResolution ?? config.selectedResolution)?.width ?? 1280}x${(plan.selectedResolution ?? config.selectedResolution)?.height ?? 720}`}
            onChange={(event) => setResolution(event.target.value)}
            className={styles.selectInput}
          >
            {analysis.resolutions.map((resolution) => (
              <option
                key={`${resolution.width}x${resolution.height}`}
                value={`${resolution.width}x${resolution.height}`}
              >
                {resolution.width}x{resolution.height} - {resolution.estimatedFrames} frame
                {resolution.estimatedFrames === 1 ? '' : 's'}
                {resolution.isRecommended ? ' (recommended)' : ''}
                {resolution.isCurrent ? ' (current encoder)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <div className={styles.resolutionHint}>
          Recommendations are preview-only in this version; encoding remains compatible at 1280x720.
        </div>
      </div>
    </div>
  );
}
