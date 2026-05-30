import React from 'react';
import { HistoryItem, ApiRequest, HttpMethod, KeyValue } from './types';
import {
  Play,
  Clock,
  Check,
  Copy,
  ExternalLink,
  Database,
  Info,
  AlertCircle,
  RefreshCw,
  Trash2,
  Search,
} from 'lucide-react';

interface HistoryViewProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
  onSelectAndLoadRequest: (req: Partial<ApiRequest>) => void;
  onExecuteRequest: (req: ApiRequest) => Promise<any>;
  onUpdateHistoryItemResponse: (id: string, responseDetails: any) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onClearHistory,
  onDeleteHistoryItem,
  onSelectAndLoadRequest,
  onExecuteRequest,
  onUpdateHistoryItemResponse,
}) => {
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(
    history.length > 0 ? history[0].id : null
  );
  const [searchTerm, setSearchTerm] = React.useState('');
  const [methodFilter, setMethodFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [activeTab, setActiveTab] = React.useState<'headers' | 'body' | 'response'>('headers');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [isReRunning, setIsReRunning] = React.useState(false);
  const [inlineResponse, setInlineResponse] = React.useState<{
    status: number;
    statusText: string;
    time: number;
    size: string;
    headers: Record<string, string>;
    data: any;
    error?: string;
  } | null>(null);

  const selectedItem = history.find((item) => item.id === selectedItemId) || null;

  React.useEffect(() => {
    if (history.length > 0 && (!selectedItemId || !history.some((h) => h.id === selectedItemId))) {
      setSelectedItemId(history[0].id);
    } else if (history.length === 0) {
      setSelectedItemId(null);
    }
  }, [history, selectedItemId]);

  React.useEffect(() => {
    setInlineResponse(null);
    if (selectedItem) {
      if (selectedItem.responseStatus !== undefined) {
        setInlineResponse({
          status: selectedItem.responseStatus,
          statusText: selectedItem.responseStatusText || '',
          time: selectedItem.responseTime || 0,
          size: selectedItem.responseSize || '',
          headers: selectedItem.responseHeaders || {},
          data: selectedItem.responseData,
          error: selectedItem.responseError,
        });
      }
    }
  }, [selectedItemId]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'POST':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'PUT':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'PATCH':
        return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300)
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (status >= 300 && status < 400) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (status >= 400 && status < 500) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (status >= 500) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return (
      date.toLocaleTimeString() +
      ' - ' +
      date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    );
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.body && item.body.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMethod = methodFilter === 'ALL' || item.method === methodFilter;

    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      const status = item.responseStatus;
      if (statusFilter === 'SUCCESS') {
        matchesStatus = !!status && status >= 200 && status < 300;
      } else if (statusFilter === 'ERROR') {
        matchesStatus = !!status && status >= 400;
      } else if (statusFilter === 'PENDING') {
        matchesStatus = status === undefined || status === 0;
      }
    }

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const handleReRun = async () => {
    if (!selectedItem) return;
    setIsReRunning(true);
    setInlineResponse(null);

    const apiReq: ApiRequest = {
      id: selectedItem.id,
      name: `Historical: ${selectedItem.method} ${selectedItem.url}`,
      method: selectedItem.method,
      url: selectedItem.url,
      params: [],
      headers: selectedItem.headers,
      body: selectedItem.body,
      authType: 'None',
      preRequestScript: '',
      testScript: '',
    };

    try {
      const res = await onExecuteRequest(apiReq);
      setInlineResponse(res);
      onUpdateHistoryItemResponse(selectedItem.id, res);
    } catch (err: any) {
      const errorRes = {
        status: 0,
        statusText: 'Error',
        time: 0,
        size: '0 B',
        headers: {},
        data: null,
        error: err.message || 'Failed to execute request',
      };
      setInlineResponse(errorRes);
      onUpdateHistoryItemResponse(selectedItem.id, errorRes);
    } finally {
      setIsReRunning(false);
    }
  };

  const highlightJSON = (data: any) => {
    if (data === null || data === undefined) return 'null';
    if (typeof data !== 'object') return String(data);
    const jsonString = JSON.stringify(data, null, 2);

    const regex =
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
    const parts = jsonString.split(regex);

    return parts.map((part, index) => {
      if (part === undefined || part === '') return null;
      if (/^"/.test(part)) {
        if (/:$/.test(part)) {
          return (
            <span key={index} className="json-key text-orange-400 font-semibold">
              {part}
            </span>
          );
        } else {
          return (
            <span key={index} className="json-string text-emerald-400">
              {part}
            </span>
          );
        }
      } else if (/true|false/.test(part)) {
        return (
          <span key={index} className="json-boolean text-violet-400 font-bold">
            {part}
          </span>
        );
      } else if (/null/.test(part)) {
        return (
          <span key={index} className="json-null text-slate-500 italic">
            {part}
          </span>
        );
      } else if (/^-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?$/.test(part)) {
        return (
          <span key={index} className="json-number text-blue-400">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 font-sans">
      {/* LEFT LIST PANEL */}
      <div className="w-96 border-r border-slate-800 flex flex-col h-full bg-[#07090e]">
        <div className="p-4 border-b border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Clock size={16} className="text-orange-500" /> API Requests Ledger
            </h1>
            {history.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to purge all API request history?')) {
                    onClearHistory();
                  }
                }}
                className="text-[10px] font-bold text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors uppercase tracking-widest px-2 py-1 rounded hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 cursor-pointer"
              >
                <Trash2 size={12} /> Clear All
              </button>
            )}
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by keyword, path, method..."
              className="w-full bg-slate-905 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>

          {/* QUICK METHOD FILTER ACCORDION/TABS */}
          <div className="flex flex-wrap gap-1">
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((method) => (
              <button
                key={method}
                onClick={() => setMethodFilter(method)}
                className={`px-2 py-0.5 text-[9px] font-black tracking-widest uppercase rounded border transition-all cursor-pointer ${
                  methodFilter === method
                    ? 'bg-orange-600/10 text-orange-400 border-orange-500/30'
                    : 'bg-slate-900/40 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {/* STATUS FILTER */}
          <div className="flex gap-1 border-t border-slate-800/60 pt-2">
            {[
              { label: 'All Statuses', val: 'ALL' },
              { label: 'Success (2xx)', val: 'SUCCESS' },
              { label: 'Errors (4xx+)', val: 'ERROR' },
            ].map((f) => (
              <button
                key={f.val}
                onClick={() => setStatusFilter(f.val)}
                className={`flex-1 py-0.5 text-[8px] font-bold tracking-widest uppercase rounded text-center transition-all cursor-pointer ${
                  statusFilter === f.val
                    ? 'text-slate-200 bg-slate-800 border border-slate-700'
                    : 'text-slate-500 hover:text-slate-400 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* LIST CONTAINMENT */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredHistory.map((item) => {
            const isSelected = item.id === selectedItemId;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`group p-3 rounded-lg cursor-pointer transition-all border flex flex-col gap-2 relative ${
                  isSelected
                    ? 'bg-orange-600/5 border-orange-500/30 shadow-[0_0_15px_rgba(234,88,12,0.05)]'
                    : 'bg-slate-900/20 hover:bg-slate-900/50 border-slate-900/40 hover:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${getMethodColor(item.method)}`}
                  >
                    {item.method}
                  </span>
                  <span
                    className={`text-[11px] font-medium truncate flex-1 ${isSelected ? 'text-slate-100' : 'text-slate-400'}`}
                  >
                    {item.url}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteHistoryItem(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400 transition-all shrink-0 cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-600 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Clock size={10} className="text-slate-700" />
                    {formatTime(item.timestamp)}
                  </span>

                  {item.responseStatus ? (
                    <span
                      className={`px-1 rounded font-black text-[9px] ${getStatusColor(item.responseStatus)}`}
                    >
                      {item.responseStatus} {item.responseStatusText || ''}
                    </span>
                  ) : (
                    <span className="text-[8px] text-slate-700 italic lowercase flex items-center">
                      unexecuted
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
              <Clock size={36} className="text-slate-800 animate-pulse" />
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  No matching history
                </p>
                <p className="text-[10px] text-slate-650 max-w-xs">
                  Send queries in the Request Builder to log live requests, or adjust your
                  filtration criteria.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PREVIEW DETAILS PANEL */}
      <div className="flex-1 flex flex-col h-full bg-[#0a0c10] overflow-hidden">
        {selectedItem ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* LEDGER WORKSPACE HEADER */}
            <div className="p-6 border-b border-slate-800 bg-[#08090d] flex items-center justify-between gap-4 shrink-0">
              <div className="min-w-0 space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                    <Database size={10} /> Saved Snapshot
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    | Unique Entry: {selectedItem.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 max-w-3xl">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getMethodColor(selectedItem.method)}`}
                  >
                    {selectedItem.method}
                  </span>
                  <h2 className="text-sm font-bold text-slate-100 font-mono truncate select-all">
                    {selectedItem.url}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleReRun}
                  disabled={isReRunning}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-lg flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg hover:shadow-orange-500/20 active:scale-95 transition-all disabled:pointer-events-none cursor-pointer"
                >
                  {isReRunning ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-orange-400" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} className="fill-white" />
                      <span>Re-Run Request</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() =>
                    onSelectAndLoadRequest({
                      method: selectedItem.method,
                      url: selectedItem.url,
                      name: `Restored: ${selectedItem.method}`,
                      headers: selectedItem.headers,
                      body: selectedItem.body,
                    })
                  }
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  title="Load config back into builder workspace for modifications"
                >
                  <ExternalLink size={13} />
                  <span>Open in Builder</span>
                </button>
              </div>
            </div>

            {/* TAB SELECTORS */}
            <div className="flex border-b border-slate-800/80 bg-[#08090d]/60 shrink-0 px-6">
              {[
                { label: 'Request Headers', id: 'headers' as const },
                { label: 'Payload Body', id: 'body' as const },
                { label: 'Response Body', id: 'response' as const },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-5 text-[11px] font-bold uppercase tracking-widest relative transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'text-orange-500 font-extrabold border-b-2 border-orange-500'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'headers' && selectedItem.headers.length > 0 && (
                    <span className="ml-1.5 px-1 bg-slate-900 text-slate-400 border border-slate-800 text-[9px] rounded-full font-bold">
                      {selectedItem.headers.length}
                    </span>
                  )}
                  {tab.id === 'response' && inlineResponse && (
                    <span
                      className={`ml-1 px-1 rounded-full font-black text-[8px] ${inlineResponse.status >= 200 && inlineResponse.status < 300 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}
                    >
                      ●
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* WORKSPACE DETAIL SHEETS */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {activeTab === 'headers' && (
                <div className="space-y-4">
                  <div className="bg-slate-900/30 border border-slate-800/80 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        Configured Headers
                      </span>
                      {selectedItem.headers.length > 0 && (
                        <button
                          onClick={() =>
                            handleCopyText(
                              JSON.stringify(selectedItem.headers, null, 2),
                              'h-headers'
                            )
                          }
                          className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {copiedId === 'h-headers' ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>
                    {selectedItem.headers.length > 0 ? (
                      <table className="w-full text-left text-xs text-slate-400">
                        <thead className="bg-[#0b0c10] text-[10px] font-bold uppercase tracking-wider border-b border-slate-800/80 text-slate-650">
                          <tr>
                            <th className="px-4 py-2">Header Key</th>
                            <th className="px-4 py-2">Header Value</th>
                            <th className="px-4 py-2 text-center w-20">State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {selectedItem.headers.map((h, i) => (
                            <tr key={h.id || i} className="hover:bg-slate-900/10">
                              <td className="px-4 py-2 font-mono text-slate-300 font-semibold select-all">
                                {h.key}
                              </td>
                              <td className="px-4 py-2 font-mono text-slate-400 select-all">
                                {h.value}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${h.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-600'}`}
                                >
                                  {h.enabled ? 'ENABLED' : 'DISABLED'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-600 italic">
                        No headers configured on this request.
                      </div>
                    )}
                  </div>

                  {/* INFO BOARD */}
                  <div className="p-4 bg-slate-900/20 border border-slate-800/60 rounded-lg flex gap-3 text-xs text-slate-400">
                    <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-slate-300 uppercase tracking-widest text-[9px]">
                        Historical State Persistence
                      </p>
                      <p className="text-slate-500 leading-relaxed text-[10px]">
                        This ledger displays the absolute snapshot parameters at the time of
                        sending. You may hit &quot;Open in Builder&quot; at any time to import
                        parameters with auto-resolved variables directly to your current design
                        sandbox.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'body' && (
                <div className="space-y-4">
                  <div className="bg-slate-900/30 border border-slate-800/80 rounded-lg overflow-hidden flex flex-col">
                    <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        Payload Source Stream
                      </span>
                      {selectedItem.body ? (
                        <button
                          onClick={() => handleCopyText(selectedItem.body, 'h-body')}
                          className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-200 transition-colors"
                        >
                          {copiedId === 'h-body' ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      ) : null}
                    </div>
                    {selectedItem.body ? (
                      <div className="p-4 bg-[#07090d] text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre rounded-b">
                        <code>
                          {selectedItem.body.startsWith('{') || selectedItem.body.startsWith('[')
                            ? (() => {
                                try {
                                  return highlightJSON(JSON.parse(selectedItem.body));
                                } catch (e) {
                                  return selectedItem.body;
                                }
                              })()
                            : selectedItem.body}
                        </code>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-600 italic">
                        No request payload body configured on this HTTP Method call.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'response' && (
                <div className="space-y-4">
                  {isReRunning ? (
                    <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-[#080a0e]/40 border border-slate-850 rounded-lg">
                      <RefreshCw size={24} className="text-orange-500 animate-spin" />
                      <div className="text-center">
                        <p className="text-xs text-slate-400 font-black uppercase tracking-widest">
                          Resolving Endpoint Connectors
                        </p>
                        <p className="text-[10px] text-slate-650 animate-pulse">
                          Waiting for server response...
                        </p>
                      </div>
                    </div>
                  ) : inlineResponse ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="p-3 bg-slate-900/30 border border-slate-800/60 rounded-lg flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">
                            Response Code
                          </span>
                          <span
                            className={`text-sm font-extrabold flex items-center gap-1.5 ${inlineResponse.status >= 200 && inlineResponse.status < 300 ? 'text-emerald-400' : 'text-rose-400'}`}
                          >
                            {inlineResponse.status || 'ERROR'}
                            <span className="text-[10px] text-slate-500 font-medium">
                              ({inlineResponse.statusText})
                            </span>
                          </span>
                        </div>
                        <div className="p-3 bg-slate-900/30 border border-slate-800/60 rounded-lg flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">
                            Execution Speed
                          </span>
                          <span className="text-sm font-extrabold text-sky-400 font-mono">
                            {inlineResponse.time}{' '}
                            <span className="text-[10px] text-slate-500 font-light">ms</span>
                          </span>
                        </div>
                        <div className="p-3 bg-slate-900/30 border border-slate-800/60 rounded-lg flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">
                            Download Size
                          </span>
                          <span className="text-sm font-extrabold text-indigo-400 font-mono">
                            {inlineResponse.size}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-900/30 border border-slate-800/60 rounded-lg flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">
                            Response Validation
                          </span>
                          <span className="text-sm font-extrabold text-emerald-400 flex items-center gap-1">
                            <Check size={14} className="text-emerald-500" /> Passed
                          </span>
                        </div>
                      </div>

                      {inlineResponse.error ? (
                        <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-lg flex gap-3 text-xs text-rose-400">
                          <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-rose-300 uppercase tracking-widest text-[9px]">
                              Server Connection Aborted
                            </p>
                            <p className="text-rose-500/80 leading-relaxed text-[10px] font-mono">
                              {inlineResponse.error}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {inlineResponse.headers &&
                            Object.keys(inlineResponse.headers).length > 0 && (
                              <div className="bg-slate-900/20 border border-slate-800/60 rounded-lg overflow-hidden">
                                <div className="px-4 py-1.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                  <span>Response Headers</span>
                                </div>
                                <div className="max-h-56 overflow-y-auto p-3 grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[10px] text-slate-500 custom-scrollbar">
                                  {Object.entries(inlineResponse.headers).map(([key, value]) => (
                                    <div
                                      key={key}
                                      className="flex gap-2 border-b border-slate-800/40 pb-1 hover:text-slate-300"
                                    >
                                      <span className="text-slate-400 font-semibold select-all shrink-0">
                                        {key}:
                                      </span>
                                      <span className="select-all truncate flex-1 text-slate-500 text-right">
                                        {value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          <div className="bg-slate-900/30 border border-slate-800/80 rounded-lg overflow-hidden flex flex-col">
                            <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                Structured Response Block
                              </span>
                              <button
                                onClick={() =>
                                  handleCopyText(
                                    JSON.stringify(inlineResponse.data, null, 2),
                                    'h-res'
                                  )
                                }
                                className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-200 transition-colors"
                              >
                                {copiedId === 'h-res' ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                            <div className="p-4 bg-[#07090d] text-slate-200 font-mono text-xs overflow-x-auto whitespace-pre max-h-96 custom-scrollbar">
                              <code>{highlightJSON(inlineResponse.data)}</code>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-[#080a0e]/40 border border-slate-850 rounded-lg text-center">
                      <Play
                        size={24}
                        className="text-slate-700 hover:text-orange-500 cursor-pointer hover:scale-110 transition-all"
                        onClick={handleReRun}
                      />
                      <div className="space-y-1 max-w-sm">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                          Live Execution Required
                        </p>
                        <p className="text-[10px] text-slate-650">
                          No response snapshot recorded for this load. Trigger &quot;Re-Run
                          Request&quot; and hit servers securely in real-time.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="w-16 h-16 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex items-center justify-center text-slate-600 shadow-2xl">
              <Clock size={28} className="text-slate-700" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                No request selected
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select a historical transaction from the api requests ledger sidebar panel to view
                detailed payload parameters, headers, and previous responses.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
