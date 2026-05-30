'use client';

import React from 'react';
import {
  Collection,
  HttpMethod,
  ApiRequest,
  ApiResponse,
  HistoryItem,
  MockEndpoint,
  ChatMessage,
  Environment,
  AppView,
} from './durgasman/types';
import Sidebar from './durgasman/Sidebar';
import RequestBuilder from './durgasman/RequestBuilder';
import ResponseViewer from './durgasman/ResponseViewer';
import AIChatPanel from './durgasman/AIChatPanel';
import MockEditor from './durgasman/MockEditor';
import WorkspaceHome from './durgasman/WorkspaceHome';
import HistoryView from './durgasman/HistoryView';
import EnvironmentManager from './durgasman/EnvironmentManager';
import AnalyticsView from './durgasman/AnalyticsView';
import {
  chatWithGemini,
  generateCollectionDocs,
  analyzeApiResponse,
} from './durgasman/geminiService';

import {
  Settings,
  LayoutGrid,
  Bot,
  X,
  Box,
  ChevronDown,
  Home,
  Sparkles,
  Loader2,
  FileText,
  History,
  Activity,
} from 'lucide-react';

const INITIAL_REQUEST: ApiRequest = {
  id: crypto.randomUUID(),
  name: 'New Request',
  method: HttpMethod.GET,
  url: 'https://jsonplaceholder.typicode.com/posts/1',
  params: [],
  headers: [{ id: crypto.randomUUID(), key: 'Accept', value: 'application/json', enabled: true }],
  body: '',
  authType: 'None',
  preRequestScript: '',
  testScript: '',
};

export function DurgasmanApp() {
  const [view, setView] = React.useState<AppView>('HOME');
  const [collections, setCollections] = React.useState<Collection[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('durgasman_collections');
    return saved
      ? JSON.parse(saved)
      : [{ id: crypto.randomUUID(), name: 'Standard Examples', requests: [INITIAL_REQUEST] }];
  });

  const [history, setHistory] = React.useState<HistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('durgasman_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [mocks, setMocks] = React.useState<MockEndpoint[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('durgasman_mocks');
    return saved ? JSON.parse(saved) : [];
  });

  const [environments, setEnvironments] = React.useState<Environment[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('durgasman_environments');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeEnvironmentId, setActiveEnvironmentId] = React.useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('durgasman_active_env');
  });

  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [activeRequest, setActiveRequest] = React.useState<ApiRequest>(INITIAL_REQUEST);
  const [activeMock, setActiveMock] = React.useState<MockEndpoint | null>(null);
  const [lastResponse, setLastResponse] = React.useState<ApiResponse | null>(null);
  const [analysisResult, setAnalysisResult] = React.useState<string | null>(null);
  const [isSending, setIsSending] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isAIOpen, setIsAIOpen] = React.useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = React.useState(false);
  const [selectedDocCollection, setSelectedDocCollection] = React.useState<Collection | null>(null);

  // Persistence
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('durgasman_collections', JSON.stringify(collections));
    }
  }, [collections]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('durgasman_history', JSON.stringify(history));
    }
  }, [history]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('durgasman_mocks', JSON.stringify(mocks));
    }
  }, [mocks]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('durgasman_environments', JSON.stringify(environments));
    }
  }, [environments]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('durgasman_active_env', activeEnvironmentId || '');
    }
  }, [activeEnvironmentId]);

  const handleUpdateActiveRequest = (updates: Partial<ApiRequest>) =>
    setActiveRequest((prev) => ({ ...prev, ...updates }));

  const resolveVariables = (str: string): string => {
    if (!str) return str;
    const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
    if (!activeEnv) return str;
    let resolved = str;
    activeEnv.variables
      .filter((v) => v.enabled)
      .forEach((v) => {
        const regex = new RegExp(`{{${v.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}}}`, 'g');
        resolved = resolved.replace(regex, v.value);
      });
    return resolved;
  };

  const handleSendRequest = async () => {
    setIsSending(true);
    const start = Date.now();
    const resolvedUrl = resolveVariables(activeRequest.url);
    const resolvedBody = resolveVariables(activeRequest.body);
    const resolvedHeaders = activeRequest.headers
      .filter((h) => h.enabled)
      .reduce((acc, h) => ({ ...acc, [resolveVariables(h.key)]: resolveVariables(h.value) }), {});

    const historyId = crypto.randomUUID();
    const hItem: HistoryItem = {
      id: historyId,
      timestamp: start,
      method: activeRequest.method,
      url: activeRequest.url,
      body: activeRequest.body,
      headers: activeRequest.headers,
    };
    setHistory((prev) => [hItem, ...prev].slice(0, 50));

    try {
      const matchedMock = mocks.find(
        (m) =>
          m.enabled &&
          m.method === activeRequest.method &&
          (resolvedUrl.endsWith(resolveVariables(m.path)) ||
            resolvedUrl.includes(resolveVariables(m.path)))
      );
      if (matchedMock) {
        await new Promise((r) => setTimeout(r, 400));
        const data = JSON.parse(matchedMock.responseBody || '{}');
        const res: ApiResponse = {
          status: matchedMock.status,
          statusText: 'Mock Response',
          time: Date.now() - start,
          size: (JSON.stringify(data).length / 1024).toFixed(2) + ' KB',
          headers: { 'X-Mock-Server': 'Durgasman-Local' },
          data,
        };
        setLastResponse(res);
        setHistory((prev) =>
          prev.map((item) =>
            item.id === historyId
              ? {
                  ...item,
                  responseStatus: res.status,
                  responseStatusText: res.statusText,
                  responseTime: res.time,
                  responseSize: res.size,
                  responseData: res.data,
                  responseHeaders: res.headers,
                }
              : item
          )
        );
      } else {
        // Fetch via backend proxy router to avoid CORS errors
        const proxyResponse = await fetch('/api/durgasman/proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: activeRequest.method,
            url: resolvedUrl,
            headers: resolvedHeaders,
            body: ['GET', 'HEAD'].includes(activeRequest.method) ? undefined : resolvedBody,
          }),
        });

        const res: ApiResponse = await proxyResponse.json();
        setLastResponse(res);
        setHistory((prev) =>
          prev.map((item) =>
            item.id === historyId
              ? {
                  ...item,
                  responseStatus: res.status,
                  responseStatusText: res.statusText,
                  responseTime: res.time,
                  responseSize: res.size,
                  responseData: res.data,
                  responseHeaders: res.headers,
                  responseError: res.error,
                }
              : item
          )
        );
      }
    } catch (err: any) {
      const errorText = err.message || 'Failed';
      setLastResponse({
        status: 0,
        statusText: 'Error',
        time: Date.now() - start,
        size: '0 B',
        headers: {},
        data: null,
        error: errorText,
      });
      setHistory((prev) =>
        prev.map((item) =>
          item.id === historyId
            ? {
                ...item,
                responseStatus: 0,
                responseStatusText: 'Error',
                responseTime: Date.now() - start,
                responseSize: '0 B',
                responseError: errorText,
              }
            : item
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleExecuteRawRequest = async (apiReq: ApiRequest): Promise<ApiResponse> => {
    const start = Date.now();
    const resolvedUrl = resolveVariables(apiReq.url);
    const resolvedBody = resolveVariables(apiReq.body);
    const resolvedHeaders = apiReq.headers
      .filter((h) => h.enabled)
      .reduce((acc, h) => ({ ...acc, [resolveVariables(h.key)]: resolveVariables(h.value) }), {});

    const historyId = crypto.randomUUID();
    const hItem: HistoryItem = {
      id: historyId,
      timestamp: start,
      method: apiReq.method,
      url: apiReq.url,
      body: apiReq.body,
      headers: apiReq.headers,
    };
    setHistory((prev) => [hItem, ...prev].slice(0, 50));

    try {
      const matchedMock = mocks.find(
        (m) =>
          m.enabled &&
          m.method === apiReq.method &&
          (resolvedUrl.endsWith(resolveVariables(m.path)) ||
            resolvedUrl.includes(resolveVariables(m.path)))
      );
      let res: ApiResponse;
      if (matchedMock) {
        await new Promise((r) => setTimeout(r, 400));
        const data = JSON.parse(matchedMock.responseBody || '{}');
        res = {
          status: matchedMock.status,
          statusText: 'Mock Response',
          time: Date.now() - start,
          size: (JSON.stringify(data).length / 1024).toFixed(2) + ' KB',
          headers: { 'X-Mock-Server': 'Durgasman-Local' },
          data,
        };
      } else {
        // Fetch via backend proxy router to avoid CORS errors
        const proxyResponse = await fetch('/api/durgasman/proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: apiReq.method,
            url: resolvedUrl,
            headers: resolvedHeaders,
            body: ['GET', 'HEAD'].includes(apiReq.method) ? undefined : resolvedBody,
          }),
        });
        res = await proxyResponse.json();
      }
      setHistory((prev) =>
        prev.map((item) =>
          item.id === historyId
            ? {
                ...item,
                responseStatus: res.status,
                responseStatusText: res.statusText,
                responseTime: res.time,
                responseSize: res.size,
                responseData: res.data,
                responseHeaders: res.headers,
                responseError: res.error,
              }
            : item
        )
      );
      return res;
    } catch (err: any) {
      const errorText = err.message || 'Failed';
      const errorRes: ApiResponse = {
        status: 0,
        statusText: 'Error',
        time: Date.now() - start,
        size: '0 B',
        headers: {},
        data: null,
        error: errorText,
      };
      setHistory((prev) =>
        prev.map((item) =>
          item.id === historyId
            ? {
                ...item,
                responseStatus: 0,
                responseStatusText: 'Error',
                responseTime: Date.now() - start,
                responseSize: '0 B',
                responseError: errorText,
              }
            : item
        )
      );
      return errorRes;
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateHistoryItemResponse = (id: string, res: ApiResponse) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              responseStatus: res.status,
              responseStatusText: res.statusText,
              responseTime: res.time,
              responseSize: res.size,
              responseData: res.data,
              responseHeaders: res.headers,
              responseError: res.error,
            }
          : item
      )
    );
  };

  const handleSelectAndLoadRequest = (req: Partial<ApiRequest>) => {
    setActiveRequest((prev) => ({ ...prev, ...req, id: req.id || crypto.randomUUID() }));
    setActiveMock(null);
    setLastResponse(null);
    setAnalysisResult(null);
    setView('BUILDER');
  };

  const handleSaveRequest = () => {
    setCollections((prev) =>
      prev.map((col) => {
        const idx = col.requests.findIndex((r) => r.id === activeRequest.id);
        if (idx !== -1) {
          const nr = [...col.requests];
          nr[idx] = activeRequest;
          return { ...col, requests: nr };
        }
        return col;
      })
    );
  };

  const handleGenerateDocsAction = async (col: Collection) => {
    setIsGeneratingDocs(true);
    setView('DOCS');
    setSelectedDocCollection(col);
    try {
      const docs = await generateCollectionDocs(col);
      setCollections((prev) => prev.map((c) => (c.id === col.id ? { ...c, aiDocs: docs } : c)));
      setSelectedDocCollection((prev) => (prev ? { ...prev, aiDocs: docs } : null));
    } catch (err) {
      alert('AI failed to generate documentation.');
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  const handleAnalyzeResponse = async () => {
    if (!lastResponse) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeApiResponse(lastResponse, activeRequest);
      setAnalysisResult(result);
    } catch (err) {
      alert('AI failed to analyze the response.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden text-slate-200 bg-slate-950 font-sans">
      <header className="h-12 bg-[#050505] border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('HOME')}>
            <div className="w-6 h-6 bg-orange-600 rounded flex items-center justify-center font-bold text-white text-[10px] shadow-[0_0_15px_rgba(234,88,12,0.4)]">
              D
            </div>
            <span className="font-black text-[11px] tracking-tighter text-white uppercase italic">
              Durgasman Studio
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setView('HOME')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${view === 'HOME' ? 'bg-orange-600/10 text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Home size={14} /> Home
            </button>
            <button
              onClick={() => setView('BUILDER')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${view === 'BUILDER' ? 'bg-orange-600/10 text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <LayoutGrid size={14} /> Builder
            </button>
            <button
              onClick={() => setView('HISTORY')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${view === 'HISTORY' ? 'bg-orange-600/10 text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <History size={14} /> History
            </button>
            <button
              onClick={() => setView('ENVIRONMENTS')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${view === 'ENVIRONMENTS' ? 'bg-orange-600/10 text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Box size={14} /> Environments
            </button>
            <button
              onClick={() => setView('ANALYTICS')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${view === 'ANALYTICS' ? 'bg-orange-600/10 text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Activity size={14} /> Traffic
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest hover:border-slate-700 transition-all">
              <Box size={10} className={activeEnv ? 'text-orange-500' : ''} />
              {activeEnv ? activeEnv.name : 'Local'}
              <ChevronDown size={8} />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-800 rounded shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] overflow-hidden">
              <button
                onClick={() => setActiveEnvironmentId(null)}
                className="w-full text-left px-4 py-2 text-[10px] hover:bg-slate-800 text-slate-400 font-bold border-b border-slate-800"
              >
                No Environment
              </button>
              {environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => setActiveEnvironmentId(env.id)}
                  className={`w-full text-left px-4 py-2 text-[10px] font-bold hover:bg-slate-800 ${activeEnvironmentId === env.id ? 'text-orange-500 bg-orange-600/5' : 'text-slate-500'}`}
                >
                  {env.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-600/10 rounded-full text-[9px] font-black text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
            <Sparkles size={10} /> AI Powered
          </div>
          <button
            onClick={() => setView('ENVIRONMENTS')}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-500"
            title="Manage Environments"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <Sidebar
          collections={collections}
          history={history}
          mocks={mocks}
          environments={environments}
          activeRequestId={activeRequest.id}
          activeEnvironmentId={activeEnvironmentId}
          onSelectRequest={(req) => {
            setActiveRequest((prev) => ({ ...prev, ...req, id: req.id || prev.id }));
            setActiveMock(null);
            setView('BUILDER');
          }}
          onSelectMock={(mock) => {
            setActiveMock(mock);
            setView('BUILDER');
          }}
          onSelectEnvironment={setActiveEnvironmentId}
          onEditEnvironment={(id) => {
            setActiveEnvironmentId(id);
            setView('ENVIRONMENTS');
          }}
          onUpdateEnvironment={(env) =>
            setEnvironments((prev) => prev.map((e) => (e.id === env.id ? env : e)))
          }
          onCreateCollection={() =>
            setCollections((prev) => [
              ...prev,
              { id: crypto.randomUUID(), name: 'New Collection', requests: [] },
            ])
          }
          onCreateMock={() => {
            const nm: MockEndpoint = {
              id: crypto.randomUUID(),
              method: HttpMethod.GET,
              path: '/api/resource',
              responseBody: '{}',
              status: 200,
              enabled: true,
            };
            setMocks((prev) => [...prev, nm]);
            setActiveMock(nm);
            setView('BUILDER');
          }}
          onCreateEnvironment={() => {
            const newEnvId = crypto.randomUUID();
            setEnvironments((prev) => [
              ...prev,
              { id: newEnvId, name: `Environment ${prev.length + 1}`, variables: [] },
            ]);
            setActiveEnvironmentId(newEnvId);
            setView('ENVIRONMENTS');
          }}
          onClearHistory={() => setHistory([])}
          onImport={(file) => {
            /* Import logic placeholder */
          }}
          onGenerateDocs={handleGenerateDocsAction}
        />

        <div className="flex-1 flex overflow-hidden relative">
          {view === 'HOME' && (
            <WorkspaceHome
              collections={collections}
              history={history}
              onNewRequest={() => setView('BUILDER')}
              onImport={() => {}}
              onViewHistory={() => setView('HISTORY')}
            />
          )}

          {view === 'BUILDER' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0">
                {activeMock ? (
                  <MockEditor
                    mock={activeMock}
                    onUpdate={(u) => {
                      const nm = { ...activeMock, ...u };
                      setActiveMock(nm);
                      setMocks((prev) => prev.map((m) => (m.id === nm.id ? nm : m)));
                    }}
                    onDelete={() => {
                      setMocks((prev) => prev.filter((m) => m.id !== activeMock.id));
                      setActiveMock(null);
                    }}
                    onClose={() => setActiveMock(null)}
                  />
                ) : (
                  <RequestBuilder
                    request={activeRequest}
                    onUpdate={handleUpdateActiveRequest}
                    onSend={handleSendRequest}
                    onSave={handleSaveRequest}
                    isSending={isSending}
                  />
                )}
              </div>
              <div className="w-[440px] shrink-0 border-l border-slate-800 bg-slate-900/50">
                <ResponseViewer
                  response={lastResponse}
                  activeRequest={activeRequest}
                  onAnalyze={handleAnalyzeResponse}
                  isAnalyzing={isAnalyzing}
                  analysisResult={analysisResult}
                  onClearAnalysis={() => setAnalysisResult(null)}
                  responseSchema={activeRequest.responseSchema}
                />
              </div>
            </div>
          )}

          {view === 'HISTORY' && (
            <HistoryView
              history={history}
              onClearHistory={() => setHistory([])}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              onSelectAndLoadRequest={handleSelectAndLoadRequest}
              onExecuteRequest={handleExecuteRawRequest}
              onUpdateHistoryItemResponse={handleUpdateHistoryItemResponse}
            />
          )}

          {view === 'ENVIRONMENTS' && (
            <EnvironmentManager
              environments={environments}
              activeEnvironmentId={activeEnvironmentId}
              onSelectEnvironment={setActiveEnvironmentId}
              onUpdateEnvironment={(env) =>
                setEnvironments((prev) => prev.map((e) => (e.id === env.id ? env : e)))
              }
              onCreateEnvironment={() =>
                setEnvironments((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), name: 'New Environment', variables: [] },
                ])
              }
              onDeleteEnvironment={(id) => {
                setEnvironments((prev) => prev.filter((env) => env.id !== id));
                if (activeEnvironmentId === id) setActiveEnvironmentId(null);
              }}
              onClose={() => setView('BUILDER')}
            />
          )}

          {view === 'ANALYTICS' && (
            <AnalyticsView
              history={history}
              onClearHistory={() => setHistory([])}
              onAddHistoryItems={(events) =>
                setHistory((prev) => [...events, ...prev].slice(0, 100))
              }
              onLoadRequestToBuilder={(sig) => {
                handleSelectAndLoadRequest({
                  ...INITIAL_REQUEST,
                  id: crypto.randomUUID(),
                  name: `Trace: ${(sig.url || '').replace(/^(https?:\/\/)?([^\/]+)/, '').split('?')[0]}`,
                  method: sig.method,
                  url: sig.url,
                  body: sig.body,
                  headers: sig.headers,
                });
              }}
            />
          )}

          {view === 'DOCS' && (
            <div className="flex-1 bg-[#0f172a] overflow-y-auto p-12 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {selectedDocCollection?.name}
                    </h1>
                    <p className="text-slate-500 text-sm uppercase font-bold tracking-widest flex items-center gap-2">
                      <FileText size={14} /> AI Generated Documentation
                    </p>
                  </div>
                  <button
                    onClick={() => setView('BUILDER')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition-all"
                  >
                    Back to Builder
                  </button>
                </div>

                {isGeneratingDocs ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 size={48} className="text-orange-500 animate-spin" />
                    <p className="text-slate-400 animate-pulse font-bold text-sm">
                      Gemini is analyzing your collection endpoints...
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none text-slate-300 font-sans leading-relaxed">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 whitespace-pre-wrap font-mono text-sm overflow-x-auto shadow-2xl">
                      {selectedDocCollection?.aiDocs || 'No documentation generated.'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating AI Panel */}
      {isAIOpen ? (
        <AIChatPanel
          messages={chatMessages}
          onAddMessage={(m) => setChatMessages((prev) => [...prev, m])}
          onClear={() => setChatMessages([])}
        />
      ) : (
        <button
          onClick={() => setIsAIOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-orange-600 hover:bg-orange-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-50 ring-4 ring-orange-500/20 group animate-pulse"
        >
          <Bot size={24} className="group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {isAIOpen && (
        <button
          onClick={() => setIsAIOpen(false)}
          className="fixed bottom-[655px] right-6 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-full z-[100] border border-slate-700 transition-all shadow-lg"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
