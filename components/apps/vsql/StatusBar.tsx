'use client';

import { Database as DatabaseIcon, Server, Activity } from 'lucide-react';
import styles from './StatusBar.module.css';

type StatusBarProps = {
  dbId: string;
  busy: boolean;
  payloadFrames: number;
  apiBase: string;
};

export function StatusBar({ dbId, busy, payloadFrames, apiBase }: StatusBarProps) {
  return (
    <footer className={styles.statusBar}>
      <div className={styles.statusLeft}>
        <span className={styles.statusItem}>
          <DatabaseIcon className={styles.statusIconGreen} />
          <span>db: {dbId.slice(0, 8)}...</span>
        </span>
        <span className={styles.statusFrames}>
          <Server className={styles.statusIconMuted} />
          <span>frames: {payloadFrames}</span>
        </span>
        <span className={styles.statusOnline}>
          <span className={styles.statusOnlineDot} />
          <span>online</span>
        </span>
      </div>
      <div className={styles.statusRight}>
        <span className={styles.statusApi}>{apiBase}</span>
        <span className={`${styles.statusState} ${busy ? styles.statusBusy : styles.statusReady}`}>
          <Activity
            className={`${styles.statusActivityIcon} ${busy ? styles.statusActivityPulse : ''}`}
          />
          <span>{busy ? 'processing' : 'ready'}</span>
        </span>
      </div>
    </footer>
  );
}
