'use client';

import { SHADER_SRC, ShaderCanvas } from '@/components/apps/vsql/ui/shader-canvas';
import {
  fetchFramePreviewDataUrl,
  formatExportUrl,
  getStorageMetrics,
  type StorageMetrics,
} from '@/lib/vsql-api';
import { useEffect, useId, useMemo, useState } from 'react';
import { FRAME_HEIGHT, FRAME_WIDTH } from './constants';
import styles from './VideoInspectorPage.module.css';

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

type VideoInspectorPageProps = {
  dbId: string;
  previewRevision: number;
  payloadFrames: number;
  /** MKV file size on disk (bytes), when known */
  videoFileSizeBytes: number;
  videoFps: number;
  currentFrameIndex: number;
  setCurrentFrameIndex: (index: number) => void;
  busy: boolean;
  encodeHourShell: boolean;
  tables: string[];
  selectedTable: string | null;
  setSelectedTable: (table: string | null) => void;
  downloadUrl: string;
};

const PER_FRAME_PAYLOAD_BYTES = FRAME_WIDTH * FRAME_HEIGHT * 3;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function VideoInspectorPage({
  dbId,
  previewRevision,
  payloadFrames,
  videoFileSizeBytes,
  videoFps,
  currentFrameIndex,
  setCurrentFrameIndex,
  busy,
  encodeHourShell,
  tables,
  selectedTable,
  setSelectedTable,
  downloadUrl,
}: VideoInspectorPageProps) {
  const fps = Math.max(1, videoFps);
  const maxFrame = Math.max(0, payloadFrames - 1);
  const safeIndex = Math.min(currentFrameIndex, maxFrame);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const activeTable = selectedTable ?? tables[0] ?? null;
  const secondsAtFrame = safeIndex / fps;
  const totalLogicalCapacity = payloadFrames * PER_FRAME_PAYLOAD_BYTES;

  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [metricsOpen, setMetricsOpen] = useState(false);

  useEffect(() => {
    if (!metricsOpen || !dbId) return;
    let cancelled = false;
    void (async () => {
      try {
        const m = await getStorageMetrics(dbId, activeTable);
        if (!cancelled) setMetrics(m);
      } catch {
        // non-critical — panel shows placeholders
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [metricsOpen, dbId, activeTable, previewRevision]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = await fetchFramePreviewDataUrl(dbId, safeIndex, activeTable);
        if (!cancelled) setFrameSrc(url);
      } catch {
        if (!cancelled) setFrameSrc(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTable, dbId, previewRevision, safeIndex]);

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>Pixel Storage Inspector</h3>
        <div className={styles.headerActions}>
          <select
            title="Select table video"
            value={activeTable ?? ''}
            onChange={(event) => setSelectedTable(event.target.value || null)}
            className={styles.tableSelect}
            disabled={busy || tables.length === 0}
          >
            {tables.length === 0 && <option value="">No tables</option>}
            {tables.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
          <a href={downloadUrl} className={styles.downloadLink}>
            Download MKV
          </a>
          <a
            href={formatExportUrl(dbId, 'parquet', activeTable)}
            className={styles.downloadLink}
            download
          >
            Download Parquet
          </a>
          <a
            href={formatExportUrl(dbId, 'arrow', activeTable)}
            className={styles.downloadLink}
            download
          >
            Download Arrow
          </a>
          <span className={styles.statusBadge}>
            <div
              className={`${styles.statusDot} ${busy ? styles.statusDotBusy : styles.statusDotLive}`}
            />
            {busy ? 'PROCESSING' : 'LIVE_FEED'}
          </span>
        </div>
      </div>

      <div className={styles.videoContainer}>
        <ShaderCanvas fragSource={SHADER_SRC} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`Frame ${safeIndex}`}
          className={styles.frameImage}
          height={FRAME_HEIGHT}
          src={frameSrc ?? TRANSPARENT_PIXEL}
          width={FRAME_WIDTH}
        />
        <div className={styles.shaderCanvas}>
          <ShaderCanvas fragSource={SHADER_SRC} />
        </div>
        <div className={styles.scanLine} />
      </div>

      <div className={styles.controls}>
        <div className={styles.controlsHeader}>
          <span className={styles.controlsLabel}>Timeline</span>
          <div className={styles.timeDisplay}>
            <div className={styles.timeBlock}>
              <span className={styles.timeLabel}>Frame</span>
              <span className={styles.timeValue}>
                {safeIndex.toString().padStart(4, '0')} / {maxFrame.toString().padStart(4, '0')}
              </span>
            </div>
            <div className={styles.timeDivider} />
            <div className={styles.timeBlock}>
              <span className={styles.timeLabel}>Time @ {fps} FPS</span>
              <span className={styles.timeValue}>{secondsAtFrame.toFixed(4)}s</span>
            </div>
          </div>
        </div>

        <div className={styles.numericRow}>
          <label className={styles.numLabel}>
            Frame #
            <input
              type="number"
              title="Frame index"
              min={0}
              max={maxFrame}
              value={safeIndex}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isNaN(v)) return;
                setCurrentFrameIndex(Math.min(maxFrame, Math.max(0, v)));
              }}
              className={styles.numInput}
            />
          </label>
          <label className={styles.numLabel}>
            Seconds
            <input
              type="number"
              title="Time in seconds (mapped with current FPS)"
              step="any"
              min={0}
              value={Number.isFinite(secondsAtFrame) ? secondsAtFrame : 0}
              onChange={(e) => {
                const s = parseFloat(e.target.value);
                if (Number.isNaN(s)) return;
                const idx = Math.round(s * fps);
                setCurrentFrameIndex(Math.min(maxFrame, Math.max(0, idx)));
              }}
              className={styles.numInput}
            />
          </label>
        </div>

        <FrameTimelineSlider
          value={safeIndex}
          maxFrame={maxFrame}
          disabled={busy}
          onChange={setCurrentFrameIndex}
        />
      </div>

      <div className={styles.infoPanel}>
        <div className={styles.infoHeader}>
          <span className={styles.infoIcon}>📼</span> Storage Details
        </div>
        <div className={styles.infoText}>
          Preview uses physical frame index{' '}
          <span className={styles.infoHighlight}>{safeIndex}</span> of your {FRAME_WIDTH}×
          {FRAME_HEIGHT} RGBA video. Logical CSV payload uses RGB bytes per frame (capacity{' '}
          {PER_FRAME_PAYLOAD_BYTES.toLocaleString()} B).
        </div>
        <div className={styles.detailsGrid}>
          <Detail label="Table Video" value={activeTable ?? 'none'} />
          <Detail label="Payload frames" value={payloadFrames.toLocaleString()} />
          <Detail
            label="Logical shell"
            value={
              encodeHourShell
                ? `1 hour @ ${fps} fps (${(3600 * fps).toLocaleString()} frames)`
                : 'payload only'
            }
          />
          <Detail
            label="MKV file size"
            value={videoFileSizeBytes > 0 ? formatBytes(videoFileSizeBytes) : '—'}
          />
          <Detail
            label="Per-frame payload cap"
            value={`${PER_FRAME_PAYLOAD_BYTES.toLocaleString()} B`}
          />
          <Detail label="Total logical payload cap" value={formatBytes(totalLogicalCapacity)} />
          <Detail label="Current time" value={`${secondsAtFrame.toFixed(4)} s @ ${fps} FPS`} />
        </div>
      </div>

      <StorageMetricsPanel
        dbId={dbId}
        tableName={activeTable}
        metrics={metrics}
        open={metricsOpen}
        onToggle={() => setMetricsOpen((o) => !o)}
      />
    </section>
  );
}

const FRAME_SLIDER_MAX_TICKS = 13;

function tickFramesForMax(maxFrame: number): number[] {
  if (maxFrame <= 0) return [0];
  const span = maxFrame + 1;
  if (span <= FRAME_SLIDER_MAX_TICKS) {
    return Array.from({ length: span }, (_, i) => i);
  }
  const n = FRAME_SLIDER_MAX_TICKS;
  return Array.from({ length: n }, (_, i) => Math.round((i / (n - 1)) * maxFrame));
}

function FrameTimelineSlider({
  value,
  maxFrame,
  disabled,
  onChange,
}: {
  value: number;
  maxFrame: number;
  disabled: boolean;
  onChange: (index: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const ticks = useMemo(() => tickFramesForMax(maxFrame), [maxFrame]);
  const skipInterval = ticks.length > 10 ? 2 : 1;
  const fillPct = maxFrame > 0 ? Math.min(100, Math.max(0, (value / maxFrame) * 100)) : 0;

  useEffect(() => {
    if (!dragging) return;
    const end = () => setDragging(false);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [dragging]);

  const rangeId = useId();
  const labelId = `${rangeId}-label`;

  return (
    <div className={styles.frameSliderBlock}>
      <div className={styles.frameSliderHeader}>
        <span id={labelId} className={styles.frameSliderLabel}>
          Frame timeline
        </span>
        {dragging ? (
          <output className={styles.frameSliderValueBadge} htmlFor={rangeId}>
            {value}
          </output>
        ) : null}
      </div>
      <div className={styles.frameSliderInner}>
        <input
          id={rangeId}
          type="range"
          className={styles.frameSliderInput}
          title="Frame index"
          aria-labelledby={labelId}
          aria-valuetext={`Frame ${value} of ${maxFrame}`}
          min={0}
          max={maxFrame}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => setDragging(true)}
          style={{ ['--fill-pct' as string]: `${fillPct}%` }}
        />
        <div className={styles.frameSliderTicks} aria-hidden>
          {ticks.map((frame, i) => {
            const major = i % skipInterval === 0 || i === ticks.length - 1;
            return (
              <span key={`${frame}-${i}`} className={styles.frameSliderTick}>
                <span
                  className={
                    major ? styles.frameSliderTickMarkMajor : styles.frameSliderTickMarkMinor
                  }
                />
                <span
                  className={major ? styles.frameSliderTickNum : styles.frameSliderTickNumHidden}
                >
                  {frame}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailCard}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={styles.detailValue}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Storage Metrics Panel
// ---------------------------------------------------------------------------

type StorageMetricsPanelProps = {
  dbId: string;
  tableName: string | null;
  metrics: StorageMetrics | null;
  open: boolean;
  onToggle: () => void;
};

function StorageMetricsPanel({
  dbId,
  tableName,
  metrics,
  open,
  onToggle,
}: StorageMetricsPanelProps) {
  const mkvMB = metrics ? (metrics.mkvBytes / 1_048_576).toFixed(2) : '—';
  const csvMB = metrics ? (metrics.estimatedCsvBytes / 1_048_576).toFixed(2) : '—';
  const parquetMB = metrics ? (metrics.estimatedParquetBytes / 1_048_576).toFixed(2) : '—';

  // Bar widths relative to the largest of the three values
  const maxBytes = metrics
    ? Math.max(metrics.mkvBytes, metrics.estimatedCsvBytes, metrics.estimatedParquetBytes, 1)
    : 1;
  const mkvPct = metrics ? (metrics.mkvBytes / maxBytes) * 100 : 0;
  const csvPct = metrics ? (metrics.estimatedCsvBytes / maxBytes) * 100 : 0;
  const parquetPct = metrics ? (metrics.estimatedParquetBytes / maxBytes) * 100 : 0;

  return (
    <div className={styles.metricsPanel}>
      <button className={styles.metricsPanelToggle} onClick={onToggle} aria-expanded={open}>
        <span className={styles.metricsPanelIcon}>{open ? '▼' : '▶'}</span>
        <span>Storage Format Comparison</span>
        {metrics?.parquetIndexExists && (
          <span className={styles.parquetBadge}>Parquet index live</span>
        )}
      </button>

      {open && (
        <div className={styles.metricsPanelBody}>
          {/* Format comparison bars */}
          <div className={styles.metricsBars}>
            <FormatBar
              label="MKV (FFV1 lossless)"
              sublabel={`${mkvMB} MB · codec: ${metrics?.codec ?? 'ffv1'} · compression: ${metrics?.compressionAlgorithm ?? 'zstd'}`}
              pct={mkvPct}
              colorClass={styles.barMkv}
            />
            <FormatBar
              label="CSV (uncompressed text)"
              sublabel={`${csvMB} MB estimated`}
              pct={csvPct}
              colorClass={styles.barCsv}
            />
            <FormatBar
              label="Parquet / Arrow (columnar)"
              sublabel={`${parquetMB} MB estimated`}
              pct={parquetPct}
              colorClass={styles.barParquet}
            />
          </div>

          {/* Stats grid */}
          <div className={styles.metricsGrid}>
            <MetricStat label="Rows" value={metrics?.rowCount.toLocaleString() ?? '—'} />
            <MetricStat label="Frames" value={metrics?.frameCount.toLocaleString() ?? '—'} />
            <MetricStat
              label="Compression ratio"
              value={metrics?.compressionRatio ? `${metrics.compressionRatio.toFixed(2)}×` : '—'}
            />
            <MetricStat
              label="Parquet vs MKV"
              value={metrics?.parquetVsMkvRatio ? `${metrics.parquetVsMkvRatio.toFixed(2)}×` : '—'}
            />
            <MetricStat
              label="Encode time"
              value={metrics?.encodeTimeMs ? `${metrics.encodeTimeMs.toFixed(1)} ms` : '—'}
            />
            <MetricStat
              label="Parquet index"
              value={metrics?.parquetIndexExists ? 'Built' : 'Not yet built'}
            />
          </div>

          {/* Export buttons */}
          <div className={styles.metricsExportRow}>
            <span className={styles.metricsExportLabel}>Download as:</span>
            <a
              href={formatExportUrl(dbId, 'parquet', tableName)}
              className={styles.metricsExportBtn}
              download
            >
              Parquet
            </a>
            <a
              href={formatExportUrl(dbId, 'arrow', tableName)}
              className={styles.metricsExportBtn}
              download
            >
              Arrow / Feather
            </a>
          </div>

          <p className={styles.metricsNote}>
            MKV is the exact lossless archive. Parquet/Arrow enable columnar analytics with
            predicate pushdown — up to 10× smaller and faster for analytical queries.
          </p>
        </div>
      )}
    </div>
  );
}

function FormatBar({
  label,
  sublabel,
  pct,
  colorClass,
}: {
  label: string;
  sublabel: string;
  pct: number;
  colorClass: string;
}) {
  return (
    <div className={styles.formatBar}>
      <div className={styles.formatBarLabelRow}>
        <span className={styles.formatBarLabel}>{label}</span>
        <span className={styles.formatBarSublabel}>{sublabel}</span>
      </div>
      <div className={styles.formatBarTrack}>
        <div
          className={`${styles.formatBarFill} ${colorClass}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metricStat}>
      <span className={styles.metricStatLabel}>{label}</span>
      <span className={styles.metricStatValue}>{value}</span>
    </div>
  );
}
