'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Type,
  Hash,
  Calendar,
  Database,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  analyzeCsvFile,
  type CsvAnalysisResult as ClientCsvAnalysisResult,
  type CsvDataType,
} from '@/lib/csv-parser';
import type { CsvConfig } from './types';
import styles from './EnhancedImportAnalysis.module.css';

interface EnhancedImportAnalysisProps {
  file: File;
  config: CsvConfig;
  onChange: (config: CsvConfig) => void;
}

// Unified column type that works with both server and client analysis
type UnifiedColumn = {
  sourceName: string;
  suggestedName: string;
  inferredType: string;
  sampleValues: string[];
  emptyCount: number;
  uniqueCount: number;
  isUniqueCandidate: boolean;
  // Client-side only fields (optional)
  totalCount?: number;
  nullPercentage?: number;
  uniquePercentage?: number;
  minValue?: string;
  maxValue?: string;
  typeConfidence?: number;
};

// Unified analysis type
type UnifiedAnalysis = {
  columns: UnifiedColumn[];
  rowCount: number;
  warnings: string[];
  isClientAnalysis: boolean;
};

const DATA_TYPE_ICONS: Record<string, React.ReactNode> = {
  TEXT: <Type className="h-3.5 w-3.5" />,
  INTEGER: <Hash className="h-3.5 w-3.5" />,
  REAL: <Hash className="h-3.5 w-3.5" />,
  BLOB: <Database className="h-3.5 w-3.5" />,
  DATE: <Calendar className="h-3.5 w-3.5" />,
  BOOLEAN: <CheckCircle2 className="h-3.5 w-3.5" />,
  NULL: <AlertCircle className="h-3.5 w-3.5" />,
};

const DATA_TYPE_COLORS: Record<string, string> = {
  TEXT: styles.typeText,
  INTEGER: styles.typeInteger,
  REAL: styles.typeReal,
  BLOB: styles.typeBlob,
  DATE: styles.typeDate,
  BOOLEAN: styles.typeBoolean,
  NULL: styles.typeNull,
};

export function EnhancedImportAnalysis({ file, config, onChange }: EnhancedImportAnalysisProps) {
  const [clientAnalysis, setClientAnalysis] = useState<ClientCsvAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());

  const performClientAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const delimiter = config.delimiter || ',';
      const quoteChar = config.quoteChar || '"';
      const analysis = await analyzeCsvFile(file, {
        delimiter,
        quoteChar,
        maxRows: 1000,
      });
      setClientAnalysis(analysis);
    } catch (err) {
      console.error('Client analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, config.delimiter, config.quoteChar]);

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

  // Convert to unified analysis format
  const getUnifiedAnalysis = (): UnifiedAnalysis | null => {
    if (config.analysis) {
      // Server analysis - access columns carefully
      const serverColumns = config.analysis.columns || [];
      return {
        columns: serverColumns.map(
          (col: {
            sourceName: string;
            suggestedName: string;
            inferredType: string;
            sampleValues: string[];
            emptyCount: number;
            uniqueCount: number;
            isUniqueCandidate: boolean;
          }) => ({
            sourceName: col.sourceName,
            suggestedName: col.suggestedName,
            inferredType: col.inferredType,
            sampleValues: col.sampleValues,
            emptyCount: col.emptyCount,
            uniqueCount: col.uniqueCount,
            isUniqueCandidate: col.isUniqueCandidate,
          })
        ),
        rowCount: config.analysis.rowCount,
        warnings: config.analysis.warnings,
        isClientAnalysis: false,
      };
    }
    if (clientAnalysis) {
      // Client analysis
      return {
        columns: clientAnalysis.columns.map((col) => ({
          sourceName: col.sourceName,
          suggestedName: col.suggestedName,
          inferredType: col.inferredType,
          sampleValues: col.sampleValues,
          emptyCount: col.emptyCount,
          uniqueCount: col.uniqueCount,
          isUniqueCandidate: col.isUniqueCandidate,
          totalCount: col.totalCount,
          nullPercentage: col.nullPercentage,
          uniquePercentage: col.uniquePercentage,
          minValue: col.minValue,
          maxValue: col.maxValue,
          typeConfidence: col.typeConfidence,
        })),
        rowCount: clientAnalysis.rowCount,
        warnings: clientAnalysis.warnings,
        isClientAnalysis: true,
      };
    }
    return null;
  };

  const analysis = getUnifiedAnalysis();
  const hasAnalysis = !!analysis;

  // Calculate quality score for unified column
  const calculateQualityScore = (column: UnifiedColumn): 'high' | 'medium' | 'low' => {
    const nullPct =
      column.nullPercentage ??
      (column.totalCount ? (column.emptyCount / column.totalCount) * 100 : 0);

    if (nullPct === 0) return 'high';
    if (nullPct < 10) return 'high';
    if (nullPct < 30) return 'medium';
    return 'low';
  };

  if (!hasAnalysis) {
    return (
      <div className={styles.noAnalysis}>
        <div className={styles.noAnalysisContent}>
          <FileSearch className={styles.noAnalysisIcon} />
          <p className={styles.noAnalysisText}>
            Analyze this CSV to preview column types, sample values, and data quality.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={performClientAnalysis}
            disabled={isAnalyzing}
            className={styles.analyzeButton}
          >
            {isAnalyzing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                </motion.div>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Quick Preview
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Build import plan from analysis
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
    selectedResolution: null,
  };

  const setColumn = (columnIndex: number, patch: Partial<(typeof plan.columns)[number]>) => {
    const nextColumns = plan.columns.map((column, index) =>
      index === columnIndex ? { ...column, ...patch } : column
    );
    onChange({ ...config, importPlan: { ...plan, columns: nextColumns } });
  };

  return (
    <div className={styles.container}>
      {/* Analysis Source Badge */}
      <div className={styles.analysisHeader}>
        <span className={styles.analysisTitle}>Column Mapping</span>
        {clientAnalysis && !config.analysis && (
          <span className={styles.clientAnalysisBadge}>
            <Sparkles className="h-3 w-3 mr-1" />
            Client-side preview
          </span>
        )}
        {config.analysis && <span className={styles.serverAnalysisBadge}>Server analysis</span>}
      </div>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className={styles.warnings}>
          {analysis.warnings.map((warning, idx) => (
            <motion.div
              key={idx}
              className={styles.warning}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <AlertCircle className={styles.warningIcon} />
              <span>{warning}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Enhanced Column Cards */}
      <div className={styles.columnsGrid}>
        {analysis.columns.map((column, index) => {
          const mapped = plan.columns[index];
          const isExpanded = expandedColumns.has(column.sourceName);
          const qualityScore = calculateQualityScore(column);
          const inferredType = column.inferredType || 'TEXT';

          return (
            <motion.div
              key={column.sourceName}
              className={styles.columnCard}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Card Header */}
              <div
                className={styles.columnCardHeader}
                onClick={() => toggleColumnExpand(column.sourceName)}
              >
                <div className={styles.columnCardTitle}>
                  {/* Include Checkbox */}
                  <input
                    type="checkbox"
                    checked={mapped?.include ?? true}
                    onChange={(e) => {
                      e.stopPropagation();
                      setColumn(index, { include: e.target.checked });
                    }}
                    className={styles.includeCheckbox}
                    aria-label={`Include column ${column.sourceName}`}
                  />

                  {/* Type Icon */}
                  <span
                    className={`${styles.typeIcon} ${DATA_TYPE_COLORS[inferredType] || styles.typeText}`}
                  >
                    {DATA_TYPE_ICONS[inferredType] || DATA_TYPE_ICONS.TEXT}
                  </span>

                  {/* Column Name */}
                  <span className={styles.columnSourceName}>{column.sourceName}</span>
                </div>

                <div className={styles.columnCardActions}>
                  {/* Quality Badge */}
                  <QualityBadge score={qualityScore} />

                  {/* Expand Icon */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className={styles.columnCardDetails}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {/* Target Name Input */}
                    <div className={styles.detailSection}>
                      <label className={styles.detailLabel}>Target Column Name</label>
                      <input
                        type="text"
                        value={mapped?.targetName ?? column.suggestedName}
                        onChange={(e) =>
                          setColumn(index, {
                            targetName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'),
                          })
                        }
                        className={styles.targetInput}
                        placeholder="column_name"
                        title="Target column name in database"
                        aria-label="Target column name input"
                      />
                    </div>

                    {/* Data Type Select */}
                    <div className={styles.detailSection}>
                      <label className={styles.detailLabel}>Data Type</label>
                      <select
                        value={mapped?.dataType ?? inferredType}
                        onChange={(e) => setColumn(index, { dataType: e.target.value })}
                        className={styles.typeSelect}
                        title="Select data type for this column"
                        aria-label="Data type select"
                      >
                        <option value="TEXT">TEXT</option>
                        <option value="INTEGER">INTEGER</option>
                        <option value="REAL">REAL</option>
                        <option value="BLOB">BLOB</option>
                        <option value="DATE">DATE</option>
                      </select>
                    </div>

                    {/* Sample Values */}
                    {column.sampleValues.length > 0 && (
                      <div className={styles.detailSection}>
                        <label className={styles.detailLabel}>
                          Sample Values ({column.sampleValues.length} shown)
                        </label>
                        <div className={styles.sampleValues}>
                          {column.sampleValues.map((val, i) => (
                            <code key={i} className={styles.sampleValue}>
                              {val.length > 25 ? `${val.substring(0, 25)}...` : val}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Statistics */}
                    <div className={styles.statsGrid}>
                      {column.totalCount !== undefined && (
                        <div className={styles.stat}>
                          <span className={styles.statValue}>
                            {column.totalCount.toLocaleString()}
                          </span>
                          <span className={styles.statLabel}>Total</span>
                        </div>
                      )}
                      <div className={styles.stat}>
                        <span className={styles.statValue}>{column.emptyCount}</span>
                        <span className={styles.statLabel}>Empty</span>
                      </div>
                      {column.nullPercentage !== undefined && (
                        <div className={styles.stat}>
                          <span className={styles.statValue}>
                            {column.nullPercentage.toFixed(1)}%
                          </span>
                          <span className={styles.statLabel}>Null %</span>
                        </div>
                      )}
                      <div className={styles.stat}>
                        <span className={styles.statValue}>{column.uniqueCount}</span>
                        <span className={styles.statLabel}>Unique</span>
                      </div>
                    </div>

                    {/* Range Info - only for client analysis */}
                    {(column.minValue || column.maxValue) && (
                      <div className={styles.detailSection}>
                        <label className={styles.detailLabel}>Range</label>
                        <div className={styles.rangeInfo}>
                          {column.minValue && <span>Min: {column.minValue}</span>}
                          {column.maxValue && <span>Max: {column.maxValue}</span>}
                        </div>
                      </div>
                    )}

                    {/* Unique Candidate */}
                    {column.isUniqueCandidate && (
                      <div className={styles.uniqueBadge}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Unique candidate (all values are distinct)
                      </div>
                    )}

                    {/* Constraints */}
                    <div className={styles.constraints}>
                      <label className={styles.constraintLabel}>
                        <input
                          type="checkbox"
                          checked={mapped?.nullable ?? column.emptyCount > 0}
                          onChange={(e) => setColumn(index, { nullable: e.target.checked })}
                        />
                        Nullable
                      </label>
                      <label className={styles.constraintLabel}>
                        <input
                          type="checkbox"
                          checked={mapped?.unique ?? column.isUniqueCandidate}
                          onChange={(e) => setColumn(index, { unique: e.target.checked })}
                        />
                        Unique
                      </label>
                      <label className={styles.constraintLabel}>
                        <input
                          type="checkbox"
                          checked={mapped?.primaryKey ?? false}
                          onChange={(e) => setColumn(index, { primaryKey: e.target.checked })}
                        />
                        Primary Key
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Row Count */}
      <div className={styles.rowCountInfo}>
        <span className={styles.rowCountLabel}>Total rows detected:</span>
        <span className={styles.rowCountValue}>{analysis.rowCount.toLocaleString()}</span>
      </div>
    </div>
  );
}

function QualityBadge({ score }: { score: 'high' | 'medium' | 'low' }) {
  const styles_map = {
    high: styles.qualityHigh,
    medium: styles.qualityMedium,
    low: styles.qualityLow,
  };

  return (
    <span className={`${styles.qualityBadge} ${styles_map[score]}`}>
      {score.charAt(0).toUpperCase() + score.slice(1)}
    </span>
  );
}

export default EnhancedImportAnalysis;
