/// <reference types="node" />

export function apiBase(): string {
  const v = process.env.NEXT_PUBLIC_VSQL_API;
  const base = (v && v.length > 0 ? v : 'http://127.0.0.1:8000').replace(/\/$/, '');
  return base;
}

type GqlErrorBody = {
  errors?: { message: string }[];
  data?: unknown;
};

async function gqlRequest<TData>(
  query: string,
  variables?: Record<string, unknown>
): Promise<TData> {
  const r = await fetch(`${apiBase()}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await r.json()) as GqlErrorBody;
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join('; '));
  }
  if (!r.ok) {
    throw new Error(r.statusText);
  }
  return body.data as TData;
}

async function gqlMultipart<TData>(
  operations: { query: string; variables: Record<string, unknown> },
  filePartName: string,
  file: File,
  mapEntry: string
): Promise<TData> {
  const fd = new FormData();
  fd.append('operations', JSON.stringify(operations));
  fd.append('map', JSON.stringify({ [filePartName]: [mapEntry] }));
  fd.append(filePartName, file);
  const r = await fetch(`${apiBase()}/graphql`, {
    method: 'POST',
    body: fd,
  });
  const body = (await r.json()) as GqlErrorBody;
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join('; '));
  }
  if (!r.ok) {
    throw new Error(r.statusText);
  }
  return body.data as TData;
}

export type SqlResult = {
  columns: string[] | null;
  values: unknown[][];
  rowcount: number;
};

export type CsvColumnAnalysis = {
  index: number;
  sourceName: string;
  suggestedName: string;
  inferredType: string;
  confidence: number;
  emptyCount: number;
  uniqueCount: number;
  isUniqueCandidate: boolean;
  sampleValues: string[];
};

export type ResolutionRecommendation = {
  width: number;
  height: number;
  label: string;
  estimatedFrames: number;
  estimatedPayloadBytes: number;
  isCurrent: boolean;
  isRecommended: boolean;
  reason: string;
};

export type CsvAnalysisResult = {
  headers: string[];
  rowCount: number;
  sampleRowCount: number;
  columns: CsvColumnAnalysis[];
  warnings: string[];
  resolutions: ResolutionRecommendation[];
};

export type CsvColumnMapping = {
  sourceName: string;
  targetName: string;
  dataType: string;
  include: boolean;
  nullable: boolean;
  unique: boolean;
  primaryKey: boolean;
  defaultValue?: unknown;
};

export type CsvImportPlan = {
  tableName: string;
  mode: 'create' | 'replace';
  columns: CsvColumnMapping[];
  selectedResolution?: ResolutionRecommendation | null;
};

export async function createDatabase(): Promise<{ id: string }> {
  const data = await gqlRequest<{ createDatabase: { id: string } }>(
    `mutation { createDatabase { id } }`
  );
  return { id: data.createDatabase.id };
}

export async function listTables(dbId: string): Promise<string[]> {
  const data = await gqlRequest<{ tables: string[] }>(
    `query ($dbId: ID!) { tables(dbId: $dbId) }`,
    { dbId }
  );
  return data.tables;
}

export async function runSql(dbId: string, query: string): Promise<SqlResult> {
  const data = await gqlRequest<{
    executeSql: {
      columns: string[] | null;
      valuesJson: string;
      rowcount: number;
    };
  }>(
    `mutation ($dbId: ID!, $query: String!) {
      executeSql(dbId: $dbId, query: $query) {
        columns
        valuesJson
        rowcount
      }
    }`,
    { dbId, query }
  );
  return {
    columns: data.executeSql.columns,
    values: JSON.parse(data.executeSql.valuesJson) as unknown[][],
    rowcount: data.executeSql.rowcount,
  };
}

export async function importCsv(
  dbId: string,
  file: File,
  tableName: string,
  delimiter: string,
  quoteChar: string,
  options?: {
    compression?: boolean;
    append?: boolean;
    importPlan?: CsvImportPlan;
  }
): Promise<{ imported_rows: number; table: string }> {
  const compression = options?.compression ?? true;
  const append = options?.append ?? false;
  const data = await gqlMultipart<{
    importCsv: { importedRows: number; table: string };
  }>(
    {
      query: `
        mutation (
          $dbId: ID!
          $file: Upload!
          $tableName: String!
          $delimiter: String!
          $quoteChar: String!
          $compression: Boolean!
          $append: Boolean!
          $importPlan: JSON
        ) {
          importCsv(
            dbId: $dbId
            file: $file
            tableName: $tableName
            delimiter: $delimiter
            quoteChar: $quoteChar
            compression: $compression
            append: $append
            importPlan: $importPlan
          ) {
            importedRows
            table
          }
        }
      `,
      variables: {
        dbId,
        file: null,
        tableName,
        delimiter,
        quoteChar,
        compression,
        append,
        importPlan: options?.importPlan ?? null,
      },
    },
    '0',
    file,
    'variables.file'
  );
  return {
    imported_rows: data.importCsv.importedRows,
    table: data.importCsv.table,
  };
}

export async function analyzeCsvImport(
  file: File,
  delimiter: string,
  quoteChar: string
): Promise<CsvAnalysisResult> {
  const data = await gqlMultipart<{
    analyzeCsvImport: CsvAnalysisResult;
  }>(
    {
      query: `
        mutation (
          $file: Upload!
          $delimiter: String!
          $quoteChar: String!
          $sampleRows: Int!
          $compression: Boolean!
        ) {
          analyzeCsvImport(
            file: $file
            delimiter: $delimiter
            quoteChar: $quoteChar
            sampleRows: $sampleRows
            compression: $compression
          ) {
            headers
            rowCount
            sampleRowCount
            warnings
            columns {
              index
              sourceName
              suggestedName
              inferredType
              confidence
              emptyCount
              uniqueCount
              isUniqueCandidate
              sampleValues
            }
            resolutions {
              width
              height
              label
              estimatedFrames
              estimatedPayloadBytes
              isCurrent
              isRecommended
              reason
            }
          }
        }
      `,
      variables: {
        file: null,
        delimiter,
        quoteChar,
        sampleRows: 100,
        compression: true,
      },
    },
    '0',
    file,
    'variables.file'
  );
  return data.analyzeCsvImport;
}

export async function patchRow(
  dbId: string,
  table: string,
  rowid: number,
  column: string,
  value: unknown
): Promise<void> {
  await gqlRequest<{
    updateCell: { ok: boolean };
  }>(
    `mutation (
      $dbId: ID!
      $tableName: String!
      $rowid: Int!
      $column: String!
      $value: JSON
    ) {
      updateCell(
        dbId: $dbId
        tableName: $tableName
        rowid: $rowid
        column: $column
        value: $value
      ) {
        ok
      }
    }`,
    { dbId, tableName: table, rowid, column, value }
  );
}

export async function deleteRow(dbId: string, table: string, rowid: number): Promise<void> {
  await gqlRequest<{ deleteRow: { ok: boolean } }>(
    `mutation ($dbId: ID!, $tableName: String!, $rowid: Int!) {
      deleteRow(dbId: $dbId, tableName: $tableName, rowid: $rowid) {
        ok
      }
    }`,
    { dbId, tableName: table, rowid }
  );
}

export async function encodeVideo(
  dbId: string,
  logicalTotalFrames: number | null,
  fps: number,
  options?: {
    tableName?: string | null;
    compressionAlgorithm?: 'zstd' | 'zlib';
    compressionLevel?: 'fast' | 'balanced' | 'maximum';
  }
): Promise<void> {
  await gqlRequest<{ encodeVideo: { message: string } }>(
    `mutation (
      $dbId: ID!,
      $fps: Int!,
      $logicalTotalFrames: Int,
      $tableName: String,
      $compressionAlgorithm: String,
      $compressionLevel: String
    ) {
      encodeVideo(
        dbId: $dbId,
        fps: $fps,
        logicalTotalFrames: $logicalTotalFrames,
        tableName: $tableName,
        compressionAlgorithm: $compressionAlgorithm,
        compressionLevel: $compressionLevel
      ) {
        message
      }
    }`,
    {
      dbId,
      fps,
      logicalTotalFrames: logicalTotalFrames ?? null,
      tableName: options?.tableName ?? null,
      compressionAlgorithm: options?.compressionAlgorithm ?? 'zstd',
      compressionLevel: options?.compressionLevel ?? 'balanced',
    }
  );
}

/** Direct download URL for the encoded MP4 (served by the existing file route). */
export function videoDownloadUrl(dbId: string, tableName?: string | null): string {
  if (tableName) {
    return `${apiBase()}/databases/${dbId}/tables/${encodeURIComponent(tableName)}/download/video`;
  }
  return `${apiBase()}/databases/${dbId}/download/video`;
}

export async function decodeMp4Upload(file: File): Promise<{ id: string }> {
  const data = await gqlMultipart<{ decodeMp4: { id: string } }>(
    {
      query: `
        mutation ($file: Upload!) {
          decodeMp4(file: $file) {
            id
          }
        }
      `,
      variables: { file: null },
    },
    '0',
    file,
    'variables.file'
  );
  return { id: data.decodeMp4.id };
}

export async function frameMeta(
  dbId: string,
  logicalTotalFrames: number,
  tableName?: string | null
): Promise<{
  payload_frame_count: number;
  logical_total_frames: number;
  video_size_bytes: number;
}> {
  const data = await gqlRequest<{
    frameMeta: {
      payloadFrameCount: number;
      logicalTotalFrames: number;
      videoSizeBytes: number;
    };
  }>(
    `query ($dbId: ID!, $logicalTotalFrames: Int!, $tableName: String) {
      frameMeta(dbId: $dbId, logicalTotalFrames: $logicalTotalFrames, tableName: $tableName) {
        payloadFrameCount
        logicalTotalFrames
        videoSizeBytes
      }
    }`,
    { dbId, logicalTotalFrames, tableName: tableName ?? null }
  );
  return {
    payload_frame_count: data.frameMeta.payloadFrameCount,
    logical_total_frames: data.frameMeta.logicalTotalFrames,
    video_size_bytes: data.frameMeta.videoSizeBytes,
  };
}

/** PNG preview as a data URL (GraphQL `framePreview`). */
export async function fetchFramePreviewDataUrl(
  dbId: string,
  frameIndex: number,
  tableName?: string | null
): Promise<string> {
  const data = await gqlRequest<{
    framePreview: { dataUrl: string };
  }>(
    `query ($dbId: ID!, $frameIndex: Int!, $tableName: String) {
      framePreview(dbId: $dbId, frameIndex: $frameIndex, tableName: $tableName) {
        dataUrl
      }
    }`,
    { dbId, frameIndex, tableName: tableName ?? null }
  );
  return data.framePreview.dataUrl;
}

export type SchemaColumn = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  default: unknown;
  pk: number;
  unique: boolean;
};

export async function getSchema(dbId: string, table: string): Promise<SchemaColumn[]> {
  const data = await gqlRequest<{
    databaseSchema: {
      cid: number;
      name: string;
      type: string;
      notnull: number;
      defaultValue: unknown;
      pk: number;
      unique: boolean;
    }[];
  }>(
    `query ($dbId: ID!, $tableName: String) {
      databaseSchema(dbId: $dbId, tableName: $tableName) {
        cid
        name
        type
        notnull
        defaultValue
        pk
        unique
      }
    }`,
    { dbId, tableName: table }
  );
  return data.databaseSchema.map((c) => ({
    cid: c.cid,
    name: c.name,
    type: c.type,
    notnull: c.notnull,
    default: c.defaultValue ?? null,
    pk: c.pk,
    unique: c.unique,
  }));
}

export type TableRowsPayload = {
  columns: string[];
  values: unknown[][];
  totalRowCount: number;
  totalColumnCount: number;
};

/** Fetch table rows. Pass columnLimit (e.g. 50) + columnOffset for horizontal paging; omit for SELECT *. */
export async function getRows(
  dbId: string,
  table: string,
  limit: number,
  offset = 0,
  options?: { columnOffset?: number; columnLimit?: number | null }
): Promise<TableRowsPayload> {
  const columnOffset = options?.columnOffset ?? 0;
  const columnLimit = options?.columnLimit === undefined ? null : options.columnLimit;

  const data = await gqlRequest<{
    databaseRows: {
      columns: string[];
      valuesJson: string;
      totalRowCount: number;
      totalColumnCount: number;
    };
  }>(
    `query ($dbId: ID!, $limit: Int!, $offset: Int!, $tableName: String, $columnOffset: Int!, $columnLimit: Int) {
      databaseRows(
        dbId: $dbId
        limit: $limit
        offset: $offset
        tableName: $tableName
        columnOffset: $columnOffset
        columnLimit: $columnLimit
      ) {
        columns
        valuesJson
        totalRowCount
        totalColumnCount
      }
    }`,
    {
      dbId,
      limit,
      offset,
      tableName: table,
      columnOffset,
      columnLimit,
    }
  );
  const dr = data.databaseRows;
  return {
    columns: dr.columns,
    values: JSON.parse(dr.valuesJson) as unknown[][],
    totalRowCount: dr.totalRowCount,
    totalColumnCount: dr.totalColumnCount,
  };
}

export async function submitFeedback(
  dbId: string,
  sessionId: string,
  message: string,
  rating?: number | null
): Promise<void> {
  await gqlRequest(
    `mutation ($dbId: ID!, $sessionId: String!, $message: String!, $rating: Int) {
      submitFeedback(dbId: $dbId, sessionId: $sessionId, message: $message, rating: $rating) {
        ok
      }
    }`,
    {
      dbId,
      sessionId,
      message,
      rating: rating ?? null,
    }
  );
}

export type FeedbackEntryRow = {
  session_id: string;
  message: string;
  rating: number | null;
  created_at: string;
};

export async function feedbackEntries(dbId: string, limit = 50): Promise<FeedbackEntryRow[]> {
  const data = await gqlRequest<{
    feedbackEntries: {
      sessionId: string;
      message: string;
      rating: number | null;
      createdAt: string;
    }[];
  }>(
    `query ($dbId: ID!, $limit: Int!) {
      feedbackEntries(dbId: $dbId, limit: $limit) {
        sessionId
        message
        rating
        createdAt
      }
    }`,
    { dbId, limit }
  );
  return data.feedbackEntries.map((row) => ({
    session_id: row.sessionId,
    message: row.message,
    rating: row.rating,
    created_at: row.createdAt,
  }));
}

export async function authRegister(
  dbId: string,
  email: string,
  password: string
): Promise<{ ok: boolean; message?: string | null }> {
  const data = await gqlRequest<{
    authRegister: { ok: boolean; message: string | null };
  }>(
    `mutation ($dbId: ID!, $email: String!, $password: String!) {
      authRegister(dbId: $dbId, email: $email, password: $password) {
        ok
        message
      }
    }`,
    { dbId, email, password }
  );
  return data.authRegister;
}

export async function authLogin(
  dbId: string,
  email: string,
  password: string
): Promise<{ ok: boolean; token?: string | null; message?: string | null }> {
  const data = await gqlRequest<{
    authLogin: { ok: boolean; token: string | null; message: string | null };
  }>(
    `mutation ($dbId: ID!, $email: String!, $password: String!) {
      authLogin(dbId: $dbId, email: $email, password: $password) {
        ok
        token
        message
      }
    }`,
    { dbId, email, password }
  );
  return data.authLogin;
}

export async function fetchCloudStatus(apiBaseUrl: string): Promise<unknown> {
  const r = await fetch(`${apiBaseUrl}/api/integrations/cloud`);
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

export type SearchHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type SearchHealth = {
  cluster_name: string;
  status: 'green' | 'yellow' | 'red';
  number_of_nodes: number;
  active_shards_percent_as_number: number;
};

export type SearchRequestAdvancedOptions = {
  method: SearchHttpMethod;
  /** Path under `/api/search`, including query string (e.g. `/idx/_search?q=1`). */
  path: string;
  body?: string | Record<string, unknown> | null;
  /** Extra headers; user `Content-Type` wins over auto-detection when a body is sent. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function pathWithoutQuery(p: string): string {
  const q = p.indexOf('?');
  return q === -1 ? p : p.slice(0, q);
}

/**
 * Call Durgas Search REST with optional custom headers.
 * When a body is present and the caller did not set `Content-Type`, uses JSON or NDJSON for `/_bulk`.
 */
export async function searchRequestAdvanced(
  options: SearchRequestAdvancedOptions
): Promise<unknown> {
  const { method, path, body, headers: extraHeaders, signal } = options;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const pathForBulk = pathWithoutQuery(normalizedPath);
  const isBulk = pathForBulk.endsWith('/_bulk') || pathForBulk === '/_bulk';
  const payload =
    typeof body === 'string'
      ? body
      : body && Object.keys(body).length > 0
        ? JSON.stringify(body)
        : undefined;

  const headers: Record<string, string> = { ...(extraHeaders ?? {}) };
  if (payload && method !== 'GET') {
    const lower = Object.fromEntries(Object.keys(headers).map((k) => [k.toLowerCase(), k]));
    if (!lower['content-type']) {
      headers['Content-Type'] = isBulk ? 'application/x-ndjson' : 'application/json';
    }
  }

  const r = await fetch(`${apiBase()}/api/search${normalizedPath}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: method === 'GET' ? undefined : payload,
    signal,
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) {
    const message =
      data && typeof data === 'object' && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : r.statusText;
    throw new Error(message);
  }
  return data;
}

export async function searchRequest(
  method: SearchHttpMethod,
  path: string,
  body?: string | Record<string, unknown> | null
): Promise<unknown> {
  return searchRequestAdvanced({ method, path, body });
}

export async function getSearchHealth(): Promise<SearchHealth> {
  return (await searchRequest('GET', '/_cluster/health')) as SearchHealth;
}

// ---------------------------------------------------------------------------
// Storage metrics & multi-format export
// ---------------------------------------------------------------------------

export type StorageMetrics = {
  mkvBytes: number;
  parquetIndexBytes: number;
  rowCount: number;
  frameCount: number;
  compressionRatio: number;
  codec: string;
  compressionAlgorithm: string;
  estimatedCsvBytes: number;
  estimatedParquetBytes: number;
  parquetVsMkvRatio: number;
  encodeTimeMs: number;
  parquetIndexExists: boolean;
};

export type FormatExportResult = {
  format: string;
  downloadUrl: string;
  fileSizeBytes: number;
  rowCount: number;
  elapsedMs: number;
};

/** Fetch comparative storage metrics for a database (or specific table). */
export async function getStorageMetrics(
  dbId: string,
  tableName?: string | null
): Promise<StorageMetrics> {
  const data = await gqlRequest<{
    storageMetrics: {
      mkvBytes: number;
      parquetIndexBytes: number;
      rowCount: number;
      frameCount: number;
      compressionRatio: number;
      codec: string;
      compressionAlgorithm: string;
      estimatedCsvBytes: number;
      estimatedParquetBytes: number;
      parquetVsMkvRatio: number;
      encodeTimeMs: number;
      parquetIndexExists: boolean;
    };
  }>(
    `query ($dbId: ID!, $tableName: String) {
      storageMetrics(dbId: $dbId, tableName: $tableName) {
        mkvBytes
        parquetIndexBytes
        rowCount
        frameCount
        compressionRatio
        codec
        compressionAlgorithm
        estimatedCsvBytes
        estimatedParquetBytes
        parquetVsMkvRatio
        encodeTimeMs
        parquetIndexExists
      }
    }`,
    { dbId, tableName: tableName ?? null }
  );
  return data.storageMetrics;
}

/** Known `operation` values from the backend perf ring buffer (filters + labels). */
export const PERFORMANCE_EVENT_OPERATIONS = [
  'video_decode',
  'video_decode_failed',
  'mkv_write',
  'csv_import',
  'csv_import_failed',
  'encode_video',
  'encode_video_failed',
  'parquet_index_build',
  'frame_preview',
  'perf_persist_failed',
] as const;

export type PerformanceLogStats = {
  pendingCount: number;
  lastFlushEpoch: number | null;
  lastError: string | null;
};

export type PerformanceEventRow = {
  id: string;
  ts: string;
  dbId: string | null;
  tableName: string | null;
  operation: string;
  durationMs: number;
  bytesIn: number;
  bytesOut: number;
  rows: number | null;
  meta: Record<string, unknown>;
};

export async function getPerformanceEvents(
  dbId: string,
  options?: { operation?: string | null; limit?: number }
): Promise<PerformanceEventRow[]> {
  const limit = options?.limit ?? 200;
  const operation = options?.operation?.trim() || null;
  const data = await gqlRequest<{
    performanceEvents: {
      id: string;
      ts: string;
      dbId: string | null;
      tableName: string | null;
      operation: string;
      durationMs: number;
      bytesIn: number;
      bytesOut: number;
      rows: number | null;
      meta: Record<string, unknown>;
    }[];
  }>(
    `query ($dbId: ID!, $operation: String, $limit: Int!) {
      performanceEvents(dbId: $dbId, operation: $operation, limit: $limit) {
        id
        ts
        dbId
        tableName
        operation
        durationMs
        bytesIn
        bytesOut
        rows
        meta
      }
    }`,
    { dbId, operation, limit }
  );
  return data.performanceEvents.map((e) => ({
    id: e.id,
    ts: e.ts,
    dbId: e.dbId,
    tableName: e.tableName,
    operation: e.operation,
    durationMs: e.durationMs,
    bytesIn: e.bytesIn,
    bytesOut: e.bytesOut,
    rows: e.rows,
    meta: e.meta ?? {},
  }));
}

export async function getPerformanceLogStats(): Promise<PerformanceLogStats> {
  const data = await gqlRequest<{
    performanceLogStats: {
      pendingCount: number;
      lastFlushEpoch: number | null;
      lastError: string | null;
    };
  }>(
    `query {
      performanceLogStats {
        pendingCount
        lastFlushEpoch
        lastError
      }
    }`
  );
  const s = data.performanceLogStats;
  return {
    pendingCount: s.pendingCount,
    lastFlushEpoch: s.lastFlushEpoch ?? null,
    lastError: s.lastError ?? null,
  };
}

/** Trigger a server-side export and return the result including download URL. */
export async function exportAsFormat(
  dbId: string,
  format: 'parquet' | 'arrow',
  tableName?: string | null
): Promise<FormatExportResult> {
  const data = await gqlRequest<{
    exportAsFormat: {
      format: string;
      downloadUrl: string;
      fileSizeBytes: number;
      rowCount: number;
      elapsedMs: number;
    };
  }>(
    `mutation ($dbId: ID!, $format: String!, $tableName: String) {
      exportAsFormat(dbId: $dbId, format: $format, tableName: $tableName) {
        format
        downloadUrl
        fileSizeBytes
        rowCount
        elapsedMs
      }
    }`,
    { dbId, format, tableName: tableName ?? null }
  );
  return data.exportAsFormat;
}

/**
 * Build a REST download URL for a pre-built columnar export.
 * The server generates the file on first request (lazy build).
 */
export function formatExportUrl(
  dbId: string,
  format: 'parquet' | 'arrow',
  tableName?: string | null
): string {
  const base = apiBase();
  if (tableName) {
    return `${base}/databases/${dbId}/tables/${tableName}/export/${format}`;
  }
  return `${base}/databases/${dbId}/export/${format}`;
}
