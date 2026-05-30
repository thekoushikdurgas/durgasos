'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePerformanceObservability } from '@/hooks/use-performance-events';
import {
  getStorageMetrics,
  PERFORMANCE_EVENT_OPERATIONS,
  type PerformanceEventRow,
  type StorageMetrics,
} from '@/lib/vsql-api';
import {
  formatBytes,
  formatMetaPretty,
  mbPerSec,
  metaNotes,
  operationBadgeVariant,
} from '@/lib/perf-log-format';
import { motion } from 'framer-motion';
import { Check, Filter, Pin, PinOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import rail from './AppRail.module.css';
import styles from './PerformanceLogPage.module.css';
import { railTransition, useAppRailLayout } from './useAppRailLayout';

type MainTab = 'events' | 'storage' | 'flow';
type EventsSubTab = 'table' | 'tail';

const FILTER_RAIL_OPEN = '15rem';

type PerformanceLogPageProps = {
  dbId: string;
  tables: string[];
  selectedTable: string | null;
  onSelectTable: (table: string | null) => void;
};

function toggleOpFilter(prev: Set<string>, op: string): Set<string> {
  if (prev.size === 0) {
    return new Set([op]);
  }
  const n = new Set(prev);
  if (n.has(op)) {
    n.delete(op);
    return n.size ? n : new Set();
  }
  n.add(op);
  return n;
}

function isOpChipActive(opFilters: Set<string>, op: string): boolean {
  return opFilters.size === 0 || opFilters.has(op);
}

function PerfPipelineSvg() {
  return (
    <svg
      className={styles.flowSvg}
      viewBox="0 0 640 120"
      role="img"
      aria-label="Encode to MKV, decode for read, Parquet sidecar"
    >
      <title>vSQL performance pipeline</title>
      <defs>
        <linearGradient id="pf" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--vsql-accent-cyan, #22d3ee)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--vsql-accent-orange, #fb923c)" stopOpacity="0.35" />
        </linearGradient>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="currentColor" />
        </marker>
      </defs>
      <rect
        x="8"
        y="40"
        width="120"
        height="44"
        rx="8"
        fill="url(#pf)"
        stroke="currentColor"
        strokeWidth="1.2"
        className={styles.flowBox}
      />
      <text x="68" y="67" textAnchor="middle" className={styles.flowText}>
        encode_video
      </text>
      <path d="M132 62h36" stroke="currentColor" strokeWidth="2" markerEnd="url(#arr)" />
      <rect
        x="176"
        y="40"
        width="100"
        height="44"
        rx="8"
        fill="var(--vsql-bg-elevated)"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <text x="226" y="67" textAnchor="middle" className={styles.flowText}>
        mkv_write
      </text>
      <path d="M282 62h36" stroke="currentColor" strokeWidth="2" />
      <rect
        x="326"
        y="40"
        width="100"
        height="44"
        rx="8"
        fill="var(--vsql-bg-elevated)"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <text x="376" y="67" textAnchor="middle" className={styles.flowText}>
        video_decode
      </text>
      <path d="M432 62h36" stroke="currentColor" strokeWidth="2" />
      <rect
        x="476"
        y="40"
        width="156"
        height="44"
        rx="8"
        fill="var(--vsql-bg-elevated)"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <text x="554" y="67" textAnchor="middle" className={styles.flowText}>
        parquet_index_build
      </text>
    </svg>
  );
}

export function PerformanceLogPage({
  dbId,
  tables,
  selectedTable,
  onSelectTable,
}: PerformanceLogPageProps) {
  const { events, stats, error, loading, refresh } = usePerformanceObservability(dbId);
  const [mainTab, setMainTab] = useState<MainTab>('events');
  const [eventsSub, setEventsSub] = useState<EventsSubTab>('table');
  const [opFilters, setOpFilters] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chartWindow, setChartWindow] = useState<20 | 50>(20);
  const [storage, setStorage] = useState<StorageMetrics | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  const filterRail = useAppRailLayout(FILTER_RAIL_OPEN);
  const {
    layoutStacked: filterLayoutStacked,
    pinnedOpen: filterPinnedOpen,
    setPinnedOpen: setFilterPinnedOpen,
    showLabels: filterShowLabels,
    railWidth: filterRailWidth,
    railAsideHandlers: filterRailAsideHandlers,
    railDataProps: filterRailDataProps,
  } = filterRail;

  const effectiveTable = useMemo(() => {
    if (selectedTable) return selectedTable;
    return tables[0] ?? null;
  }, [selectedTable, tables]);

  const loadStorage = useCallback(async () => {
    if (!dbId || mainTab !== 'storage') return;
    try {
      setStorageError(null);
      const m = await getStorageMetrics(dbId, effectiveTable);
      setStorage(m);
    } catch (e) {
      setStorageError(e instanceof Error ? e.message : String(e));
      setStorage(null);
    }
  }, [dbId, effectiveTable, mainTab]);

  useEffect(() => {
    void loadStorage();
  }, [loadStorage]);

  const filteredEvents = useMemo(() => {
    let rows = events;
    if (opFilters.size > 0) {
      rows = rows.filter((e) => opFilters.has(e.operation));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((e) => {
        const blob =
          `${e.operation} ${e.ts} ${e.tableName ?? ''} ${metaNotes(e.meta)}`.toLowerCase();
        return blob.includes(q);
      });
    }
    return rows;
  }, [events, opFilters, search]);

  const chartRows = useMemo(() => {
    const lim = chartWindow;
    return [...filteredEvents]
      .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
      .slice(0, lim);
  }, [filteredEvents, chartWindow]);

  const maxDur = useMemo(() => Math.max(1, ...chartRows.map((r) => r.durationMs)), [chartRows]);

  const pendingPct = Math.min(100, ((stats?.pendingCount ?? 0) / 80) * 100);

  const tailRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && eventsSub === 'tail') el.scrollTop = 0;
    },
    [eventsSub]
  );

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <span className={styles.prompt}>❯</span>
        <span>PERFORMANCE_OPS.log</span>
        {loading ? <span className={styles.loadingDot}>…</span> : null}
      </div>
      <p className={styles.intro}>
        Live ring buffer plus batched writes to the reserved VideoDB table{' '}
        <code className={styles.code}>__vsql_perf</code> (survives API restarts). Use the left
        filter sidebar (hover to expand when narrow, pin to keep open) to narrow operations; search
        applies client-side to the merged feed.
      </p>

      <div className={styles.tabStrip} role="tablist" aria-label="Performance sections">
        {(['events', 'storage', 'flow'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={mainTab === t ? 'true' : 'false'}
            className={`${styles.tab} ${mainTab === t ? styles.tabActive : ''}`}
            onClick={() => setMainTab(t)}
          >
            {t === 'events' ? 'Events' : t === 'storage' ? 'Storage' : 'Flow'}
          </button>
        ))}
      </div>

      {mainTab === 'events' && (
        <>
          <div className={styles.statsBar}>
            <div className={styles.progressWrap}>
              <span className={styles.progressLabel}>Persist queue</span>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${pendingPct}%` }} />
              </div>
              <span className={styles.progressMeta}>
                {stats?.pendingCount ?? 0} pending
                {stats?.lastFlushEpoch != null
                  ? ` · last flush ${new Date(stats.lastFlushEpoch * 1000).toLocaleTimeString()}`
                  : ''}
              </span>
            </div>
            {stats?.lastError ? <div className={styles.statsWarn}>{stats.lastError}</div> : null}
          </div>

          <div className={styles.eventsToolbar}>
            <Input
              placeholder="Search operations, timestamps, meta…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()}>
              Refresh
            </Button>
          </div>

          <div className={styles.subTabStrip}>
            <button
              type="button"
              className={`${styles.subTab} ${eventsSub === 'table' ? styles.subTabActive : ''}`}
              onClick={() => setEventsSub('table')}
            >
              Table
            </button>
            <button
              type="button"
              className={`${styles.subTab} ${eventsSub === 'tail' ? styles.subTabActive : ''}`}
              onClick={() => setEventsSub('tail')}
            >
              Live tail
            </button>
          </div>

          <div className={styles.eventsLayout}>
            <div className={styles.filterAsideHost}>
              <aside
                className={`${rail.aside} ${styles.filterAside}`}
                aria-label="Performance event filters"
                {...filterRailAsideHandlers}
                {...filterRailDataProps}
              >
                <motion.div
                  className={rail.motion}
                  initial={false}
                  animate={{ width: filterRailWidth }}
                  transition={railTransition}
                >
                  <div className={rail.inner}>
                    <header className={rail.headerStrip}>
                      <div className={styles.filterAsideBrand}>
                        <Filter className={styles.filterAsideIcon} aria-hidden />
                        <motion.div
                          className={styles.filterAsideTitleWrap}
                          initial={false}
                          animate={{
                            opacity: filterShowLabels ? 1 : 0,
                            maxWidth: filterShowLabels ? 200 : 0,
                          }}
                          transition={railTransition}
                          style={{
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            pointerEvents: filterShowLabels ? 'auto' : 'none',
                          }}
                        >
                          <span className={styles.filterAsideTitle}>Filters</span>
                        </motion.div>
                      </div>
                    </header>

                    <div className={`${rail.body} ${styles.filterAsideBody}`}>
                      {filterShowLabels ? (
                        <>
                          <div className={styles.filterRailHeader}>
                            <h3 className={styles.filterRailTitle}>Operations</h3>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setOpFilters(new Set())}
                              className={styles.clearBtn}
                            >
                              Clear
                            </Button>
                          </div>
                          <div className={styles.filterScroll}>
                            <div className={styles.chipList}>
                              {PERFORMANCE_EVENT_OPERATIONS.map((op) => {
                                const active = isOpChipActive(opFilters, op);
                                return (
                                  <button
                                    key={op}
                                    type="button"
                                    aria-pressed={active ? 'true' : 'false'}
                                    className={`${styles.filterChip} ${active ? styles.filterChipOn : ''}`}
                                    onClick={() => setOpFilters((p) => toggleOpFilter(p, op))}
                                  >
                                    <span className={styles.chipLabel}>{op}</span>
                                    {active ? (
                                      <Check className={styles.chipCheck} aria-hidden />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                            <p className={styles.filterHint}>
                              Empty selection shows all operations. Click to narrow; click again to
                              widen.
                            </p>
                            <div className={styles.chartControls}>
                              <span className={styles.radioLegend}>Duration bars sample</span>
                              <label className={styles.radioRow}>
                                <input
                                  type="radio"
                                  name="chartWin"
                                  checked={chartWindow === 20}
                                  onChange={() => setChartWindow(20)}
                                />
                                <span>20 events</span>
                              </label>
                              <label className={styles.radioRow}>
                                <input
                                  type="radio"
                                  name="chartWin"
                                  checked={chartWindow === 50}
                                  onChange={() => setChartWindow(50)}
                                />
                                <span>50 events</span>
                              </label>
                            </div>
                            <div className={styles.miniChart} aria-hidden>
                              {chartRows.map((r) => (
                                <div
                                  key={r.id}
                                  className={styles.miniBar}
                                  style={{
                                    height: `${(r.durationMs / maxDur) * 100}%`,
                                  }}
                                  title={`${r.operation} ${r.durationMs.toFixed(0)}ms`}
                                />
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className={styles.filterCollapsed}>
                          <Filter className={styles.filterCollapsedIcon} aria-hidden />
                          {opFilters.size > 0 ? (
                            <Badge variant="secondary" className={styles.filterCollapsedBadge}>
                              {opFilters.size}
                            </Badge>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {!filterLayoutStacked ? (
                      <div className={rail.footer}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`${rail.pinButton} ${filterPinnedOpen ? rail.pinButtonActive : ''}`}
                          aria-pressed={filterPinnedOpen}
                          aria-label={
                            filterPinnedOpen ? 'Unpin filter sidebar' : 'Pin filter sidebar open'
                          }
                          title={
                            filterPinnedOpen
                              ? 'Unpin (collapse when not hovered)'
                              : 'Pin sidebar open'
                          }
                          onClick={() => setFilterPinnedOpen((p) => !p)}
                        >
                          {filterPinnedOpen ? (
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
            </div>

            <div className={styles.eventsMain}>
              {error && <div className={styles.error}>{error}</div>}

              {eventsSub === 'tail' ? (
                <div className={styles.tailWrap} ref={tailRef}>
                  {filteredEvents.slice(0, 40).map((ev) => (
                    <div key={ev.id} className={styles.tailLine}>
                      <span className={styles.tailTime}>{ev.ts.slice(11, 23)}</span>
                      <Badge
                        variant={
                          operationBadgeVariant(ev.operation) === 'error'
                            ? 'destructive'
                            : operationBadgeVariant(ev.operation) === 'warning'
                              ? 'secondary'
                              : operationBadgeVariant(ev.operation) === 'info'
                                ? 'default'
                                : 'outline'
                        }
                      >
                        {ev.operation}
                      </Badge>
                      <span className={styles.tailMsg}>{ev.durationMs.toFixed(1)} ms</span>
                    </div>
                  ))}
                  {filteredEvents.length === 0 && !error && (
                    <p className={styles.empty}>No events match the current filters.</p>
                  )}
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.colNarrow} aria-label="expand" />
                        <th>Time</th>
                        <th>Operation</th>
                        <th>Duration</th>
                        <th>MB/s</th>
                        <th>Rows</th>
                        <th>Bytes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.length === 0 && !error && (
                        <tr>
                          <td colSpan={7} className={styles.empty}>
                            No events yet. Encode, import CSV, or scrub frames to populate the log.
                          </td>
                        </tr>
                      )}
                      {filteredEvents.map((ev) => (
                        <PerfTableRow
                          key={ev.id}
                          ev={ev}
                          expanded={expandedId === ev.id}
                          onToggle={() => setExpandedId((id) => (id === ev.id ? null : ev.id))}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {mainTab === 'storage' && (
        <div className={styles.storagePanel}>
          <div className={styles.storageToolbar}>
            <label className={styles.filterLabel}>
              Table
              <select
                className={styles.select}
                value={effectiveTable ?? ''}
                onChange={(e) => onSelectTable(e.target.value ? e.target.value : null)}
              >
                {tables.length === 0 && <option value="">Default</option>}
                {tables.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadStorage()}>
              Reload metrics
            </Button>
          </div>
          {storageError && <div className={styles.error}>{storageError}</div>}
          {storage && !storageError && (
            <div className={styles.storageGrid}>
              <div className={styles.storageItem}>
                <span className={styles.storageLabel}>MKV</span>
                <span className={styles.storageValue}>{formatBytes(storage.mkvBytes)}</span>
              </div>
              <div className={styles.storageItem}>
                <span className={styles.storageLabel}>Parquet index</span>
                <span className={styles.storageValue}>
                  {formatBytes(storage.parquetIndexBytes)}
                  {storage.parquetIndexExists ? '' : ' (missing)'}
                </span>
              </div>
              <div className={styles.storageItem}>
                <span className={styles.storageLabel}>Rows / frames</span>
                <span className={styles.storageValue}>
                  {storage.rowCount} / {storage.frameCount}
                </span>
              </div>
              <div className={styles.storageItem}>
                <span className={styles.storageLabel}>Est. CSV / Parquet</span>
                <span className={styles.storageValue}>
                  {formatBytes(storage.estimatedCsvBytes)} /{' '}
                  {formatBytes(storage.estimatedParquetBytes)}
                </span>
              </div>
              <div className={styles.storageItem}>
                <span className={styles.storageLabel}>Parquet vs MKV</span>
                <span className={styles.storageValue}>
                  {(storage.parquetVsMkvRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div className={styles.storageItem}>
                <span className={styles.storageLabel}>Last encode (ms)</span>
                <span className={styles.storageValue}>{storage.encodeTimeMs.toFixed(1)}</span>
              </div>
              <div className={styles.storageItem}>
                <span className={styles.storageLabel}>Codec</span>
                <span className={styles.storageValue}>
                  {storage.codec} / {storage.compressionAlgorithm}
                </span>
              </div>
            </div>
          )}
          <p className={styles.storageHint}>
            Snapshot for the selected logical table. The system perf log table{' '}
            <code className={styles.code}>__vsql_perf</code> is hidden from this list.
          </p>
        </div>
      )}

      {mainTab === 'flow' && (
        <div className={styles.flowPanel}>
          <p className={styles.flowIntro}>
            High-level write/read path for vSQL workspaces. Each step emits structured perf events
            you can filter in the Events tab.
          </p>
          <PerfPipelineSvg />
        </div>
      )}
    </section>
  );
}

function PerfTableRow({
  ev,
  expanded,
  onToggle,
}: {
  ev: PerformanceEventRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const bytes = Math.max(ev.bytesIn, ev.bytesOut);
  return (
    <>
      <tr className={styles.dataRow}>
        <td>
          <button
            type="button"
            className={styles.expandBtn}
            onClick={onToggle}
            aria-expanded={expanded ? 'true' : 'false'}
          >
            {expanded ? '−' : '+'}
          </button>
        </td>
        <td className={styles.mono}>{ev.ts}</td>
        <td>
          <Badge
            variant={
              operationBadgeVariant(ev.operation) === 'error'
                ? 'destructive'
                : operationBadgeVariant(ev.operation) === 'warning'
                  ? 'secondary'
                  : operationBadgeVariant(ev.operation) === 'info'
                    ? 'default'
                    : 'outline'
            }
          >
            {ev.operation}
          </Badge>
        </td>
        <td className={styles.mono}>{ev.durationMs.toFixed(1)} ms</td>
        <td className={styles.mono}>{mbPerSec(bytes, ev.durationMs)}</td>
        <td className={styles.mono}>{ev.rows != null ? String(ev.rows) : '—'}</td>
        <td className={styles.mono}>
          {formatBytes(ev.bytesIn)} / {formatBytes(ev.bytesOut)}
        </td>
      </tr>
      {expanded && (
        <tr className={styles.detailRow}>
          <td colSpan={7}>
            <div className={styles.detailBox}>
              <p className={styles.detailLabel}>Meta</p>
              <pre className={styles.detailPre}>{formatMetaPretty(ev.meta)}</pre>
              <p className={styles.detailMuted}>Summary: {metaNotes(ev.meta)}</p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
