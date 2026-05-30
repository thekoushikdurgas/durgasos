'use client';

import type { SchemaColumn } from '@/lib/vsql-api';
import { computePreviewColumnStats, schemaColumnsByName } from './tablePreviewStats';
import styles from './TableExplorer.module.css';

type TableColumnPreviewInsightsProps = {
  tableSchema: SchemaColumn[] | null;
  previewColumns: string[] | null;
  previewData: unknown[][] | null;
};

export function TableColumnPreviewInsights({
  tableSchema,
  previewColumns,
  previewData,
}: TableColumnPreviewInsightsProps) {
  if (!tableSchema || tableSchema.length === 0 || !previewColumns || !previewData) {
    return null;
  }

  const sampleRows = previewData.length;
  const byName = schemaColumnsByName(tableSchema);
  const stats = computePreviewColumnStats(previewColumns, previewData);

  return (
    <div className={styles.insightsSection}>
      <div className={styles.insightsSectionTitle}>Preview data analysis</div>
      <p className={styles.insightsDisclaimer}>
        Stats from the first {sampleRows} row{sampleRows === 1 ? '' : 's'} in this preview — not
        whole-table aggregates.
      </p>
      <div className={styles.insightsScroll}>
        <div className={styles.insightsGrid}>
          {stats.map((s) => {
            const meta = byName.get(s.column);
            return (
              <div key={s.column} className={styles.insightCard}>
                <div className={styles.insightCardTitle}>{s.column}</div>
                {meta ? (
                  <div className={styles.insightMeta}>
                    <span className={styles.insightType}>{meta.type}</span>
                    {meta.pk ? <span className={styles.schemaBadge}>PK</span> : null}
                    {meta.notnull ? (
                      <span className={styles.schemaBadge}>NOT NULL</span>
                    ) : (
                      <span className={styles.schemaBadgeMuted}>NULL ok</span>
                    )}
                  </div>
                ) : null}
                <dl className={styles.insightDl}>
                  <div>
                    <dt>Non-null</dt>
                    <dd>{s.nonNull}</dd>
                  </div>
                  <div>
                    <dt>Distinct</dt>
                    <dd>{s.distinct}</dd>
                  </div>
                  <div className={styles.insightDlSpan}>
                    <dt>Range / shape</dt>
                    <dd>{s.rangeHint}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
