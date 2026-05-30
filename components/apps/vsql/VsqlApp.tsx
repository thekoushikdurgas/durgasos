'use client';

import { Spinner } from '@/components/apps/vsql/ui/spinner-1';
import { ToastContainer } from '@/components/apps/vsql/ui/toast';
import { useToast } from '@/hooks/use-vsql-toast';
import {
  analyzeCsvImport,
  apiBase,
  createDatabase,
  decodeMp4Upload,
  deleteRow,
  encodeVideo,
  frameMeta,
  getRows,
  getSchema,
  importCsv,
  listTables,
  patchRow,
  runSql,
  submitFeedback,
  videoDownloadUrl,
  type CsvAnalysisResult,
  type CsvImportPlan,
  type SchemaColumn,
} from '@/lib/vsql-api';
import {
  swallowClientError,
  swallowStorageError,
  tryLocalStorageGet,
  tryLocalStorageGetJson,
  tryLocalStorageSetJson,
} from '@/lib/safe-client-storage';
import { AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AppShell } from './AppShell';
import { ConfirmDialog } from './ConfirmDialog';
import { CsvImportModal } from './CsvImportModal';
import { FeedbackPage } from './FeedbackPage';
import { OverviewPage } from './OverviewPage';
import { PerformanceLogPage } from './PerformanceLogPage';
import { SearchConsolePage } from './SearchConsolePage';
import { SettingsPage } from './SettingsPage';
import { SqlConsolePage } from './SqlConsolePage';
import { TableExplorerPage } from './TableExplorerPage';
import { VideoInspectorPage } from './VideoInspectorPage';
import styles from './VsqlApp.module.css';
import { DB_STORAGE_KEY, MAX_CSV_IMPORT_BYTES, VIDEO_FPS_DEFAULT } from './constants';
import type {
  ConsoleEntry,
  CsvConfig,
  CsvImportProgress,
  DeleteTarget,
  EditingCell,
  SqlConsoleSession,
  TableExplorerActions,
  TableExplorerState,
  VsqlView,
} from './types';

const TABLE_PREVIEW_ROW_LIMIT = 50;
const TABLE_SHEET_PAGE = 50;

const DEFAULT_SQL_BUFFER = 'SELECT * FROM data LIMIT 50;';
const SQL_SESSIONS_STORAGE_PREFIX = 'vsql_sql_sessions_v1_';

function sqlSessionsStorageKey(dbId: string) {
  return `${SQL_SESSIONS_STORAGE_PREFIX}${dbId}`;
}

function initialSqlConsoleHistory(): ConsoleEntry[] {
  return [
    {
      id: 'start',
      type: 'info',
      content: 'vSQL Terminal initialized. Type a SQL command, or type \\help for options.',
    },
  ];
}

function createSqlSession(name: string): SqlConsoleSession {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name,
    buffer: DEFAULT_SQL_BUFFER,
    history: initialSqlConsoleHistory(),
  };
}

type SqlWorkspaceState = {
  sessions: SqlConsoleSession[];
  activeId: string;
};

function patchActiveSqlSession(
  prev: SqlWorkspaceState,
  patch: (session: SqlConsoleSession) => SqlConsoleSession
): SqlWorkspaceState {
  const hit = prev.sessions.find((s) => s.id === prev.activeId);
  if (!hit) return prev;
  return {
    ...prev,
    sessions: prev.sessions.map((s) => (s.id === prev.activeId ? patch(s) : s)),
  };
}

function buildImportPlan(tableName: string, analysis: CsvAnalysisResult): CsvImportPlan {
  return {
    tableName,
    mode: 'replace',
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
}

/** Map plan targets to existing DB column names so append imports match the table schema. */
function alignImportPlanForAppend(plan: CsvImportPlan, existing: SchemaColumn[]): CsvImportPlan {
  if (existing.length === 0) return plan;
  const byLower = new Map(existing.map((c) => [c.name.toLowerCase(), c.name] as const));
  const columns = plan.columns.map((col) => {
    const sn = col.sourceName.trim();
    const tn = col.targetName.trim();
    const match = byLower.get(sn.toLowerCase()) ?? byLower.get(tn.toLowerCase());
    if (match) {
      return { ...col, targetName: match };
    }
    return col;
  });
  return { ...plan, columns };
}

export function VsqlApp() {
  const [dbId, setDbId] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, toast, dismiss } = useToast();
  const [currentView, setCurrentView] = useState<VsqlView>('overview');

  const [sqlWorkspace, setSqlWorkspace] = useState<SqlWorkspaceState>(() => {
    const s = createSqlSession('Main');
    return { sessions: [s], activeId: s.id };
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !dbId) return;
    const raw = tryLocalStorageGet(sqlSessionsStorageKey(dbId));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<SqlWorkspaceState>;
        if (
          Array.isArray(parsed.sessions) &&
          parsed.sessions.length > 0 &&
          typeof parsed.sessions[0]?.id === 'string' &&
          typeof parsed.sessions[0]?.buffer === 'string' &&
          Array.isArray(parsed.sessions[0]?.history)
        ) {
          const sessions = parsed.sessions as SqlConsoleSession[];
          const activeId =
            typeof parsed.activeId === 'string' && sessions.some((x) => x.id === parsed.activeId)
              ? parsed.activeId
              : sessions[0].id;
          setSqlWorkspace({ sessions, activeId });
          return;
        }
      } catch (err) {
        swallowStorageError('vsql.sqlSessions.load', err);
      }
    }
    const s = createSqlSession('Main');
    setSqlWorkspace({ sessions: [s], activeId: s.id });
  }, [dbId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !dbId) return;
    const tid = window.setTimeout(() => {
      tryLocalStorageSetJson(sqlSessionsStorageKey(dbId), sqlWorkspace);
    }, 200);
    return () => clearTimeout(tid);
  }, [dbId, sqlWorkspace]);

  const activeSqlSession = useMemo(
    () => sqlWorkspace.sessions.find((s) => s.id === sqlWorkspace.activeId),
    [sqlWorkspace.sessions, sqlWorkspace.activeId]
  );

  const sqlQuery = activeSqlSession?.buffer ?? DEFAULT_SQL_BUFFER;
  const consoleHistory = activeSqlSession?.history ?? initialSqlConsoleHistory();

  const setSqlQuery = useCallback((next: string | ((prev: string) => string)) => {
    setSqlWorkspace((prev) =>
      patchActiveSqlSession(prev, (s) => ({
        ...s,
        buffer: typeof next === 'function' ? next(s.buffer) : next,
      }))
    );
  }, []);

  const setConsoleHistory = useCallback(
    (next: ConsoleEntry[] | ((prev: ConsoleEntry[]) => ConsoleEntry[])) => {
      setSqlWorkspace((prev) =>
        patchActiveSqlSession(prev, (s) => ({
          ...s,
          history: typeof next === 'function' ? next(s.history) : next,
        }))
      );
    },
    []
  );

  const onSelectSqlSession = useCallback((id: string) => {
    setSqlWorkspace((prev) =>
      prev.sessions.some((s) => s.id === id) ? { ...prev, activeId: id } : prev
    );
  }, []);

  const onNewSqlSession = useCallback(() => {
    setSqlWorkspace((prev) => {
      const n = prev.sessions.length + 1;
      const s = createSqlSession(`Session ${n}`);
      return { sessions: [...prev.sessions, s], activeId: s.id };
    });
  }, []);

  const onDeleteSqlSession = useCallback((id: string) => {
    setSqlWorkspace((prev) => {
      if (prev.sessions.length <= 1) return prev;
      const sessions = prev.sessions.filter((s) => s.id !== id);
      const nextActive = prev.activeId === id ? (sessions[0]?.id ?? prev.activeId) : prev.activeId;
      return { sessions, activeId: nextActive };
    });
  }, []);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [tableSchema, setTableSchema] = useState<TableExplorerState['tableSchema']>(null);
  const [previewColumns, setPreviewColumns] = useState<string[] | null>(null);
  const [previewData, setPreviewData] = useState<unknown[][] | null>(null);
  const [previewTotalRowCount, setPreviewTotalRowCount] = useState(0);
  const [sheetColumns, setSheetColumns] = useState<string[] | null>(null);
  const [sheetData, setSheetData] = useState<unknown[][] | null>(null);
  const [sheetRowOffset, setSheetRowOffset] = useState(0);
  const [sheetColOffset, setSheetColOffset] = useState(0);
  const [sheetTotalRows, setSheetTotalRows] = useState(0);
  const [sheetTotalCols, setSheetTotalCols] = useState(0);
  const [sheetWindowLoading, setSheetWindowLoading] = useState(false);
  const [sheetFullscreenOpen, setSheetFullscreenOpen] = useState(false);
  const [tableDetailLoading, setTableDetailLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const [encodeHourShell, setEncodeHourShell] = useState(false);
  const [videoFps, setVideoFps] = useState(VIDEO_FPS_DEFAULT);
  const [compressionAlgorithm, setCompressionAlgorithm] = useState<'zstd' | 'zlib'>('zstd');
  const [compressionLevel, setCompressionLevel] = useState<'fast' | 'balanced' | 'maximum'>(
    'balanced'
  );

  const [payloadFrames, setPayloadFrames] = useState(1);
  const [videoFileSize, setVideoFileSize] = useState(0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [experienceBusy, setExperienceBusy] = useState(false);
  const [overviewRatingOpen, setOverviewRatingOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let s = sessionStorage.getItem('vsql_session');
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem('vsql_session', s);
    }
    setSessionId(s);
  }, []);

  const SETTINGS_KEY = 'vsql_ui_settings';
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = tryLocalStorageGetJson<{
      videoFps?: number;
      encodeHourShell?: boolean;
      compressionAlgorithm?: 'zstd' | 'zlib';
      compressionLevel?: 'fast' | 'balanced' | 'maximum';
    }>(SETTINGS_KEY, {});
    if (typeof p.videoFps === 'number' && p.videoFps >= 1 && p.videoFps <= 120) {
      setVideoFps(p.videoFps);
    }
    if (typeof p.encodeHourShell === 'boolean') {
      setEncodeHourShell(p.encodeHourShell);
    }
    if (p.compressionAlgorithm === 'zlib' || p.compressionAlgorithm === 'zstd') {
      setCompressionAlgorithm(p.compressionAlgorithm);
    }
    if (
      p.compressionLevel === 'fast' ||
      p.compressionLevel === 'balanced' ||
      p.compressionLevel === 'maximum'
    ) {
      setCompressionLevel(p.compressionLevel);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    tryLocalStorageSetJson(SETTINGS_KEY, {
      videoFps,
      encodeHourShell,
      compressionAlgorithm,
      compressionLevel,
    });
  }, [videoFps, encodeHourShell, compressionAlgorithm, compressionLevel]);
  const [selectedInspectorTable, setSelectedInspectorTable] = useState<string | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const mp4InputRef = useRef<HTMLInputElement>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [pendingCsvFiles, setPendingCsvFiles] = useState<File[]>([]);
  const [csvConfigs, setCsvConfigs] = useState<CsvConfig[]>([]);
  const [csvProgress, setCsvProgress] = useState<CsvImportProgress | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const csvSmoothRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [newDbDialogOpen, setNewDbDialogOpen] = useState(false);

  const clearCsvSmooth = useCallback(() => {
    if (csvSmoothRef.current !== null) {
      clearInterval(csvSmoothRef.current);
      csvSmoothRef.current = null;
    }
  }, []);

  const refreshTablesFor = useCallback(async (target: string) => {
    try {
      const next = await listTables(target);
      setTables(next);
      setSelectedInspectorTable((current) =>
        current && next.includes(current) ? current : (next[0] ?? null)
      );
    } catch (err) {
      swallowClientError('vsql.tables', err);
      setTables([]);
      setSelectedInspectorTable(null);
    }
  }, []);

  const refreshFrameMetaFor = useCallback(
    async (target: string, table?: string | null) => {
      const hourFrames = 60 * 60 * videoFps;
      try {
        const meta = await frameMeta(target, hourFrames, table);
        setPayloadFrames(Math.max(1, meta.payload_frame_count));
        setVideoFileSize(Math.max(0, meta.video_size_bytes));
        setCurrentFrameIndex((index) => Math.min(index, Math.max(0, meta.payload_frame_count - 1)));
      } catch (err) {
        swallowClientError('vsql.frameMeta', err);
        setPayloadFrames(1);
        setVideoFileSize(0);
        setCurrentFrameIndex(0);
      }
    },
    [videoFps]
  );

  const refreshTables = useCallback(
    async (id?: string) => {
      const target = id ?? dbId;
      if (!target) return;
      await refreshTablesFor(target);
    },
    [dbId, refreshTablesFor]
  );

  const refreshFrameMeta = useCallback(
    async (id?: string, table?: string | null) => {
      const target = id ?? dbId;
      if (!target) return;
      await refreshFrameMetaFor(target, table ?? selectedInspectorTable);
    },
    [dbId, refreshFrameMetaFor, selectedInspectorTable]
  );

  const createAndSelectDatabase = useCallback(async () => {
    setBusy(true);
    try {
      const { id } = await createDatabase();
      sessionStorage.setItem(DB_STORAGE_KEY, id);
      setDbId(id);
      setExpandedTable(null);
      toast({
        title: 'Database Created',
        description: `New workspace ${id.slice(0, 8)}... ready`,
        type: 'success',
      });
      setTableSchema(null);
      setPreviewColumns(null);
      setPreviewData(null);
      setError(null);
      await refreshTables(id);
      await refreshFrameMeta(id);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      toast({
        title: 'Database Creation Failed',
        description: errorMsg,
        type: 'error',
      });
    } finally {
      setBusy(false);
      setNewDbDialogOpen(false);
    }
  }, [refreshFrameMeta, refreshTables, toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing =
          typeof window !== 'undefined' ? sessionStorage.getItem(DB_STORAGE_KEY) : null;
        if (existing) {
          if (!cancelled) {
            setDbId(existing);
            await refreshTablesFor(existing);
            await refreshFrameMetaFor(existing);
          }
          return;
        }
        const { id } = await createDatabase();
        sessionStorage.setItem(DB_STORAGE_KEY, id);
        if (!cancelled) {
          setDbId(id);
          await refreshTablesFor(id);
          await refreshFrameMetaFor(id);
        }
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshFrameMetaFor, refreshTablesFor]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleHistory]);

  useEffect(() => {
    if (!dbId) return;
    void refreshFrameMetaFor(dbId, selectedInspectorTable);
  }, [dbId, refreshFrameMetaFor, selectedInspectorTable]);

  useEffect(() => {
    if (currentView !== 'overview') {
      setOverviewRatingOpen(false);
    }
  }, [currentView]);

  const clearTableGridState = useCallback(() => {
    setPreviewColumns(null);
    setPreviewData(null);
    setPreviewTotalRowCount(0);
    setSheetColumns(null);
    setSheetData(null);
    setSheetRowOffset(0);
    setSheetColOffset(0);
    setSheetTotalRows(0);
    setSheetTotalCols(0);
    setSheetFullscreenOpen(false);
    setTableDetailLoading(false);
  }, []);

  const handleSetExpandedTable = useCallback(
    (table: string | null) => {
      setExpandedTable(table);
      if (!table) {
        clearTableGridState();
        setTableSchema(null);
      }
    },
    [clearTableGridState]
  );

  const loadSheetWindow = useCallback(
    async (table: string, rowOffset: number, colOffset: number) => {
      if (!dbId) return;
      setEditingCell(null);
      setSheetRowOffset(rowOffset);
      setSheetColOffset(colOffset);
      setSheetWindowLoading(true);
      try {
        const r = await getRows(dbId, table, TABLE_SHEET_PAGE, rowOffset, {
          columnOffset: colOffset,
          columnLimit: TABLE_SHEET_PAGE,
        });
        setSheetColumns(r.columns);
        setSheetData(r.values);
        setSheetTotalRows(r.totalRowCount);
        setSheetTotalCols(r.totalColumnCount);
      } catch (err) {
        swallowClientError('vsql.sheetWindow', err);
        setSheetColumns([]);
        setSheetData([]);
        setSheetTotalRows(0);
        setSheetTotalCols(0);
      } finally {
        setSheetWindowLoading(false);
      }
    },
    [dbId]
  );

  const loadSelectedTableDetails = useCallback(
    async (table: string) => {
      if (!dbId) return;
      setTableDetailLoading(true);
      setEditingCell(null);
      try {
        const [schema, r] = await Promise.all([
          getSchema(dbId, table).catch(() => [] as SchemaColumn[]),
          getRows(dbId, table, TABLE_PREVIEW_ROW_LIMIT, 0).catch(() => ({
            columns: [] as string[],
            values: [] as unknown[][],
            totalRowCount: 0,
          })),
        ]);
        setTableSchema(schema);
        let columns = r.columns;
        let values = r.values;
        if (!columns.includes('_rowid') && !columns.includes('rowid')) {
          columns = ['_rowid', ...columns];
          values = values.map((row, i) => [i + 1, ...(row as unknown[])] as unknown[]);
        }
        setPreviewColumns(columns);
        setPreviewData(values);
        setPreviewTotalRowCount(r.totalRowCount);
      } finally {
        setTableDetailLoading(false);
      }
    },
    [dbId]
  );

  const executeSql = useCallback(async () => {
    if (!dbId) return;
    const query = sqlQuery.trim();
    if (!query) return;

    const entryId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setConsoleHistory((prev) => [...prev, { id: `${entryId}_in`, type: 'input', content: query }]);

    if (query.startsWith('\\')) {
      const cmd = query.toLowerCase();
      if (cmd === '\\clear') {
        setConsoleHistory([{ id: 'clear', type: 'info', content: 'Console cleared.' }]);
        setSqlQuery('');
        return;
      }
      if (cmd === '\\help') {
        setConsoleHistory((prev) => [
          ...prev,
          {
            id: `${entryId}_help`,
            type: 'info',
            content: [
              'Commands:',
              '  \\clear  — clear the console',
              '  \\tables — list logical table names',
              '  \\help   — this message',
              '',
              'Supported SQL-like grammar (vSQL / backend):',
              '  SELECT * | col1, col2 FROM "table_name" [WHERE col = \'x\'] [LIMIT n] [OFFSET n];',
              '  INSERT INTO "t" (c1, c2) VALUES (v1, v2);',
              '  UPDATE "t" SET col = val WHERE rowid = n;',
              '  DELETE FROM "t" WHERE rowid = n;',
              '  CREATE TABLE "t" (c1 TYPE, c2 TYPE, ...);',
              'Use double-quoted identifiers for table names with special characters.',
            ].join('\n'),
          },
        ]);
        return;
      }
      if (cmd === '\\tables') {
        const tableNames = await listTables(dbId);
        setConsoleHistory((prev) => [
          ...prev,
          {
            id: `${entryId}_tables`,
            type: 'success',
            content: 'Tables:',
            results: [
              {
                columns: ['name'],
                values: tableNames.map((table) => [table]),
                rowcount: -1,
              },
            ],
          },
        ]);
        return;
      }
      setConsoleHistory((prev) => [
        ...prev,
        {
          id: `${entryId}_unknown`,
          type: 'error',
          content: 'Unknown command.',
        },
      ]);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await runSql(dbId, query);
      setConsoleHistory((prev) => [
        ...prev,
        {
          id: `${entryId}_ok`,
          type: 'success',
          content: 'Query executed successfully.',
          results: [result],
        },
      ]);
      setSqlQuery('');
      if (/\b(INSERT|UPDATE|DELETE|CREATE|DROP)\b/.test(query.toUpperCase())) {
        await refreshTables(dbId);
        await refreshFrameMeta(dbId);
        setPreviewRevision((r) => r + 1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setConsoleHistory((prev) => [
        ...prev,
        { id: `${entryId}_err`, type: 'error', content: message },
      ]);
    } finally {
      setBusy(false);
    }
  }, [dbId, refreshFrameMeta, refreshTables, sqlQuery]);

  const saveCell = useCallback(async () => {
    if (!dbId || !editingCell || !expandedTable) return;
    setBusy(true);
    try {
      await patchRow(dbId, expandedTable, editingCell.dbRowId, editingCell.colName, editValue);
      await loadSelectedTableDetails(expandedTable);
      if (sheetFullscreenOpen) {
        await loadSheetWindow(expandedTable, sheetRowOffset, sheetColOffset);
      }
      await refreshFrameMeta(dbId, expandedTable);
      setPreviewRevision((r) => r + 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setEditingCell(null);
    }
  }, [
    dbId,
    editValue,
    editingCell,
    expandedTable,
    loadSheetWindow,
    loadSelectedTableDetails,
    refreshFrameMeta,
    sheetColOffset,
    sheetRowOffset,
    sheetFullscreenOpen,
  ]);

  const cancelCellEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const confirmDeleteRow = useCallback(async () => {
    if (!dbId || !deleteTarget) return;
    setBusy(true);
    try {
      await deleteRow(dbId, deleteTarget.table, deleteTarget.rowid);
      await loadSelectedTableDetails(deleteTarget.table);
      if (sheetFullscreenOpen && expandedTable === deleteTarget.table) {
        await loadSheetWindow(deleteTarget.table, sheetRowOffset, sheetColOffset);
      }
      await refreshFrameMeta(dbId, deleteTarget.table);
      setPreviewRevision((r) => r + 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  }, [
    dbId,
    deleteTarget,
    expandedTable,
    loadSheetWindow,
    loadSelectedTableDetails,
    refreshFrameMeta,
    sheetColOffset,
    sheetRowOffset,
    sheetFullscreenOpen,
  ]);

  const handleCsvSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const oversized = files.find((f) => f.size > MAX_CSV_IMPORT_BYTES);
    if (oversized) {
      toast({
        title: 'File too large',
        description: `Each file must be at most 10 GiB. "${oversized.name}" exceeds the limit.`,
        type: 'error',
      });
      event.target.value = '';
      return;
    }
    setPendingCsvFiles(files);
    setCsvConfigs(
      files.map(() => ({
        tableName: '',
        delimiter: ',',
        quoteChar: '"',
        appendToExisting: false,
      }))
    );
    setCsvModalOpen(true);
    event.target.value = '';
  };

  const analyzeCsvFile = useCallback(
    async (index: number) => {
      const file = pendingCsvFiles[index];
      const config = csvConfigs[index];
      if (!file || !config) return;
      setCsvConfigs((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, analyzing: true, analysisError: null } : item
        )
      );
      try {
        const analysis = await analyzeCsvImport(file, config.delimiter, config.quoteChar);
        const importPlan = buildImportPlan(config.tableName, analysis);
        setCsvConfigs((prev) =>
          prev.map((item, idx) =>
            idx === index
              ? {
                  ...item,
                  analysis,
                  importPlan,
                  selectedResolution: importPlan.selectedResolution,
                  analyzing: false,
                  analysisError: null,
                }
              : item
          )
        );
      } catch (err) {
        setCsvConfigs((prev) =>
          prev.map((item, idx) =>
            idx === index
              ? {
                  ...item,
                  analyzing: false,
                  analysisError: err instanceof Error ? err.message : String(err),
                }
              : item
          )
        );
      }
    },
    [csvConfigs, pendingCsvFiles]
  );

  const confirmCsvImport = useCallback(async () => {
    if (!dbId || pendingCsvFiles.length === 0) return;
    setBusy(true);
    clearCsvSmooth();
    try {
      let totalRows = 0;
      let lastTable = '';
      const totalFiles = pendingCsvFiles.length;
      for (let index = 0; index < pendingCsvFiles.length; index++) {
        const file = pendingCsvFiles[index];
        let config = csvConfigs[index];
        const startPct = (index / totalFiles) * 100;
        const fileSpan = 100 / totalFiles;
        const uploadCap = startPct + fileSpan * 0.88;
        setCsvProgress({
          currentFileIdx: index,
          totalFiles,
          stage: 'upload',
          progressPct: Math.min(startPct + 2, uploadCap),
          label: `Uploading ${file.name}…`,
        });
        csvSmoothRef.current = setInterval(() => {
          setCsvProgress((prev) => {
            if (!prev || prev.currentFileIdx !== index || prev.stage !== 'upload') {
              return prev;
            }
            const step = Math.max(0.25, fileSpan * 0.04);
            const next = Math.min(uploadCap, prev.progressPct + step);
            return { ...prev, progressPct: next };
          });
        }, 100);
        try {
          if (!config.importPlan) {
            const analysis = await analyzeCsvImport(file, config.delimiter, config.quoteChar);
            config = {
              ...config,
              analysis,
              importPlan: buildImportPlan(config.tableName, analysis),
            };
          }
          let importPlan = config.importPlan ?? buildImportPlan(config.tableName, config.analysis!);
          if (config.appendToExisting && config.tableName.trim()) {
            try {
              const existingCols = await getSchema(dbId, config.tableName);
              if (existingCols.length > 0) {
                importPlan = alignImportPlanForAppend(importPlan, existingCols);
              }
            } catch (err) {
              swallowClientError('vsql.csvSchema', err);
            }
          }
          const result = await importCsv(
            dbId,
            file,
            config.tableName,
            config.delimiter,
            config.quoteChar,
            {
              append: Boolean(config.appendToExisting),
              compression: true,
              importPlan: {
                ...importPlan,
                tableName: config.tableName,
              },
            }
          );
          totalRows += result.imported_rows;
          lastTable = result.table;
        } finally {
          clearCsvSmooth();
        }
        setCsvProgress({
          currentFileIdx: index,
          totalFiles,
          stage: 'pixels',
          progressPct: startPct + fileSpan * 0.95,
          label: 'Encoding rows into 1280×720 RGBA frames…',
        });
      }
      setCsvProgress({
        currentFileIdx: totalFiles - 1,
        totalFiles,
        stage: 'finalize',
        progressPct: 100,
        label: 'Finishing…',
      });
      await refreshTables(dbId);
      if (lastTable) {
        setSelectedInspectorTable(lastTable);
      }
      await refreshFrameMeta(dbId, lastTable || selectedInspectorTable);
      setPreviewRevision((r) => r + 1);
      setCsvModalOpen(false);
      setPendingCsvFiles([]);
      setCsvConfigs([]);
      clearCsvSmooth();
      setCsvProgress(null);
      setCurrentView('sql');
      if (lastTable) {
        setSqlQuery(`SELECT * FROM "${lastTable}" LIMIT 50;`);
      }
      setConsoleHistory((prev) => [
        ...prev,
        {
          id: `${Date.now()}_csv`,
          type: 'info',
          content: `Imported ${totalRows} row${totalRows === 1 ? '' : 's'} from CSV.`,
        },
      ]);
      setError(null);
      toast({
        title: 'CSV Import Successful',
        description: `Imported ${totalRows} row${totalRows === 1 ? '' : 's'} from CSV`,
        type: 'success',
      });
    } catch (err) {
      clearCsvSmooth();
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      toast({
        title: 'Import Failed',
        description: errorMsg,
        type: 'error',
      });
    } finally {
      setBusy(false);
      clearCsvSmooth();
      setCsvProgress(null);
    }
  }, [
    csvConfigs,
    dbId,
    pendingCsvFiles,
    clearCsvSmooth,
    refreshFrameMeta,
    refreshTables,
    selectedInspectorTable,
    toast,
  ]);

  const handleDecodeSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    void (async () => {
      setBusy(true);
      try {
        const { id } = await decodeMp4Upload(file);
        sessionStorage.setItem(DB_STORAGE_KEY, id);
        setDbId(id);
        await refreshTables(id);
        await refreshFrameMeta(id, null);
        setPreviewRevision((r) => r + 1);
        setCurrentView('sql');
        setError(null);
      } catch (err) {
        setError(`Decode: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setBusy(false);
      }
    })();
  };

  const handleEncodeVideo = useCallback(async () => {
    if (!dbId) return;
    setBusy(true);
    try {
      const tableName = tables.length > 0 ? (selectedInspectorTable ?? tables[0] ?? null) : null;
      await encodeVideo(dbId, encodeHourShell ? 60 * 60 * videoFps : null, videoFps, {
        tableName,
        compressionAlgorithm,
        compressionLevel,
      });
      setError(null);
      setPreviewRevision((r) => r + 1);
    } catch (err) {
      setError(`Encode: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }, [
    dbId,
    encodeHourShell,
    videoFps,
    tables,
    selectedInspectorTable,
    compressionAlgorithm,
    compressionLevel,
  ]);

  const submitExperience = useCallback(
    async (message: string, rating: number | null) => {
      if (!dbId || !sessionId) return;
      setExperienceBusy(true);
      try {
        await submitFeedback(dbId, sessionId, message, rating);
        setPreviewRevision((r) => r + 1);
        toast({
          title: 'Feedback saved',
          description: 'Stored in the user_experience video table.',
          type: 'success',
        });
      } catch (err) {
        toast({
          title: 'Feedback failed',
          description: err instanceof Error ? err.message : String(err),
          type: 'error',
        });
      } finally {
        setExperienceBusy(false);
      }
    },
    [dbId, sessionId, toast]
  );

  const tableState: TableExplorerState = {
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
  };

  const tableActions: TableExplorerActions = useMemo(
    () => ({
      setExpandedTable: handleSetExpandedTable,
      loadSelectedTableDetails,
      loadSheetWindow,
      setSheetFullscreenOpen,
      setEditingCell,
      setEditValue,
      saveCell,
      cancelCellEdit,
      requestDeleteRow: (table, rowid) => setDeleteTarget({ table, rowid }),
      refreshTables: async () => {
        await refreshTables();
      },
    }),
    [
      cancelCellEdit,
      handleSetExpandedTable,
      loadSheetWindow,
      loadSelectedTableDetails,
      refreshTables,
      saveCell,
    ]
  );

  if (bootError) {
    return <BootError message={bootError} />;
  }

  if (!dbId) {
    return (
      <div className={styles.loadingScreen}>
        <Spinner color="#22d3ee" />
        Initializing workspace...
      </div>
    );
  }

  return (
    <>
      <input
        type="file"
        title="Upload CSV files"
        accept=".csv,text/csv"
        multiple
        className={styles.hiddenInput}
        ref={csvInputRef}
        onChange={handleCsvSelected}
      />
      <input
        type="file"
        title="Upload encoded video"
        accept="video/mp4,video/*"
        className={styles.hiddenInput}
        ref={mp4InputRef}
        onChange={handleDecodeSelected}
      />

      <AppShell
        currentView={currentView}
        setCurrentView={setCurrentView}
        dbId={dbId}
        apiBase={apiBase()}
        busy={busy}
        payloadFrames={payloadFrames}
        tablesCount={tables.length}
        encodeReady={Boolean(dbId)}
        videoFps={videoFps}
        onImportCsv={() => csvInputRef.current?.click()}
        onDecodeMp4={() => mp4InputRef.current?.click()}
        onEncodeVideo={handleEncodeVideo}
        downloadUrl={videoDownloadUrl(dbId, selectedInspectorTable)}
        onNewDatabase={() => setNewDbDialogOpen(true)}
        overviewToolbar={
          currentView === 'overview'
            ? {
                onOpenRate: () => setOverviewRatingOpen(true),
                experienceBusy,
              }
            : undefined
        }
      >
        {currentView === 'overview' && (
          <OverviewPage
            onImportCsv={() => csvInputRef.current?.click()}
            onOpenSql={() => setCurrentView('sql')}
            onOpenInspector={() => setCurrentView('visualizer')}
            onSubmitExperience={submitExperience}
            experienceBusy={experienceBusy}
            ratingOpen={overviewRatingOpen}
            onRatingOpenChange={setOverviewRatingOpen}
          />
        )}

        {currentView === 'sql' && (
          <SqlConsolePage
            sqlQuery={sqlQuery}
            setSqlQuery={setSqlQuery}
            consoleHistory={consoleHistory}
            consoleEndRef={consoleEndRef}
            executeSql={executeSql}
            busy={busy}
            error={error}
            sessions={sqlWorkspace.sessions}
            activeSessionId={sqlWorkspace.activeId}
            onSelectSession={onSelectSqlSession}
            onNewSession={onNewSqlSession}
            onDeleteSession={onDeleteSqlSession}
          />
        )}

        {currentView === 'tableExplorer' && (
          <TableExplorerPage
            dbId={dbId}
            busy={busy}
            tableState={tableState}
            tableActions={tableActions}
          />
        )}

        {currentView === 'search' && <SearchConsolePage />}

        {currentView === 'visualizer' && (
          <VideoInspectorPage
            dbId={dbId}
            previewRevision={previewRevision}
            payloadFrames={payloadFrames}
            videoFileSizeBytes={videoFileSize}
            videoFps={videoFps}
            currentFrameIndex={currentFrameIndex}
            setCurrentFrameIndex={setCurrentFrameIndex}
            busy={busy}
            encodeHourShell={encodeHourShell}
            tables={tables}
            selectedTable={selectedInspectorTable}
            setSelectedTable={setSelectedInspectorTable}
            downloadUrl={videoDownloadUrl(dbId, selectedInspectorTable)}
          />
        )}

        {currentView === 'performance' && (
          <PerformanceLogPage
            dbId={dbId}
            tables={tables}
            selectedTable={selectedInspectorTable}
            onSelectTable={setSelectedInspectorTable}
          />
        )}

        {currentView === 'settings' && (
          <SettingsPage
            apiBase={apiBase()}
            dbId={dbId}
            encodeHourShell={encodeHourShell}
            setEncodeHourShell={setEncodeHourShell}
            videoFps={videoFps}
            setVideoFps={setVideoFps}
            compressionAlgorithm={compressionAlgorithm}
            setCompressionAlgorithm={setCompressionAlgorithm}
            compressionLevel={compressionLevel}
            setCompressionLevel={setCompressionLevel}
            onNewDatabase={() => setNewDbDialogOpen(true)}
            busy={busy}
          />
        )}

        {currentView === 'feedback' && <FeedbackPage dbId={dbId} />}
      </AppShell>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <CsvImportModal
        open={csvModalOpen}
        onOpenChange={setCsvModalOpen}
        files={pendingCsvFiles}
        configs={csvConfigs}
        setConfigs={setCsvConfigs}
        tables={tables}
        progress={csvProgress}
        busy={busy}
        onAnalyze={analyzeCsvFile}
        onConfirm={confirmCsvImport}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete row?"
        description={
          deleteTarget
            ? `Delete rowid ${deleteTarget.rowid} from "${deleteTarget.table}"? This updates the video database and encoded frame payload.`
            : ''
        }
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDeleteRow}
      />

      <ConfirmDialog
        open={newDbDialogOpen}
        onOpenChange={setNewDbDialogOpen}
        title="Create new database?"
        description="This switches the browser session to a fresh backend video database. Existing files remain on disk but this UI will point to the new database ID."
        confirmLabel="Create Database"
        busy={busy}
        onConfirm={createAndSelectDatabase}
      />
    </>
  );
}

function BootError({ message }: { message: string }) {
  return (
    <div className={styles.bootErrorScreen}>
      <div className={styles.errorContainer}>
        <AlertCircle className={styles.errorIcon} />
        <div>
          <p className={styles.errorTitle}>Cannot reach vSQL API</p>
          <p className={styles.errorMessage}>{message}</p>
          <p className={styles.errorHint}>
            Start backend:{' '}
            <code className={styles.code}>
              uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
            </code>{' '}
            from <code className={styles.code}>backend/</code>. Set{' '}
            <code className={styles.code}>NEXT_PUBLIC_VSQL_API</code> if needed.
          </p>
        </div>
      </div>
    </div>
  );
}
