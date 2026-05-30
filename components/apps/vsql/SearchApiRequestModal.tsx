'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/apps/vsql/ui/dialog';
import {
  defaultSavedApi,
  type SearchHttpMethod,
  type SearchSavedApiDefinition,
} from '@/lib/searchApiBuilder';
import { useEffect, useState } from 'react';
import { KvEnabledTable, VariablesTable } from './SearchApiBuilderTables';
import styles from './SearchApiRequestModal.module.css';

type TabId = 'general' | 'url' | 'headers' | 'body';

type SearchApiRequestModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current request definition (seed when opening). */
  value: SearchSavedApiDefinition;
  /** Persist edited definition to the page (and close). */
  onApply: (next: SearchSavedApiDefinition) => void;
  /** Add or replace in saved library by `name`. */
  onSaveToLibrary: (next: SearchSavedApiDefinition) => void;
};

function cloneDef(v: SearchSavedApiDefinition): SearchSavedApiDefinition {
  return structuredClone(v);
}

export function SearchApiRequestModal({
  open,
  onOpenChange,
  value,
  onApply,
  onSaveToLibrary,
}: SearchApiRequestModalProps) {
  const [tab, setTab] = useState<TabId>('general');
  const [draft, setDraft] = useState<SearchSavedApiDefinition>(() => defaultSavedApi());

  useEffect(() => {
    if (open) {
      setDraft(cloneDef(value));
      setTab('general');
    }
  }, [open, value]);

  const setUrl = (patch: Partial<SearchSavedApiDefinition['url']>) => {
    setDraft((d) => ({
      ...d,
      url: { ...d.url, ...patch },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader className={styles.dialogHeader}>
          <DialogTitle className={styles.dialogTitle}>Configure API request</DialogTitle>
          <DialogDescription className={styles.dialogDescription}>
            Postman-style fields: name, method, headers, body, and URL (raw path, query params, and{' '}
            <code>{'{{variables}}'}</code>). Params from the table override duplicate keys from the
            path&apos;s query string.
          </DialogDescription>
        </DialogHeader>

        <div className={styles.tabBar} role="group" aria-label="Request sections">
          {(
            [
              ['general', 'General'],
              ['url', 'URL'],
              ['headers', 'Headers'],
              ['body', 'Body'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.panel}>
          {tab === 'general' && (
            <>
              <div className={styles.fieldBlock}>
                <label className={styles.fieldLabel} htmlFor="search-api-name">
                  Request name
                </label>
                <input
                  id="search-api-name"
                  className={styles.textInput}
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="My cluster health check"
                />
              </div>
              <div className={styles.fieldBlock}>
                <label className={styles.fieldLabel} htmlFor="search-api-method">
                  Method
                </label>
                <select
                  id="search-api-method"
                  className={styles.methodSelect}
                  value={draft.method}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      method: e.target.value as SearchHttpMethod,
                    }))
                  }
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
              </div>
            </>
          )}

          {tab === 'url' && (
            <>
              <div className={styles.fieldBlock}>
                <label className={styles.fieldLabel} htmlFor="search-api-url-raw">
                  request.url.raw
                </label>
                <input
                  id="search-api-url-raw"
                  className={styles.textInput}
                  value={draft.url.raw}
                  onChange={(e) => setUrl({ raw: e.target.value })}
                  placeholder="/{{indexName}}/_search"
                  spellCheck={false}
                />
                <p className={styles.urlHint}>
                  Path under <code>/api/search</code> (may include <code>?</code> query; param table
                  overrides duplicate keys).
                </p>
              </div>
              <div className={styles.fieldBlock}>
                <span className={styles.fieldLabel}>request.url.variables</span>
                <VariablesTable
                  rows={draft.url.variables}
                  onChange={(variables) => setUrl({ variables })}
                />
              </div>
              <div className={styles.fieldBlock}>
                <span className={styles.fieldLabel}>request.url.params</span>
                <KvEnabledTable
                  rows={draft.url.params}
                  onChange={(params) => setUrl({ params })}
                  addLabel="Add query param"
                />
              </div>
            </>
          )}

          {tab === 'headers' && (
            <div className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>request.headers</span>
              <KvEnabledTable
                rows={draft.headers}
                onChange={(headers) => setDraft((d) => ({ ...d, headers }))}
                addLabel="Add header"
              />
            </div>
          )}

          {tab === 'body' && (
            <div className={styles.fieldBlock}>
              <label className={styles.fieldLabel} htmlFor="search-api-body">
                request.body
              </label>
              <textarea
                id="search-api-body"
                className={styles.bodyArea}
                rows={10}
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                placeholder='{"query":{...}}'
                spellCheck={false}
              />
            </div>
          )}
        </div>

        <DialogFooter className={styles.dialogFooter}>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={() => onSaveToLibrary(draft)}>
            Save to library
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
