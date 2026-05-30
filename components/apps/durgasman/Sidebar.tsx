import React from 'react';
import {
  Folder,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  History,
  Server,
  Layers,
  Download,
  Box,
  Sparkles,
  Key,
} from 'lucide-react';
import {
  Collection,
  ApiRequest,
  HistoryItem,
  MockEndpoint,
  Environment,
  EnvVariable,
} from './types';

interface SidebarProps {
  collections: Collection[];
  history: HistoryItem[];
  mocks: MockEndpoint[];
  environments: Environment[];
  activeRequestId: string | null;
  activeEnvironmentId: string | null;
  onSelectRequest: (request: Partial<ApiRequest>) => void;
  onSelectMock: (mock: MockEndpoint) => void;
  onSelectEnvironment: (id: string | null) => void;
  onEditEnvironment: (id: string) => void;
  onUpdateEnvironment: (env: Environment) => void;
  onCreateCollection: () => void;
  onCreateMock: () => void;
  onCreateEnvironment: () => void;
  onClearHistory: () => void;
  onImport: (file: File) => void;
  onGenerateDocs: (collection: Collection) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collections,
  history,
  mocks,
  environments,
  activeRequestId,
  activeEnvironmentId,
  onSelectRequest,
  onSelectMock,
  onSelectEnvironment,
  onEditEnvironment,
  onCreateCollection,
  onCreateMock,
  onCreateEnvironment,
  onImport,
  onGenerateDocs,
}) => {
  const [activeTab, setActiveTab] = React.useState<'collections' | 'history' | 'mocks' | 'envs'>(
    'collections'
  );
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const toggleExpand = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredCollections = collections.filter(
    (col) =>
      col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.requests.some((req) => req.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredEnvs = environments.filter((env) =>
    env.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const matchedVariables = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    const results: { envId: string; envName: string; variable: EnvVariable }[] = [];

    environments.forEach((env) => {
      env.variables.forEach((v) => {
        const keyMatch = (v.key || '').toLowerCase().includes(term);
        const valMatch = (v.value || '').toLowerCase().includes(term);
        if (keyMatch || valMatch) {
          results.push({
            envId: env.id,
            envName: env.name,
            variable: v,
          });
        }
      });
    });
    return results;
  }, [environments, searchTerm]);

  return (
    <div className="w-72 bg-[#050505] border-r border-slate-800 flex flex-col h-full select-none shadow-2xl z-20">
      <div className="flex border-b border-slate-800 shrink-0 bg-slate-900/20">
        {(['collections', 'envs', 'history', 'mocks'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex flex-col items-center gap-1 transition-all ${activeTab === tab ? 'text-orange-500 bg-orange-500/10 border-b-2 border-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab === 'collections' && <Layers size={14} />}
            {tab === 'envs' && <Box size={14} />}
            {tab === 'history' && <History size={14} />}
            {tab === 'mocks' && <Server size={14} />}
            {tab.slice(0, 4)}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[10px] text-slate-500 uppercase tracking-widest">
            {activeTab}
          </h2>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 hover:bg-slate-800 rounded text-slate-500 transition-colors"
              title="Import JSON"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => {
                if (activeTab === 'collections') onCreateCollection();
                if (activeTab === 'envs') onCreateEnvironment();
                if (activeTab === 'mocks') onCreateMock();
              }}
              className="p-1 hover:bg-slate-800 rounded text-slate-500 transition-colors"
              title="New Item"
            >
              <Plus size={14} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".json"
            />
          </div>
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Filter ${activeTab}...`}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 outline-none focus:ring-1 focus:ring-orange-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 custom-scrollbar">
        {activeTab === 'collections' &&
          filteredCollections.map((col) => (
            <div key={col.id} className="mb-0.5">
              <div
                onClick={() => toggleExpand(col.id)}
                className="flex items-center px-2 py-2 hover:bg-slate-800/40 rounded-md cursor-pointer text-slate-400 group transition-colors"
              >
                <div className="flex items-center flex-1 min-w-0">
                  {expanded[col.id] || searchTerm ? (
                    <ChevronDown size={14} className="mr-2 text-slate-600" />
                  ) : (
                    <ChevronRight size={14} className="mr-2 text-slate-600" />
                  )}
                  <Folder
                    size={14}
                    className={`mr-2 ${expanded[col.id] ? 'text-orange-500' : 'text-slate-500'}`}
                  />
                  <span
                    className={`text-xs font-semibold truncate ${expanded[col.id] ? 'text-slate-200' : 'text-slate-400'}`}
                  >
                    {col.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateDocs(col);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-indigo-400 transition-all"
                  title="Generate AI Docs"
                >
                  <Sparkles size={12} />
                </button>
              </div>

              {(expanded[col.id] || searchTerm) && (
                <div className="ml-4 mt-0.5 pl-2 border-l border-slate-800 space-y-0.5">
                  {col.requests
                    .filter((req) => req.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((req) => (
                      <div
                        key={req.id}
                        onClick={() => onSelectRequest(req)}
                        className={`flex items-center px-3 py-1.5 cursor-pointer group rounded-md text-[11px] transition-all ${
                          activeRequestId === req.id
                            ? 'bg-orange-500/10 text-orange-500 shadow-sm'
                            : 'hover:bg-slate-800/60 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span
                          className={`w-10 font-black ${getMethodColor(req.method)} text-[9px] uppercase`}
                        >
                          {req.method}
                        </span>
                        <span className="truncate font-medium">{req.name}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}

        {activeTab === 'envs' && (
          <div className="space-y-4">
            <div className="space-y-1">
              {searchTerm && (
                <div className="px-3 py-1 text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1">
                  <Box size={10} /> Profile Matches
                </div>
              )}
              {filteredEnvs.map((env) => {
                const isActive = activeEnvironmentId === env.id;
                return (
                  <div
                    key={env.id}
                    onClick={() => onEditEnvironment(env.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer group transition-all border ${
                      isActive
                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 shadow-sm'
                        : 'border-transparent hover:bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center min-w-0">
                      <Box
                        size={14}
                        className={`mr-2 shrink-0 ${isActive ? 'text-orange-500' : 'text-slate-500'}`}
                      />
                      <span className="text-xs font-medium truncate">{env.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isActive && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-orange-500"
                          title="Active environment"
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEnvironment(env.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 px-1.5 bg-slate-800 hover:bg-slate-700/80 rounded text-slate-400 hover:text-white transition-all font-bold text-[9px] uppercase tracking-wider"
                        title="Configure variables"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredEnvs.length === 0 && searchTerm && (
                <div className="px-3 py-2 text-[11px] text-slate-600 italic">
                  No matching environments found
                </div>
              )}
              {environments.length === 0 && (
                <div className="p-4 text-center space-y-2">
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest block">
                    No Environments
                  </span>
                  <button
                    onClick={onCreateEnvironment}
                    className="text-[10px] bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded text-orange-500 font-bold tracking-wide transition-all w-full uppercase"
                  >
                    + Create Environment
                  </button>
                </div>
              )}
            </div>

            {searchTerm.trim() && (
              <div className="space-y-1.5 pt-2 border-t border-slate-900">
                <div className="px-3 py-1 text-[9px] font-black uppercase text-orange-500 tracking-widest flex items-center gap-1">
                  <Key size={10} /> Variable Matches ({matchedVariables.length})
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                  {matchedVariables.map(({ envId, envName, variable }) => (
                    <div
                      key={variable.id}
                      onClick={() => {
                        onSelectEnvironment(envId);
                        onEditEnvironment(envId);
                      }}
                      className="p-2 bg-slate-950/40 hover:bg-orange-600/[0.03] border border-slate-900 hover:border-orange-500/20 rounded-lg cursor-pointer transition-all flex flex-col gap-0.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-orange-400 font-mono flex items-center gap-1">
                          <Key
                            size={10}
                            className="text-slate-500 group-hover:text-orange-500/70"
                          />{' '}
                          {variable.key || <span className="text-slate-700 italic">unnamed</span>}
                        </span>
                        <span className="text-[8px] bg-slate-900 text-slate-500 px-1 rounded uppercase font-bold shrink-0 truncate max-w-[100px]">
                          {envName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono pl-3.5">
                        <span
                          className="text-slate-500 truncate max-w-[150px]"
                          title={variable.value}
                        >
                          {variable.value || <span className="text-slate-700 italic">empty</span>}
                        </span>
                        {!variable.enabled && (
                          <span className="text-[8px] text-rose-500 font-bold uppercase tracking-wider">
                            DISABLED
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {matchedVariables.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-slate-650 italic">
                      No matching variables found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' &&
          history.map((item) => (
            <div
              key={item.id}
              onClick={() =>
                onSelectRequest({
                  method: item.method,
                  url: item.url,
                  name: 'Historical Request',
                  headers: item.headers,
                  body: item.body,
                })
              }
              className="flex items-center px-3 py-1.5 hover:bg-slate-800/40 rounded-md cursor-pointer group transition-all"
            >
              <span
                className={`w-10 font-black ${getMethodColor(item.method)} text-[9px] uppercase shrink-0`}
              >
                {item.method}
              </span>
              <span className="truncate text-[11px] text-slate-500 group-hover:text-slate-300">
                {item.url}
              </span>
            </div>
          ))}

        {activeTab === 'mocks' &&
          mocks.map((mock) => (
            <div
              key={mock.id}
              onClick={() => onSelectMock(mock)}
              className="flex items-center px-3 py-1.5 hover:bg-slate-800/40 rounded-md cursor-pointer group transition-all"
            >
              <span
                className={`w-10 font-black ${getMethodColor(mock.method)} text-[9px] uppercase shrink-0`}
              >
                {mock.method}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[11px] text-slate-300 font-medium">{mock.path}</span>
                <span className="text-[9px] text-slate-600 font-bold">
                  {mock.status} {mock.enabled ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

function getMethodColor(method: string) {
  switch (method) {
    case 'GET':
      return 'text-emerald-500';
    case 'POST':
      return 'text-amber-500';
    case 'PUT':
      return 'text-sky-500';
    case 'PATCH':
      return 'text-violet-500';
    case 'DELETE':
      return 'text-rose-500';
    default:
      return 'text-slate-500';
  }
}

export default Sidebar;
