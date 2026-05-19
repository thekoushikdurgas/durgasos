'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { Database, RefreshCw, Search, Trash2, Upload } from 'lucide-react';

import { JsonBlock } from '@/components/apps/ModuleAppShell';
import { Input } from '@/components/ui/input';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RAG_DELETE,
  RAG_DOCUMENTS,
  RAG_INGEST,
  RAG_LIST,
  RAG_QUERY,
  RAG_STATS,
  RAG_UPLOAD,
} from '@/lib/graphql-modules';
import { cn } from '@/lib/utils';

function asRecord(x: unknown): Record<string, unknown> | null {
  return x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
}

export function VectorDbApp() {
  const [collectionInput, setCollectionInput] = useState('');
  const collectionName = collectionInput.trim() || undefined;

  const listQ = useQuery(RAG_LIST, {
    variables: { collectionName, limit: 50, offset: 0 },
  });
  const statsQ = useQuery(RAG_STATS, {
    variables: { collectionName },
  });
  const docsQ = useQuery(RAG_DOCUMENTS, {
    variables: { collectionName, limit: 50, offset: 0 },
  });

  const [queryText, setQueryText] = useState('');
  const [k, setK] = useState(5);
  const [queryResult, setQueryResult] = useState<unknown>(null);
  const [queryErr, setQueryErr] = useState<Error | null>(null);
  const [execRagQuery, { loading: queryLoading }] = useLazyQuery(RAG_QUERY, {
    fetchPolicy: 'network-only',
  });

  const [ingestText, setIngestText] = useState('');
  const [ingestId, setIngestId] = useState('');
  const [ingestResult, setIngestResult] = useState<unknown>(null);
  const [ingestMut, { loading: ingestLoading }] = useMutation(RAG_INGEST);

  const [uploadJson, setUploadJson] = useState('{\n  "file_path": "",\n  "collection_name": ""\n}');
  const [uploadMut, { loading: uploadLoading }] = useMutation(RAG_UPLOAD);

  const [vectorTab, setVectorTab] = useState('documents');
  const [deleteId, setDeleteId] = useState('');
  const [deleteMut, { loading: deleteLoading }] = useMutation(RAG_DELETE);

  const listPayload = asRecord(listQ.data?.ragList);
  const defaultCollection = useMemo(() => {
    const c = listPayload?.collection;
    return typeof c === 'string' ? c : '';
  }, [listPayload]);

  const documents = useMemo(() => {
    const raw = listPayload?.documents;
    return Array.isArray(raw) ? raw : [];
  }, [listPayload]);

  const statsPayload = asRecord(statsQ.data?.ragStats);

  const docsPayload = asRecord(docsQ.data?.ragDocuments);

  const runVectorQuery = useCallback(async () => {
    setQueryErr(null);
    setQueryResult(null);
    try {
      const { data, error } = await execRagQuery({
        variables: {
          query: queryText.trim(),
          k,
          collectionName,
        },
      });
      if (error) setQueryErr(error);
      else setQueryResult(data?.ragQuery);
    } catch (e) {
      setQueryErr(e instanceof Error ? e : new Error(String(e)));
    }
  }, [execRagQuery, queryText, k, collectionName]);

  const doIngest = useCallback(async () => {
    setIngestResult(null);
    const params: Record<string, unknown> = {
      text: ingestText,
    };
    if (ingestId.trim()) params.document_id = ingestId.trim();
    if (collectionName) params.collection_name = collectionName;
    try {
      const { data } = await ingestMut({ variables: { params } });
      setIngestResult(data?.ragIngest);
      void listQ.refetch();
      void docsQ.refetch();
      void statsQ.refetch();
    } catch (e) {
      setIngestResult({ error: e instanceof Error ? e.message : String(e) });
    }
  }, [ingestMut, ingestText, ingestId, collectionName, listQ, docsQ, statsQ]);

  const doUpload = useCallback(async () => {
    setIngestResult(null);
    try {
      const params = JSON.parse(uploadJson) as Record<string, unknown>;
      const { data } = await uploadMut({ variables: { params } });
      setIngestResult(data?.ragUpload);
      void listQ.refetch();
      void docsQ.refetch();
      void statsQ.refetch();
    } catch (e) {
      setIngestResult({ error: e instanceof Error ? e.message : String(e) });
    }
  }, [uploadJson, uploadMut, listQ, docsQ, statsQ]);

  const doDelete = useCallback(async () => {
    if (!deleteId.trim()) return;
    setIngestResult(null);
    try {
      const { data } = await deleteMut({ variables: { documentId: deleteId.trim() } });
      setIngestResult(data?.ragDelete);
      void listQ.refetch();
      void docsQ.refetch();
      void statsQ.refetch();
    } catch (e) {
      setIngestResult({ error: e instanceof Error ? e.message : String(e) });
    }
  }, [deleteId, deleteMut, listQ, docsQ, statsQ]);

  const refetchAll = () => {
    void listQ.refetch();
    void docsQ.refetch();
    void statsQ.refetch();
  };

  return (
    <div className="absolute inset-0 flex bg-slate-950/95 text-slate-100">
      <LiquidGlassSurface
        variant="frost"
        className="flex w-56 shrink-0 flex-col gap-4 border-r border-white/10 p-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/45">
          <Database className="h-4 w-4 text-cyan-400" aria-hidden />
          Collection
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-white/40">Override (optional)</label>
          <Input
            value={collectionInput}
            onChange={(e) => setCollectionInput(e.target.value)}
            placeholder={defaultCollection || 'default from backend'}
            className="border-white/10 bg-black/30 text-sm text-white"
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
          <p className="mb-2 text-[10px] font-bold uppercase text-white/40">Index stats</p>
          {statsQ.loading ? (
            <p className="text-white/45">Loading…</p>
          ) : statsQ.error ? (
            <p className="text-red-300/90">{statsQ.error.message}</p>
          ) : (
            <ul className="space-y-1.5 text-white/70">
              <li className="flex justify-between gap-2">
                <span>Chunks</span>
                <span className="font-mono text-cyan-200">
                  {String(statsPayload?.total_chunks ?? '—')}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Collection</span>
                <span className="truncate font-mono text-[10px] text-white/50">
                  {String(statsPayload?.collection ?? collectionName ?? defaultCollection ?? '—')}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Embedding</span>
                <span className="truncate text-[10px] text-white/50">
                  {String(statsPayload?.embedding_model ?? '—')}
                </span>
              </li>
            </ul>
          )}
        </div>
        <div className="mt-auto space-y-2 text-[10px] text-white/40">
          <p>List count: {String(listPayload?.count ?? '—')}</p>
          <p>Sample entries: {documents.length}</p>
          <button
            type="button"
            onClick={() => void refetchAll()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 py-2 text-xs text-white/85 hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh all
          </button>
        </div>
      </LiquidGlassSurface>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4">
        <header className="mb-3 shrink-0 border-b border-white/10 pb-3">
          <h2 className="text-sm font-semibold tracking-tight text-white/90">Vector DB</h2>
          <p className="mt-0.5 text-xs text-white/45">
            Chroma via GraphQL — ragList, ragDocuments, ragQuery, ragStats
          </p>
        </header>
        <Tabs
          value={vectorTab}
          onValueChange={setVectorTab}
          variant="pill"
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mb-3 w-full max-w-md shrink-0 flex-wrap gap-1">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
            <TabsTrigger value="ingest">Ingest / upload</TabsTrigger>
            <TabsTrigger value="delete">Delete</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="min-h-0 flex-1 overflow-auto">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                onClick={() => void docsQ.refetch()}
              >
                Refresh ragDocuments
              </button>
            </div>
            <JsonBlock
              data={docsPayload ?? docsQ.data?.ragDocuments}
              error={docsQ.error ?? undefined}
            />
          </TabsContent>

          <TabsContent value="query" className="min-h-0 flex-1 space-y-3 overflow-auto">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-xs text-white/50">Query</label>
                <Input
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Search the vector index…"
                  className="border-white/10 bg-black/30 text-white"
                />
              </div>
              <div className="w-20">
                <label className="mb-1 block text-xs text-white/50">k</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={k}
                  onChange={(e) => setK(Number(e.target.value) || 5)}
                  className="border-white/10 bg-black/30 text-white"
                />
              </div>
              <button
                type="button"
                disabled={queryLoading || !queryText.trim()}
                onClick={() => void runVectorQuery()}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
                  'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md',
                  'disabled:opacity-40'
                )}
              >
                <Search className="h-4 w-4" aria-hidden />
                Run ragQuery
              </button>
            </div>
            <JsonBlock data={queryResult} error={queryErr} />
          </TabsContent>

          <TabsContent value="ingest" className="min-h-0 flex-1 space-y-4 overflow-auto">
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="mb-2 text-sm font-semibold text-white/90">ragIngest (text)</h3>
              <textarea
                value={ingestText}
                onChange={(e) => setIngestText(e.target.value)}
                rows={5}
                aria-label="Text to ingest"
                className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-emerald-100/90"
                placeholder="Paste document text…"
              />
              <Input
                value={ingestId}
                onChange={(e) => setIngestId(e.target.value)}
                placeholder="Optional document_id"
                className="mb-2 border-white/10 bg-black/30 text-sm text-white"
              />
              <button
                type="button"
                disabled={ingestLoading || !ingestText.trim()}
                onClick={() => void doIngest()}
                className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-sm text-white hover:bg-emerald-600 disabled:opacity-40"
              >
                Ingest
              </button>
            </section>
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/90">
                <Upload className="h-4 w-4 text-cyan-300" aria-hidden />
                ragUpload (JSON params)
              </h3>
              <textarea
                value={uploadJson}
                onChange={(e) => setUploadJson(e.target.value)}
                rows={6}
                aria-label="ragUpload JSON params"
                className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-slate-200"
              />
              <button
                type="button"
                disabled={uploadLoading}
                onClick={() => void doUpload()}
                className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-sm text-cyan-100 hover:bg-cyan-900/50 disabled:opacity-40"
              >
                Upload
              </button>
            </section>
            {ingestResult != null ? (
              <pre className="max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-amber-100/90">
                {JSON.stringify(ingestResult, null, 2)}
              </pre>
            ) : null}
          </TabsContent>

          <TabsContent value="delete" className="min-h-0 flex-1 space-y-3 overflow-auto">
            <p className="text-xs text-white/50">
              Calls <code className="rounded bg-black/40 px-1">ragDelete</code> with document id.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                value={deleteId}
                onChange={(e) => setDeleteId(e.target.value)}
                placeholder="document_id"
                className="max-w-md border-white/10 bg-black/30 text-white"
              />
              <button
                type="button"
                disabled={deleteLoading || !deleteId.trim()}
                onClick={() => void doDelete()}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100 hover:bg-red-900/50 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </button>
            </div>
            {ingestResult != null ? (
              <pre className="max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-amber-100/90">
                {JSON.stringify(ingestResult, null, 2)}
              </pre>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
