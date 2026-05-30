'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { AlertCircle, CornerDownLeft, Pin, PinOff, Plus, Terminal, Trash2 } from 'lucide-react';
import rail from './AppRail.module.css';
import { SqlCodeEditor } from './SqlCodeEditor';
import styles from './SqlConsolePage.module.css';
import type { ConsoleEntry, SqlConsoleProps, SqlConsoleSession } from './types';
import { railTransition, useAppRailLayout } from './useAppRailLayout';

const SQL_RAIL_OPEN = '20rem';

function historyMarkerTitle(entry: ConsoleEntry): string {
  if (entry.type === 'input') return entry.content.slice(0, 200);
  if (entry.type === 'error') return `Error: ${entry.content}`;
  if (entry.type === 'info') return entry.content;
  const rows = entry.results?.length ?? 0;
  const tail = entry.content || (rows > 0 ? `${rows} result set(s)` : 'OK');
  return tail.slice(0, 200);
}

function HistoryRailMarker({ entry }: { entry: ConsoleEntry }) {
  const glyph =
    entry.type === 'input'
      ? '>'
      : entry.type === 'success'
        ? '✓'
        : entry.type === 'error'
          ? '!'
          : 'i';
  return (
    <div
      className={`${styles.historyMarker} ${styles[`historyMarker_${entry.type}`]}`}
      title={historyMarkerTitle(entry)}
    >
      <span className={styles.historyMarkerGlyph} aria-hidden>
        {glyph}
      </span>
    </div>
  );
}

export function SqlConsolePage({
  sqlQuery,
  setSqlQuery,
  consoleHistory,
  consoleEndRef,
  executeSql,
  busy,
  error,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SqlConsoleProps) {
  const railLayout = useAppRailLayout(SQL_RAIL_OPEN);
  const {
    layoutStacked,
    pinnedOpen,
    setPinnedOpen,
    showLabels,
    railWidth,
    railAsideHandlers,
    railDataProps,
  } = railLayout;

  const renderFullHistoryEntry = (entry: ConsoleEntry) => (
    <>
      {entry.type === 'input' && (
        <div className={styles.consoleInput}>
          <span className={styles.consoleContent}>{entry.content}</span>
        </div>
      )}
      {entry.type === 'info' && <div className={styles.consoleInfo}>{entry.content}</div>}
      {entry.type === 'error' && <div className={styles.consoleError}>Error: {entry.content}</div>}
      {entry.type === 'success' && (
        <div className={styles.consoleSuccess}>
          {entry.content && <div className={styles.consoleSuccessMessage}>{entry.content}</div>}
          {entry.results?.map((res, i) => (
            <ResultTable key={i} columns={res.columns} values={res.values} />
          ))}
        </div>
      )}
    </>
  );

  const sessionLabel = (s: SqlConsoleSession) => {
    const lines = s.history.length;
    return `${s.name} · ${lines} line${lines === 1 ? '' : 's'}`;
  };

  return (
    <>
      <aside
        className={`${rail.aside} ${styles.sqlAside}`}
        aria-label="SQL console sessions"
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
              <div className={styles.sqlRailBrand}>
                <Terminal className={styles.sqlRailIcon} aria-hidden />
                <motion.div
                  className={styles.sqlRailTitleWrap}
                  initial={false}
                  animate={{
                    opacity: showLabels ? 1 : 0,
                    x: showLabels ? 0 : -8,
                    maxWidth: showLabels ? 200 : 0,
                  }}
                  transition={railTransition}
                  style={{
                    overflow: 'hidden',
                    pointerEvents: showLabels ? 'auto' : 'none',
                    display: showLabels ? 'block' : 'none',
                  }}
                >
                  <span className={styles.sqlRailTitle}>Sessions</span>
                  <span className={styles.sqlRailCount}>{sessions.length} open</span>
                </motion.div>
              </div>
            </header>

            <div className={`${rail.body} ${styles.sqlRailBody}`}>
              <nav className={styles.sessionNav} aria-label="SQL console sessions">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`${styles.sessionRowWrap} ${activeSessionId === session.id ? styles.sessionRowWrapActive : ''}`}
                  >
                    <button
                      type="button"
                      className={styles.sessionRow}
                      onClick={() => onSelectSession(session.id)}
                      title={sessionLabel(session)}
                    >
                      <span className={styles.sessionGlyph} aria-hidden>
                        ▸
                      </span>
                      <motion.span
                        className={`${styles.sessionName} ${showLabels ? rail.interactiveOn : rail.interactiveOff}`}
                        initial={false}
                        animate={{
                          opacity: showLabels ? 1 : 0,
                          x: showLabels ? 0 : -6,
                          maxWidth: showLabels ? 200 : 0,
                        }}
                        transition={railTransition}
                        style={{ overflow: 'hidden' }}
                      >
                        {session.name}
                      </motion.span>
                    </button>
                    {showLabels && sessions.length > 1 ? (
                      <button
                        type="button"
                        className={styles.sessionDelete}
                        aria-label={`Delete ${session.name}`}
                        title="Remove session"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                      >
                        <Trash2 className={styles.sessionDeleteIcon} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </nav>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={styles.newSessionButton}
                onClick={onNewSession}
              >
                <Plus className={styles.newSessionIcon} aria-hidden />
                <motion.span
                  initial={false}
                  animate={{
                    opacity: showLabels ? 1 : 0,
                    maxWidth: showLabels ? 120 : 0,
                  }}
                  transition={railTransition}
                  style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                >
                  New session
                </motion.span>
              </Button>
            </div>

            {!layoutStacked ? (
              <div className={rail.footer}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`${rail.pinButton} ${pinnedOpen ? rail.pinButtonActive : ''}`}
                  aria-pressed={pinnedOpen}
                  aria-label={pinnedOpen ? 'Unpin sessions rail' : 'Pin sessions rail open'}
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

      <section className={styles.sqlWorkspace}>
        <div className={styles.queryContainer}>
          <div className={styles.consolePanel}>
            <div className={styles.historyScroll}>
              {consoleHistory.map((entry) => (
                <div key={entry.id} className={styles.consoleEntry}>
                  {renderFullHistoryEntry(entry)}
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>

          <div className={styles.terminalPanel}>
            <div className={styles.composerCard}>
              <div className={styles.composerToolbar}>
                <span className={styles.composerToolbarLabel}>Query buffer</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={styles.composerIconButton}
                  disabled={busy || sqlQuery.length === 0}
                  aria-label="Clear query"
                  title="Clear query"
                  onClick={() => setSqlQuery('')}
                >
                  <Trash2 className={styles.composerIconGlyph} aria-hidden />
                </Button>
              </div>
              <div className={styles.composerEditorWrap}>
                <div className={styles.inputPrompt}>vsql&gt;</div>
                <div className={styles.codeMirrorShell}>
                  <SqlCodeEditor
                    value={sqlQuery}
                    onChange={setSqlQuery}
                    onRun={() => void executeSql()}
                    disabled={busy}
                    minHeight="132px"
                    ariaDescribedBy="sql-console-keyboard-hint"
                  />
                </div>
              </div>
              <div className={styles.composerFooter}>
                <p id="sql-console-keyboard-hint" className={styles.inputHint}>
                  Enter runs the query · Shift+Enter inserts a newline
                </p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void executeSql()}
                    disabled={busy || sqlQuery.trim().length === 0}
                    className={styles.runButton}
                  >
                    Run
                    <CornerDownLeft className={styles.runButtonIcon} aria-hidden />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle className={styles.errorIcon} />
              <span className={styles.errorText}>{error}</span>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ResultTable({ columns, values }: { columns: string[] | null; values: unknown[][] }) {
  if (!columns || columns.length === 0) {
    return <div className={styles.emptySuccess}>Executed successfully.</div>;
  }

  return (
    <div className={styles.resultContainer}>
      <table className={styles.resultTable}>
        <thead className={styles.resultHeader}>
          <tr>
            {columns.map((column) => (
              <th key={column} className={styles.resultHeaderCell}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.resultBody}>
          {values.length > 0 ? (
            values.map((row, rowIdx) => (
              <tr key={rowIdx} className={styles.resultRow}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className={styles.resultCell}>
                    {cell === null ? (
                      <span className={styles.resultCellNull}>null</span>
                    ) : (
                      String(cell)
                    )}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className={styles.emptySet}>
                Empty set.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
