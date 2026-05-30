'use client';

import { useEffect } from 'react';
import { TableExplorer } from './TableExplorer';
import type { TableExplorerPageProps } from './types';

export function TableExplorerPage({
  dbId,
  busy,
  tableState,
  tableActions,
}: TableExplorerPageProps) {
  useEffect(() => {
    void tableActions.refreshTables();
    // Run once when this view mounts (sidebar navigation), not on every actions identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <TableExplorer state={tableState} actions={tableActions} dbId={dbId} busy={busy} />;
}
