'use client';

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Braces,
  FileCode,
  LayoutPanelLeft,
  MessageSquare,
  Save,
  Search,
  Square,
  StopCircle,
} from 'lucide-react';

import { useMutation, useApolloClient } from '@apollo/client/react';
import { useWindowLaunch } from '@/components/window-launch-context';
import { useAiChatGateway } from '@/hooks/use-ai-chat-gateway';
import { isGatewayBenignError } from '@/lib/gateway-errors';
import { swallowClientError } from '@/lib/safe-client-storage';
import {
  VOID_IDE_SAMPLE_FILES,
  buildIdeAiContext,
  listProjectTextFiles,
  pathToMonacoLanguage,
  pickWorkspaceFolder,
  readTextFileFromRoot,
  writeTextFileToRoot,
  SKIP_DIRS,
  isProbablyTextFile,
  type IdeWorkspaceMode,
} from '@/lib/ide-workspace';
import { extensionFromFileName, appSupportsExtension } from '@/lib/app-file-associations';
import { STORAGE_GET_URL, STORAGE_LIST } from '@/lib/graphql-modules';
import { coerceStorageListPayload, type StorageListFileRow } from '@/lib/file-explorer-storage';
import { fetchStorageText } from '@/lib/storage-signed-url';
import { cn } from '@/lib/utils';
import { parseFastApplyBlocks, parseCodeFences, applySearchReplaceBlocks } from '@/lib/ide-apply';

const MONACO_CDN_VS = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';

const MonacoEditor = lazy(async () => {
  const mod = await import('@monaco-editor/react');
  mod.loader.config({ paths: { vs: MONACO_CDN_VS } });
  return { default: mod.default };
});

type Activity = 'explorer' | 'search' | 'ai';

type ChatTurn = { role: 'user' | 'assistant'; content: string };

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/** Recursive listing of text-like files under a cloud prefix (paths relative to `rootFolderPath`). */
async function listCloudTextRelPaths(
  client: ReturnType<typeof useApolloClient>,
  bucket_type: string,
  rootFolderPath: string
): Promise<string[]> {
  const out: string[] = [];
  const root = rootFolderPath;
  const maxFiles = 450;

  async function walk(currentFolder: string, depth: number): Promise<void> {
    if (out.length >= maxFiles || depth > 10) return;

    const { data } = await client.query({
      query: STORAGE_LIST,
      variables: { params: { bucket_type, folder_path: currentFolder, limit: 500, offset: 0 } },
      fetchPolicy: 'network-only',
    });
    const payload = coerceStorageListPayload(data?.storageList);
    if (!payload || payload.success === false || !Array.isArray(payload.files)) return;

    for (const row of payload.files as StorageListFileRow[]) {
      if (out.length >= maxFiles) break;
      if (row.is_directory) {
        if (SKIP_DIRS.has(row.name)) continue;
        await walk(row.path, depth + 1);
      } else if (isProbablyTextFile(row.name)) {
        const rel = row.path.startsWith(`${root}/`) ? row.path.slice(root.length + 1) : row.name;
        if (!out.includes(rel)) out.push(rel);
      }
    }
  }

  await walk(rootFolderPath, 0);
  return out.sort((a, b) => a.localeCompare(b));
}

function initialVirtualMap(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [p, v] of Object.entries(VOID_IDE_SAMPLE_FILES)) {
    o[p] = v.content;
  }
  return o;
}

function useVirtualFiles() {
  const [map, setMap] = useState<Record<string, string>>(initialVirtualMap);
  const setContent = useCallback((path: string, content: string) => {
    setMap((prev) => ({ ...prev, [path]: content }));
  }, []);
  const resetToSamples = useCallback(() => {
    setMap(initialVirtualMap());
  }, []);
  const replaceAll = useCallback((next: Record<string, string>) => {
    setMap(next);
  }, []);
  return { map, setContent, resetToSamples, replaceAll };
}

export function VoidIdeApp() {
  const frame = useWindowLaunch();
  const windowId = frame?.windowId ?? 'void-ide-fallback';
  const conversationId = useMemo(() => `void-ide-${windowId}`, [windowId]);

  const { sendCompletion, abortActiveRequests, callRpc, sendStreamingMethod } = useAiChatGateway();
  const [getUrl] = useMutation(STORAGE_GET_URL);
  const apolloClient = useApolloClient();
  const launchFromFilesRef = useRef(false);

  const [mode, setMode] = useState<IdeWorkspaceMode>('virtual');
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [paths, setPaths] = useState<string[]>(() => Object.keys(VOID_IDE_SAMPLE_FILES).sort());
  const {
    map: virtualMap,
    setContent: setVirtualContent,
    resetToSamples,
    replaceAll,
  } = useVirtualFiles();
  const [dirty, setDirty] = useState<Set<string>>(() => new Set());
  const [activePath, setActivePath] = useState<string>('README.md');
  const [tabs, setTabs] = useState<string[]>(['README.md']);
  const [buffer, setBuffer] = useState<string>(VOID_IDE_SAMPLE_FILES['README.md']!.content);
  const [activity, setActivity] = useState<Activity>('explorer');
  const [treeQuery, setTreeQuery] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [think, setThink] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [chatLog, setChatLog] = useState<ChatTurn[]>([]);
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);

  // Providers & models selection
  const [providers, setProviders] = useState<{ name: string; status: string; models: string[] }[]>(
    []
  );
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Undo & Inline Edit (Ctrl+K)
  const [undoBackup, setUndoBackup] = useState<{ path: string; content: string } | null>(null);
  const [inlineEditActive, setInlineEditActive] = useState(false);
  const [inlineInstruction, setInlineInstruction] = useState('');
  const [inlineEditStatus, setInlineEditStatus] = useState<
    'idle' | 'generating' | 'done' | 'error'
  >('idle');
  const [inlineEditError, setInlineEditError] = useState('');
  const [ctrlkStreamText, setCtrlkStreamText] = useState('');
  const ctrlkCancelRef = useRef<(() => void) | null>(null);
  const ctrlkBackupContent = useRef<string>('');
  const ctrlkSelection = useRef<any>(null);
  const [ctrlkSelectionState, setCtrlkSelectionState] = useState<{
    startLineNumber: number;
    endLineNumber: number;
    isEmpty: boolean;
  } | null>(null);

  const markDirty = useCallback((path: string) => {
    setDirty((d) => new Set(d).add(path));
  }, []);

  const language = useMemo(() => pathToMonacoLanguage(activePath), [activePath]);

  // Load providers from the backend (retry while WebSocket connects)
  useEffect(() => {
    let active = true;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchProviders = async () => {
      try {
        const res = (await callRpc('chat.providers', {})) as {
          providers?: { name: string; status: string; models: string[] }[];
        };
        if (!active) return;
        if (res?.providers && Array.isArray(res.providers)) {
          setProviders(res.providers);
          const defaultProv = res.providers.find((p) => p.status === 'available');
          if (defaultProv) {
            setSelectedProvider(defaultProv.name);
            if (defaultProv.models && defaultProv.models.length > 0) {
              setSelectedModel(defaultProv.models[0]);
            }
          }
        }
      } catch (err) {
        if (!active || isGatewayBenignError(err)) return;
        if (attempt < 4) {
          attempt += 1;
          retryTimer = setTimeout(fetchProviders, 400 * attempt);
          return;
        }
        console.error('Failed to load providers:', err);
      }
    };

    retryTimer = setTimeout(fetchProviders, 150);
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [callRpc]);

  // When selected provider changes, fetch/load its models
  useEffect(() => {
    if (!selectedProvider) return;
    let active = true;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchModels = async () => {
      try {
        const res = (await callRpc('chat.providers.models', {
          provider_name: selectedProvider,
        })) as { models?: string[]; default_model?: string };
        if (!active) return;
        if (res?.models && Array.isArray(res.models)) {
          setProviders((prev) =>
            prev.map((p) => (p.name === selectedProvider ? { ...p, models: res.models ?? [] } : p))
          );
          if (res.default_model && res.models.includes(res.default_model)) {
            setSelectedModel(res.default_model);
          } else if (res.models.length > 0) {
            setSelectedModel(res.models[0]);
          }
        }
      } catch (err) {
        if (!active || isGatewayBenignError(err)) return;
        if (attempt < 4) {
          attempt += 1;
          retryTimer = setTimeout(fetchModels, 400 * attempt);
          return;
        }
        console.error(`Failed to load models for ${selectedProvider}:`, err);
      }
    };

    retryTimer = setTimeout(fetchModels, 150);
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [selectedProvider, callRpc]);

  const applyResponseBlocks = (content: string) => {
    const blocks = parseFastApplyBlocks(content);
    if (blocks.length > 0) {
      setUndoBackup({ path: activePath, content: buffer });
      const res = applySearchReplaceBlocks(buffer, blocks);
      if (res.ok) {
        setBuffer(res.text);
        if (mode === 'virtual') {
          setVirtualContent(activePath, res.text);
        }
        markDirty(activePath);
        window.alert(`Successfully applied ${res.replacedCount} edits!`);
      } else {
        window.alert(`Failed to apply: ${res.reason}`);
      }
      return;
    }

    const fences = parseCodeFences(content);
    if (fences.length > 0) {
      const code = fences[0].code;
      const ed = editorRef.current;
      setUndoBackup({ path: activePath, content: buffer });
      const selection = ed?.getSelection();
      if (ed && selection && !selection.isEmpty()) {
        const monaco = monacoRef.current;
        if (monaco) {
          const range = new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          );
          ed.executeEdits('apply-fence', [{ range, text: code, forceMoveMarkers: true }]);
          const val = ed.getValue();
          setBuffer(val);
          if (mode === 'virtual') setVirtualContent(activePath, val);
          markDirty(activePath);
        }
      } else {
        setBuffer(code);
        if (mode === 'virtual') {
          setVirtualContent(activePath, code);
        }
        markDirty(activePath);
      }
      window.alert('Applied code block to file!');
    } else {
      window.alert('No code blocks or edit regions found in the response.');
    }
  };

  const undoLastApply = () => {
    if (undoBackup && undoBackup.path === activePath) {
      setBuffer(undoBackup.content);
      if (mode === 'virtual') {
        setVirtualContent(activePath, undoBackup.content);
      }
      markDirty(activePath);
      setUndoBackup(null);
      window.alert('Undone last apply.');
    }
  };

  const handleCancelCtrlK = useCallback(() => {
    if (ctrlkCancelRef.current) {
      ctrlkCancelRef.current();
      ctrlkCancelRef.current = null;
    }
    if (ctrlkBackupContent.current) {
      setBuffer(ctrlkBackupContent.current);
      if (mode === 'virtual') {
        setVirtualContent(activePath, ctrlkBackupContent.current);
      }
      markDirty(activePath);
    }
    setInlineEditActive(false);
    setInlineEditStatus('idle');
    setCtrlkStreamText('');
  }, [activePath, markDirty, mode, setVirtualContent]);

  const handleRejectCtrlK = useCallback(() => {
    if (ctrlkBackupContent.current) {
      setBuffer(ctrlkBackupContent.current);
      if (mode === 'virtual') {
        setVirtualContent(activePath, ctrlkBackupContent.current);
      }
      markDirty(activePath);
    }
    setInlineEditActive(false);
    setInlineEditStatus('idle');
    setCtrlkStreamText('');
  }, [activePath, markDirty, mode, setVirtualContent]);

  const handleAcceptCtrlK = useCallback(() => {
    setUndoBackup({ path: activePath, content: ctrlkBackupContent.current });
    setInlineEditActive(false);
    setInlineEditStatus('idle');
    setCtrlkStreamText('');
  }, [activePath]);

  const applyFenceDirectly = (code: string) => {
    const ed = editorRef.current;
    const sel = ctrlkSelection.current;
    if (ed && sel && !sel.isEmpty() && monacoRef.current) {
      const range = new monacoRef.current.Range(
        sel.startLineNumber,
        sel.startColumn,
        sel.endLineNumber,
        sel.endColumn
      );
      ed.executeEdits('ctrlk-fence', [{ range, text: code, forceMoveMarkers: true }]);
      const val = ed.getValue();
      setBuffer(val);
      if (mode === 'virtual') setVirtualContent(activePath, val);
      markDirty(activePath);
    } else {
      setBuffer(code);
      if (mode === 'virtual') setVirtualContent(activePath, code);
      markDirty(activePath);
    }
    setInlineEditStatus('done');
  };

  // Handle Ctrl+K overlay key events
  useEffect(() => {
    if (!inlineEditActive) return;
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (
          inlineEditStatus === 'generating' ||
          inlineEditStatus === 'idle' ||
          inlineEditStatus === 'error'
        ) {
          handleCancelCtrlK();
        } else if (inlineEditStatus === 'done') {
          handleRejectCtrlK();
        }
      } else if (e.key === 'Enter' && inlineEditStatus === 'done') {
        e.preventDefault();
        handleAcceptCtrlK();
      }
    };
    window.addEventListener('keydown', handleKeys, true);
    return () => window.removeEventListener('keydown', handleKeys, true);
  }, [inlineEditActive, inlineEditStatus, handleCancelCtrlK, handleRejectCtrlK, handleAcceptCtrlK]);

  const handleStartCtrlK = async () => {
    const inst = inlineInstruction.trim();
    if (!inst) return;
    setInlineEditStatus('generating');
    setInlineEditError('');
    setCtrlkStreamText('');

    let selectionText = '';
    const sel = ctrlkSelection.current;
    if (sel && editorRef.current && !sel.isEmpty()) {
      selectionText = editorRef.current.getModel()?.getValueInRange(sel) ?? '';
    }

    const params = {
      source: ctrlkBackupContent.current,
      instruction: inst,
      mode: 'ctrlk',
      selection: selectionText || undefined,
      path: activePath,
      language,
      provider: selectedProvider || undefined,
      model: selectedModel || undefined,
      stream: true,
    };

    let streamAcc = '';
    try {
      const cancel = sendStreamingMethod('ide.code.apply', params, {
        onChunk: (delta, full) => {
          streamAcc = full;
          setCtrlkStreamText(full);
        },
        onDone: (full) => {
          setCtrlkStreamText('');
          const blocks = parseFastApplyBlocks(full);
          if (blocks.length > 0) {
            const res = applySearchReplaceBlocks(ctrlkBackupContent.current, blocks);
            if (res.ok) {
              setBuffer(res.text);
              if (mode === 'virtual') {
                setVirtualContent(activePath, res.text);
              }
              markDirty(activePath);
              setInlineEditStatus('done');
            } else {
              const fences = parseCodeFences(full);
              if (fences.length > 0) {
                applyFenceDirectly(fences[0].code);
              } else {
                setInlineEditStatus('error');
                setInlineEditError(`Fast apply parsing failed: ${res.reason}`);
              }
            }
          } else {
            const fences = parseCodeFences(full);
            if (fences.length > 0) {
              applyFenceDirectly(fences[0].code);
            } else {
              setInlineEditStatus('error');
              setInlineEditError(
                'No valid search/replace blocks or code blocks were returned by the assistant.'
              );
            }
          }
        },
        onError: (err) => {
          setInlineEditStatus('error');
          setInlineEditError(err);
        },
      });
      ctrlkCancelRef.current = cancel;
    } catch (err: any) {
      setInlineEditStatus('error');
      setInlineEditError(err?.message ?? 'Failed to stream response.');
    }
  };
  const filteredPaths = useMemo(() => {
    const q = treeQuery.trim().toLowerCase();
    if (!q) return paths;
    return paths.filter((p) => p.toLowerCase().includes(q));
  }, [paths, treeQuery]);

  const loadBufferForPath = useCallback(
    async (path: string) => {
      if (mode === 'virtual') {
        setBuffer(virtualMap[path] ?? '');
        return;
      }
      if (rootHandle) {
        try {
          const text = await readTextFileFromRoot(rootHandle, path);
          setBuffer(text);
        } catch {
          setBuffer(`// Could not read: ${path}`);
        }
      }
    },
    [mode, rootHandle, virtualMap]
  );

  const switchTab = useCallback(
    async (path: string) => {
      setActivePath(path);
      await loadBufferForPath(path);
    },
    [loadBufferForPath]
  );

  useEffect(() => {
    if (launchFromFilesRef.current) return;
    const fn = frame?.fileName;
    const s = frame?.storage;
    if (!fn && !s?.file_path) return;
    const pathForExt = fn ?? s?.file_path?.split('/').pop() ?? '';
    const ext = extensionFromFileName(pathForExt);
    if (!ext || !appSupportsExtension('void-ide', ext)) return;
    launchFromFilesRef.current = true;
    void (async () => {
      let text = `// Opened from Files: ${fn ?? s?.file_path}\n\n`;
      if (s?.file_path) {
        try {
          const loaded = await fetchStorageText(getUrl, {
            bucket_type: s.bucket_type,
            file_path: s.file_path,
          });
          if (loaded != null) text = loaded;
        } catch {
          /* keep stub */
        }
      }
      const pathName = fn ?? s?.file_path?.split('/').pop() ?? 'from-storage.txt';
      setVirtualContent(pathName, text);
      setPaths((p) => (p.includes(pathName) ? p : [...p, pathName].sort()));
      setTabs((t) => (t.includes(pathName) ? t : [...t, pathName]));
      setActivePath(pathName);
      setBuffer(text);
    })();
  }, [frame?.fileName, frame?.storage, getUrl, setVirtualContent]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const v = value ?? '';
      setBuffer(v);
      if (mode === 'virtual') {
        setVirtualContent(activePath, v);
      }
      markDirty(activePath);
    },
    [activePath, mode, setVirtualContent, markDirty]
  );

  const saveActive = useCallback(async () => {
    if (mode === 'virtual') {
      setVirtualContent(activePath, buffer);
      setDirty((d) => {
        const n = new Set(d);
        n.delete(activePath);
        return n;
      });
      return;
    }
    if (!rootHandle) return;
    try {
      await writeTextFileToRoot(rootHandle, activePath, buffer);
      setDirty((d) => {
        const n = new Set(d);
        n.delete(activePath);
        return n;
      });
    } catch (err) {
      swallowClientError('void-ide.saveFile', err);
    }
  }, [mode, activePath, buffer, rootHandle, setVirtualContent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void saveActive();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveActive]);

  const openFolder = useCallback(async () => {
    const h = await pickWorkspaceFolder();
    if (!h) {
      window.alert(
        'Could not open a folder. Use a Chromium-based browser and grant permission, or stay on the sample workspace.'
      );
      return;
    }
    setRootHandle(h);
    setMode('fsa');
    const listed = await listProjectTextFiles(h);
    if (listed.length === 0) {
      window.alert('No supported text files found in this folder.');
      setMode('virtual');
      setRootHandle(null);
      setPaths(Object.keys(VOID_IDE_SAMPLE_FILES).sort());
      return;
    }
    setPaths(listed);
    const first = listed[0]!;
    setTabs([first]);
    setActivePath(first);
    setDirty(new Set());
    try {
      const text = await readTextFileFromRoot(h, first);
      setBuffer(text);
    } catch {
      setBuffer('');
    }
  }, []);

  const resetVirtual = useCallback(() => {
    setMode('virtual');
    setRootHandle(null);
    resetToSamples();
    const keys = Object.keys(VOID_IDE_SAMPLE_FILES).sort();
    setPaths(keys);
    setTabs(['README.md']);
    setActivePath('README.md');
    setDirty(new Set());
    setBuffer(VOID_IDE_SAMPLE_FILES['README.md']!.content);
  }, [resetToSamples]);

  useEffect(() => {
    const spec = frame?.voidIdeStorageFolder;
    if (!spec?.folder_path || !spec.bucket_type) return;

    let cancelled = false;
    void (async () => {
      setMode('virtual');
      setRootHandle(null);
      setActivity('explorer');
      try {
        const relPaths = await listCloudTextRelPaths(
          apolloClient,
          spec.bucket_type,
          spec.folder_path
        );
        if (cancelled) return;
        if (relPaths.length === 0) {
          window.alert(
            spec.rootLabel
              ? `No supported text files found under “${spec.rootLabel}”.`
              : 'No supported text files found in this folder.'
          );
          resetVirtual();
          return;
        }

        const nextMap: Record<string, string> = {};
        for (const batch of chunkArray(relPaths, 8)) {
          if (cancelled) return;
          await Promise.all(
            batch.map(async (rel) => {
              const fullPath = `${spec.folder_path}/${rel}`;
              try {
                const text = await fetchStorageText(getUrl, {
                  bucket_type: spec.bucket_type,
                  file_path: fullPath,
                });
                nextMap[rel] = text ?? '';
              } catch {
                nextMap[rel] = `// Could not load: ${rel}\n`;
              }
            })
          );
        }
        if (cancelled) return;

        replaceAll(nextMap);
        const ordered = relPaths.slice().sort((a, b) => a.localeCompare(b));
        setPaths(ordered);
        const first = ordered[0]!;
        setTabs([first]);
        setActivePath(first);
        setDirty(new Set());
        setBuffer(nextMap[first] ?? '');
      } catch {
        if (!cancelled) {
          window.alert('Could not list folder in cloud storage.');
          resetVirtual();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    apolloClient,
    frame?.voidIdeStorageFolder,
    frame?.voidIdeStorageFolder?.bucket_type,
    frame?.voidIdeStorageFolder?.folder_path,
    frame?.voidIdeStorageFolder?.rootLabel,
    getUrl,
    replaceAll,
    resetVirtual,
  ]);

  const openFileFromTree = useCallback(
    (path: string) => {
      setTabs((t) => (t.includes(path) ? t : [...t, path]));
      void switchTab(path);
    },
    [switchTab]
  );

  const closeTab = useCallback(
    (path: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setTabs((t) => {
        const next = t.filter((x) => x !== path);
        if (next.length === 0) return t;
        if (path === activePath) {
          const idx = t.indexOf(path);
          const pick = next[Math.max(0, idx - 1)] ?? next[0]!;
          void switchTab(pick);
        }
        return next;
      });
    },
    [activePath, switchTab]
  );

  const sendAi = useCallback(async () => {
    const msg = aiInput.trim();
    if (!msg || streaming) return;
    setAiInput('');
    setStreamText('');
    setChatLog((c) => [...c, { role: 'user', content: msg }]);
    setStreaming(true);

    let selection = '';
    try {
      const ed = editorRef.current;
      const sel = ed?.getSelection();
      const model = ed?.getModel();
      if (sel && model && !sel.isEmpty()) {
        selection = model.getValueInRange(sel);
      }
    } catch (err) {
      swallowClientError('void-ide.saveFile', err);
    }

    const ctx = buildIdeAiContext({
      path: activePath,
      language,
      fileContent: buffer,
      selectionSnippet: selection || undefined,
    });

    await new Promise<void>((resolve, reject) => {
      sendCompletion(
        {
          message: msg,
          think,
          deepSearch: false,
          useRag,
          context: ctx,
          conversationId,
          provider: selectedProvider || undefined,
          model: selectedModel || undefined,
        },
        {
          onChunk: (_d, full) => setStreamText(full),
          onDone: (full) => {
            setStreamText('');
            setChatLog((c) => [...c, { role: 'assistant', content: full }]);
            setStreaming(false);
            resolve();
          },
          onError: (err) => {
            setStreamText('');
            setChatLog((c) => [...c, { role: 'assistant', content: `Error: ${err}` }]);
            setStreaming(false);
            reject(new Error(err));
          },
          onAborted: () => {
            setStreamText('');
            setStreaming(false);
            resolve();
          },
        }
      );
    }).catch(() => {
      setStreaming(false);
    });
  }, [
    aiInput,
    streaming,
    buffer,
    activePath,
    language,
    think,
    useRag,
    conversationId,
    sendCompletion,
    selectedProvider,
    selectedModel,
  ]);

  const copyAssistant = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      swallowClientError('void-ide.saveFile', err);
    }
  }, []);

  return (
    <div className="absolute inset-0 flex min-h-0 w-full flex-col bg-[#0c0c0e] text-[#e4e4e7]">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/10 px-2 text-[10px] uppercase tracking-wide text-white/45">
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Go</span>
        <span>Run</span>
        <span className="ml-auto flex items-center gap-2 normal-case">
          <button
            type="button"
            onClick={() => void openFolder()}
            className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/80 hover:bg-white/10"
          >
            Open folder…
          </button>
          {mode === 'fsa' ? (
            <button
              type="button"
              onClick={resetVirtual}
              className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/10"
            >
              Sample workspace
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void saveActive()}
            className="inline-flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200 hover:bg-cyan-500/20"
            title="Save (Ctrl+S)"
          >
            <Save className="h-3 w-3" aria-hidden />
            Save
          </button>
        </span>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1">
        {/* Activity bar */}
        <nav
          className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-white/10 bg-[#121214] py-2"
          aria-label="Void IDE activity"
        >
          <ActivityIcon
            label="Explorer"
            active={activity === 'explorer'}
            onClick={() => setActivity('explorer')}
          >
            <LayoutPanelLeft className="h-4 w-4" />
          </ActivityIcon>
          <ActivityIcon
            label="Search"
            active={activity === 'search'}
            onClick={() => setActivity('search')}
          >
            <Search className="h-4 w-4" />
          </ActivityIcon>
          <ActivityIcon label="AI" active={activity === 'ai'} onClick={() => setActivity('ai')}>
            <MessageSquare className="h-4 w-4" />
          </ActivityIcon>
        </nav>

        {/* Sidebar */}
        {(activity === 'explorer' || activity === 'search') && (
          <aside className="flex w-[220px] shrink-0 flex-col border-r border-white/10 bg-[#141416]">
            <div className="border-b border-white/10 px-2 py-2 text-[11px] font-semibold text-white/70">
              {activity === 'search' ? 'Search files' : 'Explorer'}
            </div>
            <div className="p-2">
              <input
                value={treeQuery}
                onChange={(e) => setTreeQuery(e.target.value)}
                placeholder={activity === 'search' ? 'Filter by path…' : 'Quick filter…'}
                className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white placeholder:text-white/35"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1 text-xs">
              {filteredPaths.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => openFileFromTree(p)}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-white/10',
                    p === activePath ? 'bg-white/10 text-white' : 'text-white/70'
                  )}
                >
                  <FileCode className="h-3.5 w-3.5 shrink-0 text-violet-300/90" aria-hidden />
                  <span className="truncate font-mono">{p}</span>
                </button>
              ))}
            </div>
            <p className="border-t border-white/10 p-2 text-[10px] leading-snug text-white/40">
              {mode === 'virtual'
                ? 'Sample files only. Open a folder for local disk (Chromium).'
                : 'Folder access does not survive a full page reload.'}
            </p>
          </aside>
        )}

        {/* Editor + tabs */}
        <div className="flex min-w-0 min-h-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-end gap-0 overflow-x-auto border-b border-white/10 bg-[#101012] px-1">
            {tabs.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => void switchTab(p)}
                className={cn(
                  'group flex max-w-[160px] shrink-0 items-center gap-1 rounded-t border border-b-0 px-2 py-1.5 text-left text-[11px]',
                  p === activePath
                    ? 'border-white/15 bg-[#0c0c0e] text-white'
                    : 'border-transparent text-white/55 hover:bg-white/5'
                )}
              >
                <span className="truncate font-mono">{p.split('/').pop()}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="ml-0.5 rounded p-0.5 opacity-60 hover:bg-white/10 hover:opacity-100"
                  onClick={(e) => closeTab(p, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      closeTab(p);
                    }
                  }}
                >
                  ×
                </span>
                {dirty.has(p) ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Unsaved" />
                ) : null}
              </button>
            ))}
          </div>

          {undoBackup && undoBackup.path === activePath && (
            <div className="flex items-center justify-between bg-amber-500/10 border-b border-white/10 px-3 py-1.5 text-xs text-amber-200">
              <span>Changes applied to editor. You can revert if needed.</span>
              <button
                type="button"
                onClick={undoLastApply}
                className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-500/30"
              >
                Undo Apply
              </button>
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-white/45">
                  Loading editor…
                </div>
              }
            >
              <MonacoEditor
                height="100%"
                theme="vs-dark"
                path={activePath}
                language={language}
                value={buffer}
                onChange={handleEditorChange}
                onMount={(ed, mon) => {
                  editorRef.current = ed;
                  monacoRef.current = mon;

                  // Add Monaco Action for Ctrl+K
                  ed.addAction({
                    id: 'void-inline-edit',
                    label: 'Inline Edit (Ctrl+K)',
                    keybindings: [mon.KeyMod.CtrlCmd | mon.KeyCode.KeyK],
                    run: () => {
                      const sel = ed.getSelection();
                      ctrlkSelection.current = sel;
                      if (sel) {
                        setCtrlkSelectionState({
                          startLineNumber: sel.startLineNumber,
                          endLineNumber: sel.endLineNumber,
                          isEmpty: sel.isEmpty(),
                        });
                      } else {
                        setCtrlkSelectionState(null);
                      }
                      ctrlkBackupContent.current = ed.getValue();
                      setInlineInstruction('');
                      setInlineEditError('');
                      setInlineEditStatus('idle');
                      setCtrlkStreamText('');
                      setInlineEditActive(true);
                    },
                  });
                }}
                options={{
                  minimap: { enabled: true },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                }}
              />
            </Suspense>

            {/* Ctrl+K Inline Edit Prompt Panel */}
            {inlineEditActive && (
              <div className="absolute left-1/2 top-4 z-50 w-[380px] -translate-x-1/2 rounded-xl border border-violet-500/30 bg-[#0e0e11]/95 p-4 shadow-2xl backdrop-blur-md">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                    Inline Edit (Ctrl+K)
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelCtrlK}
                    className="text-white/45 hover:text-white/80 text-xs"
                  >
                    ×
                  </button>
                </div>

                {ctrlkSelectionState && !ctrlkSelectionState.isEmpty ? (
                  <div className="mb-2 text-[10px] text-white/50">
                    Target: Selection (
                    {ctrlkSelectionState.endLineNumber - ctrlkSelectionState.startLineNumber + 1}{' '}
                    lines)
                  </div>
                ) : (
                  <div className="mb-2 text-[10px] text-white/50">Target: Entire File</div>
                )}

                {inlineEditStatus === 'idle' && (
                  <div className="space-y-3">
                    <textarea
                      value={inlineInstruction}
                      onChange={(e) => setInlineInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleStartCtrlK();
                        }
                      }}
                      autoFocus
                      placeholder="Ask AI to edit this code..."
                      rows={3}
                      className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/35 outline-none focus:border-violet-500/50"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelCtrlK}
                        className="rounded bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!inlineInstruction.trim()}
                        onClick={() => void handleStartCtrlK()}
                        className="rounded bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                )}

                {inlineEditStatus === 'generating' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <span className="h-2 w-2 animate-ping rounded-full bg-violet-400" />
                      <span>Streaming edits from {selectedProvider || 'default provider'}...</span>
                    </div>
                    {ctrlkStreamText && (
                      <pre className="max-h-32 overflow-y-auto rounded bg-black/50 p-2 font-mono text-[10px] text-white/60 whitespace-pre-wrap">
                        {ctrlkStreamText}
                      </pre>
                    )}
                    <button
                      type="button"
                      onClick={handleCancelCtrlK}
                      className="w-full rounded bg-red-500/10 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                    >
                      Stop
                    </button>
                  </div>
                )}

                {inlineEditStatus === 'done' && (
                  <div className="space-y-3">
                    <div className="text-xs text-emerald-300 font-semibold">
                      Edits generated and previewed in editor.
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRejectCtrlK}
                        className="flex-1 rounded bg-red-500/15 py-1.5 text-xs text-red-300 hover:bg-red-500/25"
                      >
                        Reject (Esc)
                      </button>
                      <button
                        type="button"
                        onClick={handleAcceptCtrlK}
                        className="flex-1 rounded bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                      >
                        Accept (Enter)
                      </button>
                    </div>
                  </div>
                )}

                {inlineEditStatus === 'error' && (
                  <div className="space-y-3">
                    <div className="text-xs text-red-300 whitespace-pre-wrap">
                      Error: {inlineEditError}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelCtrlK}
                        className="flex-1 rounded bg-white/5 py-1.5 text-xs text-white/70 hover:bg-white/10"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleStartCtrlK()}
                        className="flex-1 rounded bg-violet-600 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <footer className="flex h-6 shrink-0 items-center justify-between border-t border-white/10 bg-[#141416] px-2 text-[10px] text-white/45">
            <span className="truncate font-mono">{activePath}</span>
            <span className="flex items-center gap-2">
              <Braces className="h-3 w-3" aria-hidden />
              {language}
            </span>
          </footer>
        </div>

        {/* AI panel — always visible so narrow layouts still reach the gateway */}
        <aside className="flex w-[min(100%,300px)] min-w-[240px] shrink-0 flex-col border-l border-white/10 bg-[#121214]">
          <div className="flex items-center justify-between border-b border-white/10 px-2 py-2">
            <span className="text-[11px] font-semibold text-white/80">AI</span>
            {streaming ? (
              <button
                type="button"
                onClick={() => abortActiveRequests()}
                className="inline-flex items-center gap-1 rounded bg-red-500/15 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/25"
              >
                <Square className="h-3 w-3 fill-current" aria-hidden />
                Stop
              </button>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2 text-xs">
            {/* Provider and Model selectors */}
            <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-2">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/45 font-semibold">
                  Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="mt-1 w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-violet-500/50"
                >
                  <option value="">Default Provider</option>
                  {providers.map((p) => (
                    <option key={p.name} value={p.name} disabled={p.status !== 'available'}>
                      {p.name} {p.status !== 'available' ? '(Unavailable)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/45 font-semibold">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="mt-1 w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-violet-500/50"
                >
                  <option value="">Default Model</option>
                  {providers
                    .find((p) => p.name === selectedProvider)
                    ?.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-white/70">
              <input type="checkbox" checked={think} onChange={(e) => setThink(e.target.checked)} />
              Think step-by-step
            </label>
            <label className="flex items-center gap-2 text-white/70">
              <input
                type="checkbox"
                checked={useRag}
                onChange={(e) => setUseRag(e.target.checked)}
              />
              Use RAG (backend retrieval)
            </label>
            <p className="text-[10px] leading-snug text-white/40">
              Context includes the active file (truncated) and any selection. Session:{' '}
              <code className="rounded bg-black/40 px-1">{conversationId.slice(0, 24)}…</code>
            </p>
            <div className="space-y-2">
              {chatLog.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={cn(
                    'rounded-lg border px-2 py-2',
                    m.role === 'user'
                      ? 'border-cyan-500/20 bg-cyan-500/5 text-white/90'
                      : 'border-white/10 bg-black/25 text-white/80'
                  )}
                >
                  <div className="mb-1 text-[9px] uppercase text-white/40">{m.role}</div>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                  {m.role === 'assistant' ? (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <button
                        type="button"
                        className="text-[10px] text-cyan-400 hover:underline"
                        onClick={() => void copyAssistant(m.content)}
                      >
                        Copy reply
                      </button>
                      {(parseFastApplyBlocks(m.content).length > 0 ||
                        parseCodeFences(m.content).length > 0) && (
                        <button
                          type="button"
                          className="text-[10px] text-emerald-400 hover:underline font-semibold"
                          onClick={() => applyResponseBlocks(m.content)}
                        >
                          Apply to Editor
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
              {streaming && streamText ? (
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-2 py-2 text-white/80">
                  <div className="mb-1 flex items-center gap-1 text-[9px] uppercase text-white/40">
                    <StopCircle className="h-3 w-3 animate-pulse" aria-hidden />
                    assistant
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamText}</ReactMarkdown>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="border-t border-white/10 p-2">
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendAi();
                }
              }}
              rows={3}
              disabled={streaming}
              placeholder="Ask about this file…"
              className="mb-2 w-full resize-none rounded border border-white/10 bg-black/35 px-2 py-1.5 text-xs text-white placeholder:text-white/35"
            />
            <button
              type="button"
              disabled={streaming || !aiInput.trim()}
              onClick={() => void sendAi()}
              className="w-full rounded-lg bg-violet-600 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
            >
              {streaming ? 'Streaming…' : 'Send'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ActivityIcon({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      data-active={active ? '' : undefined}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-white/55 hover:bg-white/10 hover:text-white',
        active && 'border-violet-500/40 bg-violet-500/15 text-violet-200'
      )}
    >
      {children}
    </button>
  );
}
