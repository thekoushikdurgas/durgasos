'use client';

import { Button } from '@/components/ui/button';
import type { SearchKvEnabledRow, SearchUrlVariableRow } from '@/lib/searchApiBuilder';
import { emptyEnabledRow, emptyVariableRow, newRowId } from '@/lib/searchApiBuilder';
import { Trash2 } from 'lucide-react';
import styles from './SearchApiBuilderTables.module.css';

type KvEnabledTableProps = {
  rows: SearchKvEnabledRow[];
  onChange: (rows: SearchKvEnabledRow[]) => void;
  addLabel?: string;
};

export function KvEnabledTable({ rows, onChange, addLabel = 'Add row' }: KvEnabledTableProps) {
  const list = rows.length ? rows : [emptyEnabledRow()];

  const sync = (next: SearchKvEnabledRow[]) => {
    onChange(next.length ? next : [emptyEnabledRow()]);
  };

  const update = (id: string, patch: Partial<SearchKvEnabledRow>) => {
    sync(list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = (id: string) => {
    sync(list.filter((r) => r.id !== id));
  };

  const add = () => {
    sync([...list, emptyEnabledRow()]);
  };

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.checkboxCell} title="Send with request">
              On
            </th>
            <th>Key</th>
            <th>Value</th>
            <th className={styles.rowActions} aria-hidden>
              —
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <tr key={row.id}>
              <td className={styles.checkboxCell}>
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => update(row.id, { enabled: e.target.checked })}
                  aria-label={`Enable ${row.key || 'row'}`}
                />
              </td>
              <td>
                <input
                  className={styles.cellInput}
                  value={row.key}
                  onChange={(e) => update(row.id, { key: e.target.value })}
                  placeholder="name"
                  spellCheck={false}
                />
              </td>
              <td>
                <input
                  className={styles.cellInput}
                  value={row.value}
                  onChange={(e) => update(row.id, { value: e.target.value })}
                  placeholder="value"
                  spellCheck={false}
                />
              </td>
              <td className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => remove(row.id)}
                  aria-label="Remove row"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.toolbar}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={styles.addRowBtn}
          onClick={add}
        >
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

type VariablesTableProps = {
  rows: SearchUrlVariableRow[];
  onChange: (rows: SearchUrlVariableRow[]) => void;
};

export function VariablesTable({ rows, onChange }: VariablesTableProps) {
  const list = rows.length ? rows : [emptyVariableRow()];

  const sync = (next: SearchUrlVariableRow[]) => {
    onChange(next.length ? next : [emptyVariableRow()]);
  };

  const update = (id: string, patch: Partial<SearchUrlVariableRow>) => {
    sync(list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = (id: string) => {
    sync(list.filter((r) => r.id !== id));
  };

  const add = () => {
    sync([...list, { ...emptyVariableRow(), id: newRowId() }]);
  };

  return (
    <div>
      <p className={styles.caption}>
        Use <code>{'{{name}}'}</code> in URL path; values replace before query params merge.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
              <th className={styles.rowActions} aria-hidden>
                —
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>
                  <input
                    className={styles.cellInput}
                    value={row.name}
                    onChange={(e) => update(row.id, { name: e.target.value })}
                    placeholder="indexName"
                    spellCheck={false}
                  />
                </td>
                <td>
                  <input
                    className={styles.cellInput}
                    value={row.value}
                    onChange={(e) => update(row.id, { value: e.target.value })}
                    placeholder="my-index"
                    spellCheck={false}
                  />
                </td>
                <td className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => remove(row.id)}
                    aria-label="Remove variable"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.toolbar}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={styles.addRowBtn}
            onClick={add}
          >
            Add variable
          </Button>
        </div>
      </div>
    </div>
  );
}
