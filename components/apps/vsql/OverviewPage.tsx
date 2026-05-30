'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/apps/vsql/ui/dialog';
import { SHADER_SRC, ShaderCanvas } from '@/components/apps/vsql/ui/shader-canvas';
import { Database as DatabaseIcon, FileSpreadsheet, Terminal, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { FRAME_HEIGHT, FRAME_WIDTH } from './constants';
import styles from './OverviewPage.module.css';

type OverviewPageProps = {
  onImportCsv: () => void;
  onOpenSql: () => void;
  onOpenInspector: () => void;
  onSubmitExperience: (message: string, rating: number | null) => Promise<void>;
  experienceBusy: boolean;
  ratingOpen: boolean;
  onRatingOpenChange: (open: boolean) => void;
};

export function OverviewPage({
  onImportCsv,
  onOpenSql,
  onOpenInspector,
  onSubmitExperience,
  experienceBusy,
  ratingOpen,
  onRatingOpenChange,
}: OverviewPageProps) {
  const [expMessage, setExpMessage] = useState('');
  const [expRating, setExpRating] = useState<number | null>(null);

  return (
    <div className={styles.overview}>
      {/* Animated shader background */}
      <div className={styles.shaderBackground}>
        <ShaderCanvas fragSource={SHADER_SRC} />
      </div>
      <div className={styles.content}>
        <Dialog open={ratingOpen} onOpenChange={onRatingOpenChange}>
          <DialogContent className={styles.rateDialogContent}>
            <DialogHeader className={styles.rateDialogHeader}>
              <DialogTitle className={styles.rateDialogTitle}>Help us improve</DialogTitle>
              <DialogDescription className={styles.rateDialogDescription}>
                Saved to the video table <code className={styles.inlineCode}>user_experience</code>.
                Rating is optional (1–5).
              </DialogDescription>
            </DialogHeader>

            <div className={styles.rateDialogBody}>
              <form
                className={styles.rateForm}
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <div className={styles.rateFormStack}>
                  <fieldset className={styles.ratingFieldset}>
                    <legend className={styles.ratingLegend}>
                      How would you rate your experience?
                    </legend>
                    <div
                      className={styles.ratingGroup}
                      role="radiogroup"
                      aria-label="Experience rating"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <label
                          key={n}
                          className={`${styles.ratingSegment} ${expRating === n ? styles.ratingSegmentChecked : ''}`}
                        >
                          <input
                            type="radio"
                            name="overview-exp-rating"
                            value={n}
                            checked={expRating === n}
                            onChange={() => setExpRating(n)}
                            disabled={experienceBusy}
                            className={styles.ratingInput}
                          />
                          <span className={styles.ratingDigit}>{n}</span>
                        </label>
                      ))}
                    </div>
                    <div className={styles.ratingScaleHints}>
                      <span>Poor</span>
                      <span>Excellent</span>
                    </div>
                  </fieldset>

                  <div className={styles.rateTextareaBlock}>
                    <label className={styles.rateTextareaLabel} htmlFor="overview-exp-feedback">
                      Why did you give this rating?
                    </label>
                    <textarea
                      id="overview-exp-feedback"
                      className={styles.rateTextarea}
                      placeholder="What worked well or needs improvement?"
                      rows={4}
                      value={expMessage}
                      onChange={(e) => setExpMessage(e.target.value)}
                      disabled={experienceBusy}
                      aria-label="Experience feedback"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  className={styles.rateSubmit}
                  disabled={experienceBusy || !expMessage.trim()}
                  onClick={() =>
                    void onSubmitExperience(expMessage.trim(), expRating).then(() => {
                      setExpMessage('');
                      setExpRating(null);
                      onRatingOpenChange(false);
                    })
                  }
                >
                  Send feedback
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Store structured data in lossless video frames,{' '}
            <span className={styles.heroTitleMuted}>then recover it exactly.</span>
          </h1>
          <p className={styles.heroDescription}>
            A backend-powered video database workspace that imports CSV, runs SQL, edits rows, and
            encodes database snapshots into {FRAME_WIDTH}x{FRAME_HEIGHT} frame storage.
          </p>
          <div className={styles.actionBar}>
            <Button type="button" onClick={onImportCsv} className={styles.importButton}>
              <FileSpreadsheet className={styles.importIcon} />
              Import CSV
            </Button>
            <Button
              type="button"
              onClick={onOpenSql}
              variant="outline"
              className={styles.sqlButton}
            >
              <Terminal className={styles.sqlIcon} />
              Open SQL Terminal
            </Button>
            <Button
              type="button"
              onClick={onOpenInspector}
              variant="ghost"
              className={styles.inspectButton}
            >
              <Video className={styles.inspectIcon} />
              Inspect Pixels
            </Button>
          </div>
        </div>

        <div className={styles.metricsGrid}>
          <MetricCard label="Encode" value="RGB" suffix="/pixel" color="cyan" />
          <MetricCard label="Read" value="SQL" suffix="/crud" color="green" />
          <MetricCard label="Recover" value="SHA-256" suffix="" color="white" />
        </div>

        <StorageArchitectureCallout />

        <div className={styles.featuresGrid}>
          <FeatureCard
            accent="cyan"
            title="Video persistence"
            description="Chunk compressed structured data into frame pixels, preserve metadata, and export through the backend FFmpeg pipeline."
            footer={
              <>
                <span className={styles.codeCyan}>encode</span>
                <span className={styles.codeCyanLight}>(db)</span>{' '}
                <span className={styles.codeMuted}>→</span> frames{' '}
                <span className={styles.codeMuted}>→</span> video
              </>
            }
          />
          <FeatureCard
            accent="green"
            title="Exact recovery"
            description="Decode frames sequentially, strip black padding, verify the checksum, and recover the original table payload."
            footer={
              <>
                video <span className={styles.codeMuted}>→</span> frames{' '}
                <span className={styles.codeMuted}>→</span> bytes{' '}
                <span className={styles.codeMuted}>→</span>{' '}
                <span className={styles.codeGreen}>db</span>
              </>
            }
          />
          <div className={styles.csvCard}>
            <div className={styles.csvLabel}>
              <div className={styles.csvDot} />
              CSV Import
            </div>
            <h3 className={styles.csvTitle}>Infer schema and create table</h3>
            <p className={styles.csvDescription}>
              Upload a CSV with fields like name, email, and phone. vSQL creates a video-backed
              table and updates the frame preview automatically.
            </p>
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <span>Video Table Data</span>
                <DatabaseIcon className={styles.tableHeaderIcon} />
              </div>
              <table className={styles.table}>
                <tbody className={styles.tableBody}>
                  {['name', 'email', 'phone'].map((column, index) => (
                    <tr key={column} className={styles.tableRow}>
                      <td className={`${styles.tableCell} ${styles.tableCellName}`}>{column}</td>
                      <td className={`${styles.tableCell} ${styles.tableCellType}`}>text</td>
                      <td className={`${styles.tableCell} ${styles.tableCellValue}`}>
                        {index === 0 ? 'Alice' : index === 1 ? 'user@site.com' : '+91...'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: string;
  suffix: string;
  color: 'cyan' | 'green' | 'white';
}) {
  const colorClass =
    color === 'cyan'
      ? styles.metricValueCyan
      : color === 'green'
        ? styles.metricValueGreen
        : styles.metricValueWhite;
  return (
    <div className={styles.metricCard}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={`${styles.metricValue} ${colorClass}`}>
        {value}
        {suffix && <span className={styles.metricSuffix}>{suffix}</span>}
      </span>
    </div>
  );
}

function StorageArchitectureCallout() {
  const rows = [
    {
      layer: 'MKV · FFV1',
      role: 'Archival — exact lossless byte recovery',
      speed: '500 MB/s+',
      size: '~1× CSV',
      badge: 'archive',
    },
    {
      layer: 'Parquet · zstd',
      role: 'Analytics — column pruning + predicate pushdown',
      speed: '200–600 MB/s',
      size: '~0.2–0.5× CSV',
      badge: 'analytics',
    },
    {
      layer: 'Arrow · IPC',
      role: 'In-memory interchange — zero-copy reads',
      speed: '1–3 GB/s',
      size: '~0.4–0.7× CSV',
      badge: 'fast',
    },
  ] as const;

  return (
    <div className={styles.archCallout}>
      <div className={styles.archCalloutHeader}>
        <span className={styles.archCalloutDot} />
        <span className={styles.archCalloutTitle}>Hybrid Storage Architecture</span>
        <span className={styles.archCalloutSub}>
          vSQL pairs a video archive with a columnar analytics index for best of both worlds.
        </span>
      </div>

      <div className={styles.archTable}>
        <div className={styles.archTableHead}>
          <span>Layer</span>
          <span>Role</span>
          <span>Write speed</span>
          <span>Size vs CSV</span>
        </div>
        {rows.map((r) => (
          <div key={r.layer} className={styles.archTableRow}>
            <span className={styles.archLayerName}>{r.layer}</span>
            <span className={styles.archLayerRole}>{r.role}</span>
            <span className={styles.archLayerSpeed}>{r.speed}</span>
            <span
              className={`${styles.archLayerSize} ${
                r.badge === 'archive'
                  ? styles.archSizeCyan
                  : r.badge === 'analytics'
                    ? styles.archSizeGreen
                    : styles.archSizeYellow
              }`}
            >
              {r.size}
            </span>
          </div>
        ))}
      </div>

      <p className={styles.archCalloutNote}>
        After each encode, vSQL automatically writes a <code>vsql-index.parquet</code> sidecar next
        to the MKV. Analytical queries hit the Parquet file; only exact payload recovery decodes the
        video.
      </p>
    </div>
  );
}

function FeatureCard({
  accent,
  title,
  description,
  footer,
}: {
  accent: 'cyan' | 'green';
  title: string;
  description: string;
  footer: ReactNode;
}) {
  const dotClass = accent === 'cyan' ? styles.featureDotCyan : styles.featureDotGreen;
  const labelClass = accent === 'cyan' ? styles.featureLabelCyan : styles.featureLabelGreen;
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureHeader}>
        <div className={styles.featureHeaderBody}>
          <div className={`${styles.featureLabel} ${labelClass}`}>
            <div className={`${styles.featureDot} ${dotClass}`} />
            Encoder
          </div>
          <h3 className={styles.featureTitle}>{title}</h3>
          <p className={styles.featureDescription}>{description}</p>
        </div>
      </div>
      <div className={styles.featureFooter}>{footer}</div>
    </div>
  );
}
