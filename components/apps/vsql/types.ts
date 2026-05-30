import type {
  CsvAnalysisResult,
  CsvImportPlan,
  ResolutionRecommendation,
  SchemaColumn,
  SqlResult,
} from '@/lib/vsql-api';
import type { RefObject } from 'react';

export type VsqlView =
  | 'overview'
  | 'sql'
  | 'tableExplorer'
  | 'search'
  | 'visualizer'
  | 'performance'
  | 'settings'
  | 'feedback';
export type ConsoleEntry = {
  id: string;
  type: 'input' | 'success' | 'error' | 'info';
  content: string;
  results?: SqlResult[] | null;
};

/** One saved SQL console session (buffer + transcript), per workspace DB */
export type SqlConsoleSession = {
  id: string;
  name: string;
  buffer: string;
  history: ConsoleEntry[];
};

export type EditingCell = {
  rowIdx: number;
  colIdx: number;
  colName: string;
  dbRowId: number;
} | null;

export type CsvConfig = {
  tableName: string;
  delimiter: string;
  quoteChar: string;
  analysis?: CsvAnalysisResult | null;
  importPlan?: CsvImportPlan | null;
  selectedResolution?: ResolutionRecommendation | null;
  analyzing?: boolean;
  analysisError?: string | null;
  /** When true, pass append to API so rows merge into an existing table with the same name. */
  appendToExisting?: boolean;
};

export type DeleteTarget = {
  table: string;
  rowid: number;
} | null;

export type CsvImportProgress = {
  currentFileIdx: number;
  totalFiles: number;
  progressPct: number;
  stage: 'upload' | 'pixels' | 'finalize';
  label: string;
};

export type TableExplorerState = {
  tables: string[];
  expandedTable: string | null;
  tableSchema: SchemaColumn[] | null;
  /** Data tab: first N rows preview */
  previewColumns: string[] | null;
  previewData: unknown[][] | null;
  previewTotalRowCount: number;
  /** Spreadsheet tab: windowed grid */
  sheetColumns: string[] | null;
  sheetData: unknown[][] | null;
  sheetRowOffset: number;
  sheetColOffset: number;
  sheetTotalRows: number;
  sheetTotalCols: number;
  sheetWindowLoading: boolean;
  /** True while schema + preview rows are loading after selecting a table */
  tableDetailLoading: boolean;
  editingCell: EditingCell;
  editValue: string;
  /** Fullscreen spreadsheet overlay */
  sheetFullscreenOpen: boolean;
};

export type TableExplorerActions = {
  setExpandedTable: (table: string | null) => void;
  loadSelectedTableDetails: (table: string) => Promise<void>;
  loadSheetWindow: (table: string, rowOffset: number, colOffset: number) => Promise<void>;
  setSheetFullscreenOpen: (open: boolean) => void;
  setEditingCell: (cell: EditingCell) => void;
  setEditValue: (value: string) => void;
  saveCell: () => Promise<void>;
  cancelCellEdit: () => void;
  requestDeleteRow: (table: string, rowid: number) => void;
  refreshTables: () => Promise<void>;
};

export type SqlConsoleProps = {
  sqlQuery: string;
  setSqlQuery: (query: string | ((prev: string) => string)) => void;
  consoleHistory: ConsoleEntry[];
  consoleEndRef: RefObject<HTMLDivElement | null>;
  executeSql: () => Promise<void>;
  busy: boolean;
  error: string | null;
  sessions: SqlConsoleSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
};

export type TableExplorerPageProps = {
  dbId: string;
  busy: boolean;
  tableState: TableExplorerState;
  tableActions: TableExplorerActions;
};
