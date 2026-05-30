'use client';

import { Button } from '@/components/ui/button';
import { SearchModal, type CommandItem } from './ui/search-modal';
import { motion, type Transition } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ChevronsUpDown,
  Database,
  LayoutDashboard,
  MessageSquareText,
  Pin,
  PinOff,
  Plus,
  Search as SearchIcon,
  Settings,
  Table2,
  Terminal,
  UserRound,
  Video,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { viewItems } from './constants';
import styles from './SessionSidebar.module.css';
import type { VsqlView } from './types';

const WIDTH_OPEN = '15rem';
const WIDTH_COLLAPSED = '3.05rem';

const VIEW_ICONS: Record<VsqlView, LucideIcon> = {
  overview: LayoutDashboard,
  sql: Terminal,
  tableExplorer: Table2,
  search: SearchIcon,
  visualizer: Video,
  performance: Activity,
  settings: Settings,
  feedback: MessageSquareText,
};

const PRIMARY_IDS: VsqlView[] = ['overview', 'sql', 'tableExplorer', 'search', 'visualizer'];
const SECONDARY_IDS: VsqlView[] = ['performance', 'settings', 'feedback'];

function truncateDbId(id: string, max = 14) {
  if (!id) return '—';
  if (id.length <= max) return id;
  return `${id.slice(0, max - 1)}…`;
}

type SessionSidebarProps = {
  currentView: VsqlView;
  setCurrentView: (view: VsqlView) => void;
  commands: CommandItem[];
  dbId: string;
  apiBase: string;
  tablesCount: number;
  encodeReady: boolean;
  onNewDatabase: () => void;
};

export function SessionSidebar({
  currentView,
  setCurrentView,
  commands,
  dbId,
  apiBase,
  tablesCount,
  encodeReady,
  onNewDatabase,
}: SessionSidebarProps) {
  const [narrow, setNarrow] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const workspaceDetailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const effectiveOpen = narrow || pinnedOpen || hovered;
  const showLabels = effectiveOpen;

  const closeWorkspaceMenu = useCallback(() => {
    if (workspaceDetailsRef.current) {
      workspaceDetailsRef.current.open = false;
    }
  }, []);

  const handleNewDatabase = () => {
    closeWorkspaceMenu();
    onNewDatabase();
  };

  const primaryItems = viewItems.filter((v) => PRIMARY_IDS.includes(v.id));
  const secondaryItems = viewItems.filter((v) => SECONDARY_IDS.includes(v.id));

  const transition: Transition = {
    type: 'tween',
    ease: 'easeOut',
    duration: 0.2,
  };

  return (
    <aside
      className={`${styles.root} ${!narrow && !effectiveOpen ? styles.rootCollapsed : ''}`}
      onMouseEnter={() => {
        if (!narrow) setHovered(true);
      }}
      onMouseLeave={() => {
        if (!narrow) setHovered(false);
      }}
    >
      <motion.div
        className={styles.motionShell}
        initial={false}
        animate={{
          width: narrow ? '100%' : effectiveOpen ? WIDTH_OPEN : WIDTH_COLLAPSED,
        }}
        transition={transition}
      >
        <div className={styles.inner}>
          <div className={styles.workspaceBar}>
            <details ref={workspaceDetailsRef} className={styles.workspaceMenu}>
              <summary className={styles.workspaceSummary}>
                <span className={styles.workspaceAvatar} aria-hidden>
                  v
                </span>
                <motion.div
                  className={styles.workspaceTitleRow}
                  initial={false}
                  animate={{
                    opacity: showLabels ? 1 : 0,
                    x: showLabels ? 0 : -6,
                  }}
                  transition={transition}
                  style={{
                    pointerEvents: showLabels ? 'auto' : 'none',
                    overflow: 'hidden',
                  }}
                >
                  <span className={styles.workspaceTitle}>Workspace</span>
                  <ChevronsUpDown className={styles.chevron} aria-hidden />
                </motion.div>
              </summary>
              <div className={styles.workspacePanel}>
                <button
                  type="button"
                  className={styles.workspacePanelButton}
                  onClick={handleNewDatabase}
                >
                  <Plus className={styles.workspacePanelIcon} aria-hidden />
                  New database
                </button>
              </div>
            </details>
          </div>

          <div className={styles.searchSlot}>
            <SearchModal data={commands}>
              <Button variant="outline" className={styles.searchButton}>
                <span className={styles.searchButtonInner}>
                  <SearchIcon className={styles.searchIcon} />
                  <motion.span
                    className={styles.searchLabel}
                    initial={false}
                    animate={{
                      opacity: showLabels ? 1 : 0,
                      maxWidth: showLabels ? 200 : 0,
                    }}
                    transition={transition}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                  >
                    Search…
                  </motion.span>
                  <motion.span
                    initial={false}
                    animate={{
                      opacity: showLabels ? 1 : 0,
                      width: showLabels ? 'auto' : 0,
                    }}
                    transition={transition}
                    style={{ overflow: 'hidden' }}
                  >
                    <span className={styles.searchShortcut}>Ctrl K</span>
                  </motion.span>
                </span>
              </Button>
            </SearchModal>
          </div>

          <div className={styles.navScroll}>
            <div className={styles.navLabel}>Workspace</div>
            <div className={styles.navStack}>
              {primaryItems.map((item) => (
                <NavItemButton
                  key={item.id}
                  item={item}
                  active={currentView === item.id}
                  showLabels={showLabels}
                  transition={transition}
                  onSelect={() => setCurrentView(item.id)}
                />
              ))}
              <div className={styles.separator} aria-hidden />
              {secondaryItems.map((item) => (
                <NavItemButton
                  key={item.id}
                  item={item}
                  active={currentView === item.id}
                  showLabels={showLabels}
                  transition={transition}
                  onSelect={() => setCurrentView(item.id)}
                />
              ))}
            </div>
          </div>

          <div className={styles.statusPanel}>
            <div className={styles.statusPanelLabel}>Pipeline status</div>
            <StatusTrack label="API" value={apiBase} active colorClass={styles.statusCyan} />
            <StatusTrack
              label="Database"
              value={`${tablesCount} tables`}
              active={Boolean(dbId)}
              colorClass={styles.statusGreen}
            />
            <StatusTrack
              label="Encode"
              value={encodeReady ? 'Ready' : 'Waiting'}
              active={encodeReady}
              colorClass={styles.statusOrange}
            />
          </div>

          <div className={styles.footer}>
            <div className={styles.footerToolbar}>
              {!narrow ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`${styles.pinButton} ${pinnedOpen ? styles.pinButtonActive : ''}`}
                  aria-pressed={pinnedOpen}
                  aria-label={pinnedOpen ? 'Unpin sidebar' : 'Pin sidebar open'}
                  title={pinnedOpen ? 'Unpin sidebar' : 'Pin sidebar open'}
                  onClick={() => setPinnedOpen((p) => !p)}
                >
                  {pinnedOpen ? (
                    <PinOff className={styles.pinIcon} />
                  ) : (
                    <Pin className={styles.pinIcon} />
                  )}
                </Button>
              ) : null}
              <motion.div
                className={styles.footerDbWrap}
                initial={false}
                animate={{
                  opacity: showLabels ? 1 : 0,
                  flex: showLabels ? 1 : 0,
                }}
                transition={transition}
              >
                <div
                  className={`${styles.footerDbInner} ${showLabels ? styles.interactiveOn : styles.interactiveOff}`}
                >
                  <div className={styles.footerDbRow}>
                    <Database className={styles.footerDbIcon} aria-hidden />
                    <span className={styles.footerDbText} title={dbId || undefined}>
                      {truncateDbId(dbId)}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
            <button
              type="button"
              className={`${styles.navItem} ${styles.footerNavItem} ${currentView === 'settings' ? styles.navItemActive : ''}`}
              title="Encoding options"
              onClick={() => setCurrentView('settings')}
            >
              <Settings className={styles.navIcon} aria-hidden />
              <motion.span
                className={`${styles.navItemLabel} ${showLabels ? styles.interactiveOn : styles.interactiveOff}`}
                initial={false}
                animate={{
                  opacity: showLabels ? 1 : 0,
                  x: showLabels ? 0 : -6,
                }}
                transition={transition}
              >
                Settings
              </motion.span>
            </button>
            <div className={`${styles.navItem} ${styles.accountRow}`} title="Local workspace">
              <UserRound className={styles.navIcon} aria-hidden />
              <motion.span
                className={`${styles.navItemLabel} ${showLabels ? styles.interactiveOn : styles.interactiveOff}`}
                initial={false}
                animate={{
                  opacity: showLabels ? 1 : 0,
                  x: showLabels ? 0 : -6,
                }}
                transition={transition}
              >
                Account
              </motion.span>
            </div>
          </div>
        </div>
      </motion.div>
    </aside>
  );
}

function NavItemButton({
  item,
  active,
  showLabels,
  transition,
  onSelect,
}: {
  item: (typeof viewItems)[number];
  active: boolean;
  showLabels: boolean;
  transition: Transition;
  onSelect: () => void;
}) {
  const Icon = VIEW_ICONS[item.id];
  return (
    <button
      type="button"
      title={item.description}
      onClick={onSelect}
      className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
    >
      <Icon className={styles.navIcon} aria-hidden />
      <motion.span
        className={`${styles.navItemLabel} ${showLabels ? styles.interactiveOn : styles.interactiveOff}`}
        initial={false}
        animate={{
          opacity: showLabels ? 1 : 0,
          x: showLabels ? 0 : -6,
        }}
        transition={transition}
      >
        {item.label}
      </motion.span>
      <span className={styles.navItemTrail}>
        {item.id === 'search' && showLabels ? <span className={styles.badge}>Beta</span> : null}
        {item.id === 'visualizer' && showLabels ? (
          <span className={styles.liveBadge}>Live</span>
        ) : null}
      </span>
    </button>
  );
}

function StatusTrack({
  label,
  value,
  active,
  colorClass,
}: {
  label: string;
  value: string;
  active: boolean;
  colorClass: string;
}) {
  return (
    <div className={styles.statusTrack}>
      <div className={styles.statusTrackHeader}>
        <span>{label}</span>
        <span className={active ? styles.statusTrackValueActive : styles.statusTrackValue}>
          {value}
        </span>
      </div>
      <div className={styles.statusTrackBar}>
        <div
          className={`${styles.statusTrackProgress} ${active ? `${styles.statusTrackProgressActive} ${colorClass}` : styles.statusTrackProgressInactive}`}
        />
      </div>
    </div>
  );
}
