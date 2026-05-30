'use client';

/**
 * Client-side CSV parser for analyzing CSV files in the browser.
 * Provides column type inference, statistics, and sample values.
 */

export type CsvDataType = 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'DATE' | 'BOOLEAN' | 'NULL';

export interface ColumnAnalysis {
  sourceName: string;
  suggestedName: string;
  inferredType: CsvDataType;
  sampleValues: string[];
  emptyCount: number;
  uniqueCount: number;
  totalCount: number;
  nullPercentage: number;
  uniquePercentage: number;
  isUniqueCandidate: boolean;
  minValue?: string;
  maxValue?: string;
  // Additional metadata for type detection confidence
  typeConfidence: number;
  possibleTypes: Record<CsvDataType, number>;
}

export interface CsvAnalysisResult {
  columns: ColumnAnalysis[];
  rowCount: number;
  hasHeader: boolean;
  delimiter: string;
  quoteChar: string;
  warnings: string[];
  previewRows: string[][];
}

export interface ParseOptions {
  delimiter?: string;
  quoteChar?: string;
  hasHeader?: boolean;
  maxRows?: number;
}

const DEFAULT_OPTIONS: Required<ParseOptions> = {
  delimiter: ',',
  quoteChar: '"',
  hasHeader: true,
  maxRows: 1000,
};

/**
 * Parse a CSV file and return structured data
 */
export async function parseCsvFile(
  file: File,
  options: ParseOptions = {}
): Promise<{ headers: string[]; rows: string[][]; rawText: string }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

        if (lines.length === 0) {
          resolve({ headers: [], rows: [], rawText: '' });
          return;
        }

        // Parse headers
        const headers = parseLine(lines[0], opts.delimiter, opts.quoteChar);

        // Parse data rows (limit to maxRows)
        const rows: string[][] = [];
        const maxDataRows = Math.min(lines.length - 1, opts.maxRows);

        for (let i = 1; i <= maxDataRows; i++) {
          if (lines[i]) {
            const row = parseLine(lines[i], opts.delimiter, opts.quoteChar);
            // Pad row to match header length
            while (row.length < headers.length) {
              row.push('');
            }
            rows.push(row.slice(0, headers.length));
          }
        }

        resolve({ headers, rows, rawText: text });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseLine(line: string, delimiter: string, quoteChar: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === quoteChar) {
      if (inQuotes && nextChar === quoteChar) {
        // Escaped quote
        current += quoteChar;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Analyze a CSV file and return detailed column statistics
 */
export async function analyzeCsvFile(
  file: File,
  options: ParseOptions = {}
): Promise<CsvAnalysisResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { headers, rows, rawText } = await parseCsvFile(file, opts);

  if (headers.length === 0) {
    return {
      columns: [],
      rowCount: 0,
      hasHeader: opts.hasHeader,
      delimiter: opts.delimiter,
      quoteChar: opts.quoteChar,
      warnings: ['No data found in CSV file'],
      previewRows: [],
    };
  }

  const warnings: string[] = [];
  const columns: ColumnAnalysis[] = [];

  // Analyze each column
  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    const columnName = headers[colIndex] || `Column_${colIndex + 1}`;
    const values = rows.map((row) => row[colIndex] ?? '');

    const analysis = analyzeColumn(columnName, values);
    columns.push(analysis);
  }

  // Detect warnings
  if (rows.length === 0) {
    warnings.push('CSV file contains only headers, no data rows');
  }

  // Check for inconsistent column counts
  const columnCounts = new Set(rows.map((row) => row.length));
  if (columnCounts.size > 1) {
    warnings.push(`Inconsistent column counts detected: ${Array.from(columnCounts).join(', ')}`);
  }

  // Check for empty columns
  const emptyColumns = columns.filter((col) => col.totalCount === 0 || col.nullPercentage === 100);
  if (emptyColumns.length > 0) {
    warnings.push(`${emptyColumns.length} column(s) appear to be completely empty`);
  }

  // Generate preview rows (first 10)
  const previewRows = rows.slice(0, 10);

  return {
    columns,
    rowCount: rows.length,
    hasHeader: opts.hasHeader,
    delimiter: opts.delimiter,
    quoteChar: opts.quoteChar,
    warnings,
    previewRows,
  };
}

/**
 * Analyze a single column's data
 */
function analyzeColumn(sourceName: string, values: string[]): ColumnAnalysis {
  const totalCount = values.length;
  const nonEmptyValues = values.filter((v) => v.trim() !== '');
  const emptyCount = totalCount - nonEmptyValues.length;
  const uniqueValues = new Set(nonEmptyValues);
  const uniqueCount = uniqueValues.size;

  // Get sample values (first 3 non-null)
  const sampleValues = nonEmptyValues.slice(0, 3);

  // Infer data type
  const typeAnalysis = inferDataType(nonEmptyValues);

  // Calculate min/max for sortable types
  let minValue: string | undefined;
  let maxValue: string | undefined;

  if (typeAnalysis.inferredType === 'INTEGER' || typeAnalysis.inferredType === 'REAL') {
    const numericValues = nonEmptyValues.map((v) => parseFloat(v)).filter((n) => !isNaN(n));
    if (numericValues.length > 0) {
      minValue = String(Math.min(...numericValues));
      maxValue = String(Math.max(...numericValues));
    }
  } else if (typeAnalysis.inferredType === 'DATE') {
    const dates = nonEmptyValues.map((v) => new Date(v)).filter((d) => !isNaN(d.getTime()));
    if (dates.length > 0) {
      minValue = new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString();
      maxValue = new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString();
    }
  }

  return {
    sourceName,
    suggestedName: sanitizeColumnName(sourceName),
    inferredType: typeAnalysis.inferredType,
    sampleValues,
    emptyCount,
    uniqueCount,
    totalCount,
    nullPercentage: totalCount > 0 ? (emptyCount / totalCount) * 100 : 0,
    uniquePercentage: nonEmptyValues.length > 0 ? (uniqueCount / nonEmptyValues.length) * 100 : 0,
    isUniqueCandidate: uniqueCount === nonEmptyValues.length && nonEmptyValues.length > 0,
    minValue,
    maxValue,
    typeConfidence: typeAnalysis.confidence,
    possibleTypes: typeAnalysis.possibleTypes,
  };
}

/**
 * Infer the data type of a column based on its values
 */
function inferDataType(values: string[]): {
  inferredType: CsvDataType;
  confidence: number;
  possibleTypes: Record<CsvDataType, number>;
} {
  if (values.length === 0) {
    return {
      inferredType: 'TEXT',
      confidence: 0,
      possibleTypes: {
        TEXT: 0,
        INTEGER: 0,
        REAL: 0,
        BLOB: 0,
        DATE: 0,
        BOOLEAN: 0,
        NULL: 100,
      },
    };
  }

  let nullCount = 0;
  let integerCount = 0;
  let realCount = 0;
  let booleanCount = 0;
  let dateCount = 0;

  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed === '') {
      nullCount++;
      continue;
    }

    // Check boolean
    if (/^(true|false|yes|no|1|0|on|off)$/i.test(trimmed)) {
      booleanCount++;
      continue;
    }

    // Check integer
    if (/^-?\d+$/.test(trimmed)) {
      integerCount++;
      realCount++;
      continue;
    }

    // Check real number
    if (/^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(trimmed)) {
      realCount++;
      continue;
    }

    // Check date
    if (isDate(trimmed)) {
      dateCount++;
      continue;
    }
  }

  const nonNullCount = values.length - nullCount;

  const possibleTypes: Record<CsvDataType, number> = {
    NULL: (nullCount / values.length) * 100,
    BOOLEAN: (booleanCount / values.length) * 100,
    INTEGER: (integerCount / values.length) * 100,
    REAL: (realCount / values.length) * 100,
    DATE: (dateCount / values.length) * 100,
    TEXT: 0,
    BLOB: 0,
  };

  // Remaining is text
  const textCount = values.length - nullCount - booleanCount - realCount - dateCount;
  possibleTypes.TEXT = (textCount / values.length) * 100;

  // Determine best type
  let inferredType: CsvDataType = 'TEXT';
  let confidence = possibleTypes.TEXT;

  if (nonNullCount === 0) {
    inferredType = 'NULL';
    confidence = 100;
  } else if (integerCount === nonNullCount) {
    inferredType = 'INTEGER';
    confidence = 100;
  } else if (realCount === nonNullCount) {
    inferredType = 'REAL';
    confidence = 100;
  } else if (booleanCount === nonNullCount) {
    inferredType = 'TEXT'; // Store booleans as TEXT for now
    confidence = 100;
  } else if (dateCount === nonNullCount) {
    inferredType = 'DATE';
    confidence = 100;
  }

  return { inferredType, confidence, possibleTypes };
}

/**
 * Check if a string looks like a date
 */
function isDate(value: string): boolean {
  // ISO date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
  ];

  if (datePatterns.some((p) => p.test(value))) {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  return false;
}

/**
 * Sanitize a column name for database use
 */
function sanitizeColumnName(name: string): string {
  return (
    name
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
      .substring(0, 64) || 'column'
  );
}

/**
 * Auto-detect the delimiter in a CSV string
 */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return ',';

  const firstLine = lines[0];
  const delimiters = [',', ';', '\t', '|'];
  const counts: Record<string, number> = {};

  for (const delim of delimiters) {
    counts[delim] = firstLine.split(delim).length;
  }

  // Return delimiter with most occurrences
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ',';
}

/**
 * Format bytes to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Get data quality score for a column
 */
export function getDataQualityScore(column: ColumnAnalysis): 'high' | 'medium' | 'low' {
  const nullPct = column.nullPercentage;

  if (nullPct === 0 && column.uniquePercentage > 0) return 'high';
  if (nullPct < 10) return 'high';
  if (nullPct < 30) return 'medium';
  return 'low';
}
