'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Type,
  Hash,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Database,
  Table2,
  Eye,
  Download,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  analyzeCsvFile,
  parseCsvFile,
  formatFileSize,
  getDataQualityScore,
  type CsvAnalysisResult,
  type ColumnAnalysis,
  type CsvDataType,
} from '@/lib/csv-parser';
import styles from './CsvAnalyzer.module.css';

interface AnalyzedFile {
  file: File;
  analysis: CsvAnalysisResult;
  id: string;
}

interface CsvAnalyzerProps {
  onProceedToImport?: (files: File[], analyses: CsvAnalysisResult[]) => void;
  maxFileSize?: number;
  maxFiles?: number;
}

const DATA_TYPE_ICONS: Record<CsvDataType, React.ReactNode> = {
  TEXT: <Type className="h-3.5 w-3.5" />,
  INTEGER: <Hash className="h-3.5 w-3.5" />,
  REAL: <Hash className="h-3.5 w-3.5" />,
  BLOB: <Database className="h-3.5 w-3.5" />,
  DATE: <Calendar className="h-3.5 w-3.5" />,
  BOOLEAN: <CheckCircle2 className="h-3.5 w-3.5" />,
  NULL: <AlertCircle className="h-3.5 w-3.5" />,
};

const DATA_TYPE_COLORS: Record<CsvDataType, string> = {
  TEXT: 'bg-blue-100 text-blue-700',
  INTEGER: 'bg-green-100 text-green-700',
  REAL: 'bg-emerald-100 text-emerald-700',
  BLOB: 'bg-purple-100 text-purple-700',
  DATE: 'bg-orange-100 text-orange-700',
  BOOLEAN: 'bg-cyan-100 text-cyan-700',
  NULL: 'bg-gray-100 text-gray-700',
};

export function CsvAnalyzer({
  onProceedToImport,
  maxFileSize = 50 * 1024 * 1024,
  maxFiles = 10,
}: CsvAnalyzerProps) {
  const [files, setFiles] = useState<AnalyzedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const analyzeFiles = useCallback(
    async (fileList: FileList) => {
      setIsAnalyzing(true);
      setError(null);

      const csvFiles = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith('.csv'));

      if (csvFiles.length === 0) {
        setError('No CSV files found. Please upload .csv files only.');
        setIsAnalyzing(false);
        return;
      }

      const oversizedFiles = csvFiles.filter((f) => f.size > maxFileSize);
      if (oversizedFiles.length > 0) {
        setError(
          `Files too large: ${oversizedFiles.map((f) => f.name).join(', ')}. Max size is ${formatFileSize(maxFileSize)}.`
        );
        setIsAnalyzing(false);
        return;
      }

      if (files.length + csvFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed.`);
        setIsAnalyzing(false);
        return;
      }

      const newFiles: AnalyzedFile[] = [];

      for (const file of csvFiles) {
        try {
          const analysis = await analyzeCsvFile(file, { maxRows: 1000 });
          newFiles.push({
            file,
            analysis,
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          });
        } catch (err) {
          console.error(`Failed to analyze ${file.name}:`, err);
          setError(
            `Failed to analyze ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      }

      setFiles((prev) => [...prev, ...newFiles]);
      if (!activeFileId && newFiles.length > 0) {
        setActiveFileId(newFiles[0].id);
      }
      setIsAnalyzing(false);
      setIsDragging(false);
    },
    [files.length, maxFileSize, maxFiles, activeFileId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        analyzeFiles(e.dataTransfer.files);
      }
    },
    [analyzeFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        analyzeFiles(e.target.files);
      }
    },
    [analyzeFiles]
  );

  const removeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const filtered = prev.filter((f) => f.id !== id);
        if (activeFileId === id) {
          setActiveFileId(filtered.length > 0 ? filtered[0].id : null);
        }
        return filtered;
      });
    },
    [activeFileId]
  );

  const toggleColumnExpand = useCallback((columnName: string) => {
    setExpandedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnName)) {
        next.delete(columnName);
      } else {
        next.add(columnName);
      }
      return next;
    });
  }, []);

  const exportAnalysis = useCallback(() => {
    const activeFile = files.find((f) => f.id === activeFileId);
    if (!activeFile) return;

    const exportData = {
      fileName: activeFile.file.name,
      fileSize: formatFileSize(activeFile.file.size),
      analysis: activeFile.analysis,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFile.file.name.replace('.csv', '')}-analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [files, activeFileId]);

  const proceedToImport = useCallback(() => {
    if (onProceedToImport && files.length > 0) {
      onProceedToImport(
        files.map((f) => f.file),
        files.map((f) => f.analysis)
      );
    }
  }, [files, onProceedToImport]);

  const activeFile = files.find((f) => f.id === activeFileId);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <FileSpreadsheet className={styles.headerIcon} />
          <div>
            <h2 className={styles.headerTitle}>CSV Analyzer</h2>
            <p className={styles.headerSubtitle}>
              Analyze CSV files before importing. Preview columns, data types, and quality metrics.
            </p>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      {files.length === 0 && (
        <motion.div
          className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Upload className={styles.dropZoneIcon} />
          <p className={styles.dropZoneText}>
            {isDragging ? 'Drop CSV files here' : 'Drag and drop CSV files'}
          </p>
          <p className={styles.dropZoneSubtext}>or</p>
          <label className={styles.fileInputLabel}>
            <input
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileInput}
              className={styles.fileInput}
            />
            <Button variant="outline" size="sm">
              Browse Files
            </Button>
          </label>
          <p className={styles.dropZoneHint}>
            Max {maxFiles} files, up to {formatFileSize(maxFileSize)} each
          </p>
        </motion.div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className={styles.error}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AlertCircle className={styles.errorIcon} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className={styles.errorClose}>
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Tabs */}
      {files.length > 0 && (
        <div className={styles.fileTabs}>
          <div className={styles.fileTabsList}>
            {files.map((file) => (
              <motion.button
                key={file.id}
                className={`${styles.fileTab} ${activeFileId === file.id ? styles.fileTabActive : ''}`}
                onClick={() => setActiveFileId(file.id)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FileSpreadsheet className={styles.fileTabIcon} />
                <span className={styles.fileTabName}>{file.file.name}</span>
                <span className={styles.fileTabSize}>{formatFileSize(file.file.size)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  className={styles.fileTabRemove}
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.button>
            ))}
            <label className={styles.addFileButton}>
              <input
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileInput}
                className={styles.fileInput}
              />
              <span>+ Add File</span>
            </label>
          </div>
        </div>
      )}

      {/* Analysis Content */}
      {activeFile && (
        <motion.div
          className={styles.analysisContent}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Summary Cards */}
          <div className={styles.summaryGrid}>
            <motion.div
              className={styles.summaryCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Table2 className={styles.summaryCardIcon} />
              <div>
                <p className={styles.summaryCardValue}>
                  {activeFile.analysis.rowCount.toLocaleString()}
                </p>
                <p className={styles.summaryCardLabel}>Rows</p>
              </div>
            </motion.div>

            <motion.div
              className={styles.summaryCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Database className={styles.summaryCardIcon} />
              <div>
                <p className={styles.summaryCardValue}>{activeFile.analysis.columns.length}</p>
                <p className={styles.summaryCardLabel}>Columns</p>
              </div>
            </motion.div>

            <motion.div
              className={styles.summaryCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <CheckCircle2 className={styles.summaryCardIcon} />
              <div>
                <p className={styles.summaryCardValue}>
                  {
                    activeFile.analysis.columns.filter(
                      (c: ColumnAnalysis) => getDataQualityScore(c) === 'high'
                    ).length
                  }
                </p>
                <p className={styles.summaryCardLabel}>High Quality Columns</p>
              </div>
            </motion.div>

            {activeFile.analysis.warnings.length > 0 && (
              <motion.div
                className={`${styles.summaryCard} ${styles.summaryCardWarning}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <AlertCircle className={styles.summaryCardIcon} />
                <div>
                  <p className={styles.summaryCardValue}>{activeFile.analysis.warnings.length}</p>
                  <p className={styles.summaryCardLabel}>Warnings</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Warnings */}
          {activeFile.analysis.warnings.length > 0 && (
            <motion.div
              className={styles.warnings}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              {activeFile.analysis.warnings.map((warning: string, idx: number) => (
                <div key={idx} className={styles.warning}>
                  <AlertCircle className={styles.warningIcon} />
                  <span>{warning}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Column Analysis */}
          <div className={styles.columnsSection}>
            <h3 className={styles.sectionTitle}>Column Analysis</h3>
            <div className={styles.columnsGrid}>
              {activeFile.analysis.columns.map((column: ColumnAnalysis, idx: number) => (
                <motion.div
                  key={column.sourceName}
                  className={styles.columnCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div
                    className={styles.columnCardHeader}
                    onClick={() => toggleColumnExpand(column.sourceName)}
                  >
                    <div className={styles.columnCardTitle}>
                      <span
                        className={`${styles.dataTypeBadge} ${DATA_TYPE_COLORS[column.inferredType]}`}
                      >
                        {DATA_TYPE_ICONS[column.inferredType]}
                        {column.inferredType}
                      </span>
                      <span className={styles.columnName}>{column.sourceName}</span>
                    </div>
                    <div className={styles.columnCardActions}>
                      <QualityBadge score={getDataQualityScore(column)} />
                      {expandedColumns.has(column.sourceName) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedColumns.has(column.sourceName) && (
                      <motion.div
                        className={styles.columnCardDetails}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {/* Sample Values */}
                        {column.sampleValues.length > 0 && (
                          <div className={styles.detailSection}>
                            <p className={styles.detailLabel}>Sample Values</p>
                            <div className={styles.sampleValues}>
                              {column.sampleValues.map((val: string, i: number) => (
                                <code key={i} className={styles.sampleValue}>
                                  {val.length > 30 ? `${val.substring(0, 30)}...` : val}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Statistics */}
                        <div className={styles.statsGrid}>
                          <div className={styles.stat}>
                            <span className={styles.statValue}>
                              {column.nullPercentage.toFixed(1)}%
                            </span>
                            <span className={styles.statLabel}>Null</span>
                          </div>
                          <div className={styles.stat}>
                            <span className={styles.statValue}>
                              {column.uniquePercentage.toFixed(1)}%
                            </span>
                            <span className={styles.statLabel}>Unique</span>
                          </div>
                          <div className={styles.stat}>
                            <span className={styles.statValue}>
                              {column.totalCount.toLocaleString()}
                            </span>
                            <span className={styles.statLabel}>Total</span>
                          </div>
                          {column.isUniqueCandidate && (
                            <div className={`${styles.stat} ${styles.statHighlight}`}>
                              <CheckCircle2 className="h-3 w-3" />
                              <span className={styles.statLabel}>Unique ID</span>
                            </div>
                          )}
                        </div>

                        {/* Min/Max for numeric/date */}
                        {(column.minValue || column.maxValue) && (
                          <div className={styles.detailSection}>
                            <p className={styles.detailLabel}>Range</p>
                            <div className={styles.rangeValues}>
                              <span>Min: {column.minValue}</span>
                              <span>Max: {column.maxValue}</span>
                            </div>
                          </div>
                        )}

                        {/* Suggested name */}
                        <div className={styles.detailSection}>
                          <p className={styles.detailLabel}>Suggested DB Name</p>
                          <code className={styles.suggestedName}>{column.suggestedName}</code>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Data Preview */}
          {activeFile.analysis.previewRows.length > 0 && (
            <div className={styles.previewSection}>
              <div className={styles.previewHeader}>
                <h3 className={styles.sectionTitle}>
                  <Eye className="h-4 w-4 inline mr-2" />
                  Data Preview (First {activeFile.analysis.previewRows.length} rows)
                </h3>
              </div>
              <div className={styles.previewTableWrapper}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      {activeFile.analysis.columns.map((col: ColumnAnalysis) => (
                        <th key={col.sourceName} className={styles.previewTableHeader}>
                          <div className={styles.previewTableHeaderContent}>
                            <span
                              className={`${styles.dataTypeBadge} ${DATA_TYPE_COLORS[col.inferredType]}`}
                            >
                              {DATA_TYPE_ICONS[col.inferredType]}
                            </span>
                            <span className={styles.previewTableHeaderText}>{col.sourceName}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeFile.analysis.previewRows.map((row: string[], rowIdx: number) => (
                      <tr key={rowIdx} className={styles.previewTableRow}>
                        {row.map((cell: string, cellIdx: number) => (
                          <td key={cellIdx} className={styles.previewTableCell}>
                            {cell || <span className={styles.nullValue}>null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <Button variant="outline" onClick={exportAnalysis}>
              <Download className="h-4 w-4 mr-2" />
              Export Analysis
            </Button>
            {onProceedToImport && (
              <Button onClick={proceedToImport}>
                Proceed to Import
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className={styles.loading}>
          <motion.div
            className={styles.loadingSpinner}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Database className="h-8 w-8" />
          </motion.div>
          <p>Analyzing CSV files...</p>
        </div>
      )}
    </div>
  );
}

function QualityBadge({ score }: { score: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[score]}`}>
      {score.charAt(0).toUpperCase() + score.slice(1)}
    </span>
  );
}

export default CsvAnalyzer;
