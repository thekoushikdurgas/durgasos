'use client';

import { Button } from '@/components/ui/button';
import { type CommandItem } from './ui/search-modal';
import {
  Activity,
  Database as DatabaseIcon,
  Download,
  FileSpreadsheet,
  Play,
  Search as SearchIcon,
  Star,
  Table2,
  Terminal,
  Upload,
  Video,
} from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './AppShell.module.css';
import { SessionSidebar } from './SessionSidebar';
import { StatusBar } from './StatusBar';
import { TuggableBulbThemeToggle } from './TuggableBulbThemeToggle';
import type { VsqlView } from './types';

type AppShellProps = {
  children: ReactNode;
  currentView: VsqlView;
  setCurrentView: (view: VsqlView) => void;
  dbId: string;
  apiBase: string;
  busy: boolean;
  payloadFrames: number;
  tablesCount: number;
  encodeReady: boolean;
  /** Used for header FPS badge */
  videoFps: number;
  onImportCsv: () => void;
  onDecodeMp4: () => void;
  onEncodeVideo: () => void;
  downloadUrl: string;
  onNewDatabase: () => void;
  /** When set (overview), Rate control renders in the top header before CSV/Encode actions. */
  overviewToolbar?: {
    onOpenRate: () => void;
    experienceBusy: boolean;
  };
};

export function AppShell({
  children,
  currentView,
  setCurrentView,
  dbId,
  apiBase,
  busy,
  payloadFrames,
  tablesCount,
  encodeReady,
  videoFps,
  onImportCsv,
  onDecodeMp4,
  onEncodeVideo,
  downloadUrl,
  onNewDatabase,
  overviewToolbar,
}: AppShellProps) {
  const commands: CommandItem[] = [
    {
      id: 'import-csv',
      title: 'Import CSV',
      description: 'Create a table from CSV rows',
      category: 'Data',
      icon: FileSpreadsheet,
      onSelect: onImportCsv,
    },
    {
      id: 'sql',
      title: 'Open SQL Terminal',
      description: 'Run SELECT, INSERT, UPDATE, DELETE',
      category: 'Navigation',
      icon: Terminal,
      onSelect: () => setCurrentView('sql'),
    },
    {
      id: 'table-explorer',
      title: 'Open Table Explorer',
      description: 'Browse tables, schema, and edit rows',
      category: 'Navigation',
      icon: Table2,
      onSelect: () => setCurrentView('tableExplorer'),
    },
    {
      id: 'search',
      title: 'Open Durgas Search',
      description: 'Index documents, bulk ingest, and query the local search API',
      category: 'Navigation',
      icon: SearchIcon,
      onSelect: () => setCurrentView('search'),
    },
    {
      id: 'search-health',
      title: 'Durgas Search Cluster Health',
      description: 'Open Search Console with cluster health examples',
      category: 'Search',
      icon: SearchIcon,
      onSelect: () => setCurrentView('search'),
    },
    {
      id: 'visualizer',
      title: 'Open Pixel Inspector',
      description: 'Preview vSQL frame storage',
      category: 'Navigation',
      icon: Video,
      onSelect: () => setCurrentView('visualizer'),
    },
    {
      id: 'performance',
      title: 'Open Performance log',
      description: 'Recent encode/decode timings and storage snapshot',
      category: 'Navigation',
      icon: Activity,
      onSelect: () => setCurrentView('performance'),
    },
    {
      id: 'decode',
      title: 'Decode MP4',
      description: 'Recover a vSQL database from video',
      category: 'Video',
      icon: Upload,
      onSelect: onDecodeMp4,
    },
    {
      id: 'new-db',
      title: 'New Database',
      description: 'Create a fresh video database workspace',
      category: 'Workspace',
      icon: DatabaseIcon,
      onSelect: onNewDatabase,
    },
  ];

  return (
    <div className={styles.appShell}>
      <SessionSidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        commands={commands}
        dbId={dbId}
        apiBase={apiBase}
        tablesCount={tablesCount}
        encodeReady={encodeReady}
        onNewDatabase={onNewDatabase}
      />

      <main className={styles.main}>
        <header className={styles.topHeader}>
          <div className={styles.metaTags}>
            <span className={styles.metaTag}>1280x720</span>
            <span className={`${styles.metaTag} ${styles.metaTagCyan}`}>{videoFps} FPS</span>
            <span className={styles.metaTag}>
              {payloadFrames} payload frame{payloadFrames === 1 ? '' : 's'}
            </span>
          </div>

          <div className={styles.headerToolbar}>
            {overviewToolbar && (
              <div className={styles.overviewTopbarActions}>
                <Button
                  type="button"
                  variant="outline"
                  className={styles.overviewRateButton}
                  onClick={overviewToolbar.onOpenRate}
                  disabled={overviewToolbar.experienceBusy}
                >
                  <Star className={styles.overviewTopbarIcon} aria-hidden />
                  Rate
                </Button>
              </div>
            )}
            <div className={styles.actionBar}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onImportCsv}
                className={styles.actionButton}
              >
                <FileSpreadsheet className={styles.actionIconGreen} />
                CSV
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onDecodeMp4}
                className={styles.actionButton}
              >
                <Upload className={styles.actionIconCyan} />
                Decode
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onEncodeVideo}
                disabled={busy}
                className={`${styles.actionButton} ${styles.encodeButton}`}
              >
                <Play className={styles.actionIconDefault} />
                Encode
              </Button>
              <Button
                asChild
                size="sm"
                className={`${styles.actionButton} ${styles.downloadButton}`}
              >
                <a href={downloadUrl}>
                  <Download className={styles.actionIconDefault} />
                  MP4
                </a>
              </Button>
            </div>
            <TuggableBulbThemeToggle />
          </div>
        </header>

        <div
          className={
            currentView === 'overview'
              ? `${styles.content} ${styles.contentOverview}`
              : styles.content
          }
        >
          {children}
        </div>

        {currentView !== 'overview' && (
          <StatusBar dbId={dbId} busy={busy} payloadFrames={payloadFrames} apiBase={apiBase} />
        )}
      </main>
    </div>
  );
}
