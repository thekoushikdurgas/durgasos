'use client';

import { feedbackEntries, type FeedbackEntryRow } from '@/lib/vsql-api';
import { useCallback, useEffect, useState } from 'react';
import styles from './FeedbackPage.module.css';

type FeedbackPageProps = {
  dbId: string;
};

export function FeedbackPage({ dbId }: FeedbackPageProps) {
  const [rows, setRows] = useState<FeedbackEntryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await feedbackEntries(dbId, 80);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    }
  }, [dbId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <span className={styles.prompt}>❯</span>
        <span>USER_FEEDBACK.log</span>
      </div>
      <p className={styles.intro}>
        Entries are stored in the video-backed <code className={styles.code}>user_experience</code>{' '}
        table for this workspace.
      </p>
      <button type="button" className={styles.refresh} onClick={() => void load()}>
        Refresh list
      </button>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.list}>
        {rows.length === 0 && !error && <p className={styles.empty}>No feedback rows yet.</p>}
        {rows.map((row, i) => (
          <article key={`${row.created_at}-${i}`} className={styles.card}>
            <div className={styles.meta}>
              <span className={styles.date}>{row.created_at}</span>
              <span className={styles.session}>{row.session_id}</span>
              {row.rating != null && <span className={styles.rating}>★ {row.rating}</span>}
            </div>
            <p className={styles.message}>{row.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
