'use client';

import { Button } from '@/components/ui/button';
import {
  apiBase,
  getSearchHealth,
  searchRequestAdvanced,
  type SearchHealth,
  type SearchHttpMethod,
} from '@/lib/vsql-api';
import {
  buildHeadersFromRows,
  buildSearchRequestPath,
  defaultSavedApi,
  discoverTopLevelKeys,
  parseSavedApisJson,
  pickTopLevelKeys,
  SEARCH_SAVED_APIS_STORAGE_KEY,
  validateSearchJsonBody,
  type SearchSavedApiDefinition,
} from '@/lib/searchApiBuilder';
import { motion } from 'framer-motion';
import {
  FileJson,
  Layers,
  Pin,
  PinOff,
  Play,
  Server,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import rail from './AppRail.module.css';
import { SearchApiRequestModal } from './SearchApiRequestModal';
import styles from './SearchConsolePage.module.css';
import { railTransition, useAppRailLayout } from './useAppRailLayout';

const SEARCH_RAIL_OPEN = '18rem';

type SearchExample = {
  name: string;
  description: string;
  method: SearchHttpMethod;
  endpoint: string;
  body: string;
};

const examples: SearchExample[] = [
  {
    name: 'Cluster Health',
    description: 'Check one-node local cluster status',
    method: 'GET',
    endpoint: '/_cluster/health',
    body: '',
  },
  {
    name: 'Node Info',
    description: 'Read root API details and public base URL',
    method: 'GET',
    endpoint: '/',
    body: '',
  },
  {
    name: 'Nodes Stats',
    description: 'Inspect local node document counters',
    method: 'GET',
    endpoint: '/_nodes/stats',
    body: '',
  },
  {
    name: 'Cluster State',
    description: 'List index mappings and page-level stats',
    method: 'GET',
    endpoint: '/_cluster/state',
    body: '',
  },
  {
    name: 'Create Index',
    description: 'Create a local development search index',
    method: 'PUT',
    endpoint: '/my-index',
    body: '{\n  "mappings": {\n    "properties": {\n      "title": { "type": "text" },\n      "content": { "type": "text" }\n    }\n  }\n}',
  },
  {
    name: 'Index Document',
    description: 'Store one document with an explicit ID',
    method: 'PUT',
    endpoint: '/my-index/_doc/1',
    body: '{\n  "title": "Welcome to Durgas Search",\n  "content": "A local search console for vSQL video data"\n}',
  },
  {
    name: 'Bulk Ingest',
    description: 'Send NDJSON action/source pairs',
    method: 'POST',
    endpoint: '/_bulk',
    body: '{"index":{"_index":"my-index","_id":"2"}}\n{"title":"Second Doc","content":"Bulk ingest test"}\n{"index":{"_index":"my-index","_id":"3"}}\n{"title":"Third Doc","content":"Another local document"}\n',
  },
  {
    name: 'Search Query',
    description: 'Run a match/prefix search',
    method: 'POST',
    endpoint: '/my-index/_search',
    body: '{\n  "query": {\n    "match": {\n      "content": "local"\n    }\n  },\n  "size": 10\n}',
  },
  {
    name: 'Update Document',
    description: 'Patch a stored document',
    method: 'POST',
    endpoint: '/my-index/_update/1',
    body: '{\n  "doc": {\n    "content": "Updated from the Durgas Search console"\n  }\n}',
  },
  {
    name: 'Delete Document',
    description: 'Remove one document by ID',
    method: 'DELETE',
    endpoint: '/my-index/_doc/1',
    body: '',
  },
  {
    name: 'Create Snapshot Repo',
    description: 'Mock a repository for local UX testing',
    method: 'PUT',
    endpoint: '/_snapshot/local_repo',
    body: '{\n  "type": "fs",\n  "settings": {\n    "location": "/tmp/durgas-search"\n  }\n}',
  },
  {
    name: 'Create Snapshot',
    description: 'Mock a completed snapshot',
    method: 'PUT',
    endpoint: '/_snapshot/local_repo/snap_1?wait_for_completion=true',
    body: '{\n  "include_global_state": false\n}',
  },
];

export function SearchConsolePage() {
  const [requestDef, setRequestDef] = useState<SearchSavedApiDefinition>(() =>
    defaultSavedApi({
      name: 'Ad hoc',
      url: { raw: '/_cluster/health', params: [], variables: [] },
      headers: [],
      outputKeys: [],
    })
  );
  const [savedLibrary, setSavedLibrary] = useState<SearchSavedApiDefinition[]>([]);
  const [librarySelection, setLibrarySelection] = useState<string>('');
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [response, setResponse] = useState('// Response will appear here...');
  const [lastResponseData, setLastResponseData] = useState<unknown | null>(null);
  const [showFullResponse, setShowFullResponse] = useState(true);
  const [health, setHealth] = useState<SearchHealth | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [responseMode, setResponseMode] = useState<'pretty' | 'raw'>('pretty');
  const [lastError, setLastError] = useState<string | null>(null);
  const railLayout = useAppRailLayout(SEARCH_RAIL_OPEN);
  const {
    layoutStacked,
    pinnedOpen,
    setPinnedOpen,
    showLabels,
    railWidth,
    railAsideHandlers,
    railDataProps,
  } = railLayout;

  const healthLabel = health?.status ?? 'offline';
  const searchBase = `${apiBase()}/api/search`;

  const enabledHeaderCount = useMemo(
    () => requestDef.headers.filter((h) => h.enabled && h.key.trim().length > 0).length,
    [requestDef.headers]
  );

  const resolvedPath = useMemo(() => {
    const built = buildSearchRequestPath(
      requestDef.url.raw,
      requestDef.url.variables,
      requestDef.url.params
    );
    return built;
  }, [requestDef.url]);

  const responseKeys = useMemo(() => discoverTopLevelKeys(lastResponseData), [lastResponseData]);

  const formatPayload = useCallback(
    (data: unknown) => {
      const projected =
        showFullResponse || requestDef.outputKeys.length === 0
          ? data
          : pickTopLevelKeys(data, requestDef.outputKeys);
      return responseMode === 'pretty'
        ? JSON.stringify(projected, null, 2)
        : JSON.stringify(projected);
    },
    [showFullResponse, requestDef.outputKeys, responseMode]
  );

  useEffect(() => {
    if (lastResponseData === null) return;
    setResponse(formatPayload(lastResponseData));
  }, [lastResponseData, formatPayload]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEARCH_SAVED_APIS_STORAGE_KEY);
      setSavedLibrary(parseSavedApisJson(raw));
    } catch {
      setSavedLibrary([]);
    }
  }, []);

  const persistLibrary = useCallback((next: SearchSavedApiDefinition[]) => {
    setSavedLibrary(next);
    try {
      localStorage.setItem(SEARCH_SAVED_APIS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await getSearchHealth());
      setLastError(null);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const selectedExample = useMemo(
    () =>
      examples.find(
        (item) =>
          item.endpoint === requestDef.url.raw &&
          item.method === requestDef.method &&
          item.body === requestDef.body
      ),
    [requestDef.url.raw, requestDef.method, requestDef.body]
  );

  const loadExample = (example: SearchExample) => {
    setLibrarySelection('');
    setRequestDef(
      defaultSavedApi({
        name: example.name,
        method: example.method,
        body: example.body,
        url: { raw: example.endpoint, params: [], variables: [] },
        headers: [],
        outputKeys: [],
      })
    );
    setLastResponseData(null);
    setResponse(`// Loaded ${example.name}. Press Send to run it.`);
  };

  const handleSaveToLibrary = (def: SearchSavedApiDefinition) => {
    const name = def.name.trim() || 'Untitled';
    const nextDef = { ...def, name };
    const idx = savedLibrary.findIndex((s) => s.name === name);
    const copy = [...savedLibrary];
    if (idx >= 0) copy[idx] = nextDef;
    else copy.push(nextDef);
    persistLibrary(copy);
    setLibrarySelection(name);
  };

  const runRequest = async () => {
    setBusy(true);
    setLastError(null);
    setLastResponseData(null);
    setResponse('// Sending request...');
    try {
      const built = buildSearchRequestPath(
        requestDef.url.raw,
        requestDef.url.variables,
        requestDef.url.params
      );
      if (built.error) {
        throw new Error(built.error);
      }
      validateSearchJsonBody(requestDef.method, built.path, requestDef.body);
      const headerMap = buildHeadersFromRows(requestDef.headers);
      const bodyTrim = requestDef.body.trim();
      const data = await searchRequestAdvanced({
        method: requestDef.method,
        path: built.path,
        body: requestDef.method === 'GET' ? undefined : bodyTrim.length > 0 ? bodyTrim : undefined,
        headers: Object.keys(headerMap).length ? headerMap : undefined,
      });
      setLastResponseData(data);
      if (autoRefresh) {
        await refreshHealth();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLastError(message);
      setLastResponseData(null);
      setResponse(`Error: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleOutputKey = (key: string) => {
    setRequestDef((d) => {
      const set = new Set(d.outputKeys);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...d, outputKeys: [...set].sort() };
    });
  };

  const selectAllKeys = () => {
    setRequestDef((d) => ({
      ...d,
      outputKeys: discoverTopLevelKeys(lastResponseData),
    }));
  };

  const clearOutputKeys = () => {
    setRequestDef((d) => ({ ...d, outputKeys: [] }));
  };

  return (
    <>
      <SearchApiRequestModal
        open={apiModalOpen}
        onOpenChange={setApiModalOpen}
        value={requestDef}
        onApply={setRequestDef}
        onSaveToLibrary={handleSaveToLibrary}
      />

      <aside
        className={`${rail.aside} ${styles.searchAside}`}
        aria-label="Durgas Search API examples"
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
              <div className={styles.brand}>
                <div className={styles.logo}>DS</div>
                <motion.div
                  className={styles.brandText}
                  initial={false}
                  animate={{
                    opacity: showLabels ? 1 : 0,
                    x: showLabels ? 0 : -8,
                    maxWidth: showLabels ? 220 : 0,
                  }}
                  transition={railTransition}
                  style={{
                    overflow: 'hidden',
                    pointerEvents: showLabels ? 'auto' : 'none',
                    display: showLabels ? 'block' : 'none',
                  }}
                >
                  <h1 className={styles.brandTitle}>Durgas Search</h1>
                  <p className={styles.brandMeta}>v1.0.0-local</p>
                </motion.div>
              </div>
            </header>

            <div className={rail.body}>
              <div className={`${styles.panel} ${styles.panelExamples}`}>
                <h2 className={styles.panelTitle}>
                  <FileJson className={styles.panelIcon} aria-hidden />
                  <motion.span
                    className={styles.panelTitleText}
                    initial={false}
                    animate={{
                      opacity: showLabels ? 1 : 0,
                      maxWidth: showLabels ? 240 : 0,
                    }}
                    transition={railTransition}
                    style={{
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                      verticalAlign: 'middle',
                    }}
                  >
                    API Specs & Examples
                  </motion.span>
                </h2>
                <nav className={styles.examplesNav} aria-label="Example API requests">
                  {examples.map((example) => (
                    <button
                      key={`${example.method}-${example.endpoint}-${example.name}`}
                      type="button"
                      onClick={() => loadExample(example)}
                      className={styles.exampleButton}
                      title={`${example.name} — ${example.description}`}
                    >
                      <span className={`${styles.badge} ${styles[`badge${example.method}`]}`}>
                        {example.method}
                      </span>
                      <motion.span
                        className={`${styles.exampleName} ${showLabels ? rail.interactiveOn : rail.interactiveOff}`}
                        initial={false}
                        animate={{
                          opacity: showLabels ? 1 : 0,
                          x: showLabels ? 0 : -6,
                          maxWidth: showLabels ? 280 : 0,
                        }}
                        transition={railTransition}
                        style={{ overflow: 'hidden' }}
                      >
                        {example.name}
                      </motion.span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {!layoutStacked ? (
              <div className={rail.footer}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`${rail.pinButton} ${pinnedOpen ? rail.pinButtonActive : ''}`}
                  aria-pressed={pinnedOpen}
                  aria-label={pinnedOpen ? 'Unpin examples rail' : 'Pin examples rail open'}
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

      <section className={styles.page}>
        <main className={styles.console}>
          <header className={styles.consoleHeader}>
            <div className={styles.consoleHeaderMain}>
              <p className={styles.eyebrow}>Localhost API Surface</p>
              <h2>Search Console</h2>
              <p className={styles.baseUrl}>
                <Server className={styles.inlineIcon} />
                {searchBase}
              </p>
            </div>
            <div className={styles.consoleHeaderActions}>
              <div
                className={`${styles.statusCard} ${styles.statusCardInHeader}`}
                role="status"
                aria-live="polite"
                aria-label="Cluster status"
              >
                <h3 className={styles.panelTitle}>
                  <Layers className={styles.panelIcon} />
                  Cluster status
                </h3>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>
                    <span
                      className={`${styles.healthDot} ${health?.status === 'green' ? styles.healthGreen : styles.healthWarn}`}
                    />
                    Status
                  </span>
                  <strong className={styles.healthText}>{healthLabel}</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Nodes</span>
                  <strong>{health?.number_of_nodes ?? '-'}</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Active Shards</span>
                  <strong>{health?.active_shards_percent_as_number ?? '-'}%</strong>
                </div>
                {lastError && <p className={styles.statusError}>{lastError}</p>}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void refreshHealth()}
                className={styles.refreshHealthButton}
              >
                Refresh Health
              </Button>
            </div>
          </header>

          <div className={styles.quickBar}>
            {examples.slice(0, 6).map((example) => (
              <button
                key={`quick-${example.name}`}
                type="button"
                className={styles.quickButton}
                onClick={() => loadExample(example)}
              >
                {example.name}
              </button>
            ))}
          </div>

          <div className={styles.libraryRow}>
            <label className={styles.checkboxLabel} htmlFor="saved-api-select">
              Saved
            </label>
            <select
              id="saved-api-select"
              className={styles.librarySelect}
              value={librarySelection}
              onChange={(e) => {
                const v = e.target.value;
                setLibrarySelection(v);
                if (!v) return;
                const found = savedLibrary.find((s) => s.name === v);
                if (found) {
                  setRequestDef(structuredClone(found));
                  setResponse(`// Loaded saved request “${v}”.`);
                  setLastResponseData(null);
                }
              }}
            >
              <option value="">— Ad hoc —</option>
              {savedLibrary.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setApiModalOpen(true)}
              title="Edit request name, method, headers, body, URL, params, variables"
            >
              <SlidersHorizontal className={styles.sendIcon} aria-hidden />
              Configure API…
              {enabledHeaderCount > 0 ? (
                <span className={styles.headerBadge}>({enabledHeaderCount} headers)</span>
              ) : null}
            </Button>
          </div>

          <div className={styles.requestBar}>
            <select
              value={requestDef.method}
              onChange={(event) =>
                setRequestDef((d) => ({
                  ...d,
                  method: event.target.value as SearchHttpMethod,
                }))
              }
              className={styles.methodSelect}
              aria-label="HTTP method"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
            <input
              value={requestDef.url.raw}
              onChange={(event) =>
                setRequestDef((d) => ({
                  ...d,
                  url: { ...d.url, raw: event.target.value },
                }))
              }
              className={styles.endpointInput}
              placeholder="/my-index/_search"
              spellCheck={false}
              aria-label="URL path (request.url.raw)"
            />
            <Button
              type="button"
              onClick={() => void runRequest()}
              disabled={busy}
              className={styles.sendButton}
            >
              <Play className={styles.sendIcon} />
              {busy ? 'Sending' : 'Send'}
            </Button>
          </div>
          {resolvedPath.error ? (
            <p className={styles.statusError}>{resolvedPath.error}</p>
          ) : (
            <p className={styles.resolvedPathHint}>
              Resolved path: <code>{resolvedPath.path || '/'}</code>
            </p>
          )}

          {busy && (
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} />
            </div>
          )}

          <div className={styles.optionsRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              Refresh cluster status after send
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showFullResponse}
                onChange={(event) => setShowFullResponse(event.target.checked)}
              />
              Show full JSON response
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="response-mode"
                checked={responseMode === 'pretty'}
                onChange={() => setResponseMode('pretty')}
              />
              Pretty JSON
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="response-mode"
                checked={responseMode === 'raw'}
                onChange={() => setResponseMode('raw')}
              />
              Raw JSON
            </label>
          </div>

          {selectedExample && (
            <p className={styles.exampleHint}>
              Loaded preset: <strong>{selectedExample.name}</strong> - {selectedExample.description}
            </p>
          )}

          {responseKeys.length > 0 && (
            <div className={styles.outputProjection}>
              <p className={styles.outputProjectionTitle}>Output columns (top-level keys)</p>
              <div className={styles.outputKeyActions}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={styles.miniBtn}
                  onClick={selectAllKeys}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={styles.miniBtn}
                  onClick={clearOutputKeys}
                >
                  Clear
                </Button>
              </div>
              <div className={styles.outputKeyGrid}>
                {responseKeys.map((k) => (
                  <label key={k} className={styles.outputKeyLabel}>
                    <input
                      type="checkbox"
                      checked={requestDef.outputKeys.includes(k)}
                      onChange={() => toggleOutputKey(k)}
                    />
                    {k}
                  </label>
                ))}
              </div>
              {!showFullResponse && requestDef.outputKeys.length === 0 ? (
                <p className={styles.exampleHint}>
                  No keys selected — enable &quot;Show full JSON&quot; or pick at least one key.
                </p>
              ) : null}
            </div>
          )}

          <div className={styles.workArea}>
            <div className={styles.editorPane}>
              <label className={styles.fieldLabel}>
                Request Body
                <span className={styles.headerBadge}>(request.body)</span>
              </label>
              <textarea
                value={requestDef.body}
                onChange={(event) => setRequestDef((d) => ({ ...d, body: event.target.value }))}
                className={styles.textarea}
                placeholder={
                  requestDef.method === 'GET' ? '// GET requests ignore request body' : '{}'
                }
                spellCheck={false}
              />
            </div>

            <div className={styles.outputPane}>
              <label className={styles.fieldLabel}>
                <span>
                  <Terminal className={styles.inlineIcon} />
                  Response Output
                </span>
                <span className={`${styles.badge} ${styles[`badge${requestDef.method}`]}`}>
                  {requestDef.method}
                </span>
              </label>
              <pre className={styles.responseBox}>{response}</pre>
            </div>
          </div>
        </main>
      </section>
    </>
  );
}
