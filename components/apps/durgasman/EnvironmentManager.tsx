import React from 'react';
import { Environment, EnvVariable } from './types';
import {
  Box,
  Plus,
  Trash2,
  Check,
  Info,
  Edit3,
  Copy,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Folder,
  BarChart as LucideBarChart,
  PieChart as LucidePieChart,
  Download,
  Upload,
} from 'lucide-react';

interface EnvironmentManagerProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  onSelectEnvironment: (id: string | null) => void;
  onUpdateEnvironment: (env: Environment) => void;
  onCreateEnvironment: () => void;
  onDeleteEnvironment: (id: string) => void;
  onClose: () => void;
}

const EnvironmentManager: React.FC<EnvironmentManagerProps> = ({
  environments,
  activeEnvironmentId,
  onSelectEnvironment,
  onUpdateEnvironment,
  onCreateEnvironment,
  onDeleteEnvironment,
  onClose,
}) => {
  const [selectedEnvId, setSelectedEnvId] = React.useState<string | null>(
    environments.length > 0 ? activeEnvironmentId || environments[0].id : null
  );

  const [editingNameId, setEditingNameId] = React.useState<string | null>(null);
  const [tempName, setTempName] = React.useState('');
  const [copiedKeyId, setCopiedKeyId] = React.useState<string | null>(null);
  const [showValues, setShowValues] = React.useState<Record<string, boolean>>({});
  const [selectedVarIds, setSelectedVarIds] = React.useState<string[]>([]);

  const selectedEnv = environments.find((e) => e.id === selectedEnvId) || null;

  const [analyticsTab, setAnalyticsTab] = React.useState<'types' | 'lengths'>('types');

  React.useEffect(() => {
    setSelectedVarIds([]);
  }, [selectedEnvId]);

  const chartData = React.useMemo(() => {
    if (!selectedEnv || selectedEnv.variables.length === 0) {
      return { lengths: [], types: [] };
    }

    let shortCount = 0;
    let mediumCount = 0;
    let longCount = 0;
    let heavyCount = 0;

    let endpoints = 0;
    let credentials = 0;
    let numericBool = 0;
    let plainText = 0;

    selectedEnv.variables.forEach((v) => {
      const key = v.key || '';
      const val = v.value || '';

      const len = key.length;
      if (len <= 5) shortCount++;
      else if (len <= 12) mediumCount++;
      else if (len <= 20) longCount++;
      else heavyCount++;

      const lowerKey = key.toLowerCase();
      const lowerVal = String(val).toLowerCase();

      if (
        lowerVal.startsWith('http://') ||
        lowerVal.startsWith('https://') ||
        lowerKey.includes('url') ||
        lowerKey.includes('host') ||
        lowerKey.includes('endpoint')
      ) {
        endpoints++;
      } else if (
        lowerKey.includes('key') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('pass') ||
        lowerKey.includes('cred')
      ) {
        credentials++;
      } else if (
        lowerVal === 'true' ||
        lowerVal === 'false' ||
        (!isNaN(Number(lowerVal)) && lowerVal.trim() !== '')
      ) {
        numericBool++;
      } else {
        plainText++;
      }
    });

    return {
      lengths: [
        { name: 'Short (1-5 chars)', count: shortCount, fill: '#f97316' },
        { name: 'Medium (6-12 chars)', count: mediumCount, fill: '#f59e0b' },
        { name: 'Long (13-20 chars)', count: longCount, fill: '#0ea5e9' },
        { name: 'Heavy (21+ chars)', count: heavyCount, fill: '#a855f7' },
      ].filter((item) => item.count > 0),
      types: [
        { name: 'Endpoints & URLs', value: endpoints, fill: '#10b981' },
        { name: 'Keys & Tokens', value: credentials, fill: '#ea580c' },
        { name: 'Constants & Options', value: numericBool, fill: '#3b82f6' },
        { name: 'Generic Strings', value: plainText, fill: '#64748b' },
      ].filter((item) => item.value > 0),
    };
  }, [selectedEnv]);

  React.useEffect(() => {
    if (environments.length > 0) {
      if (!selectedEnvId || !environments.some((e) => e.id === selectedEnvId)) {
        setSelectedEnvId(environments[0].id);
      }
    } else {
      setSelectedEnvId(null);
    }
  }, [environments, selectedEnvId]);

  const handleCreateNew = () => {
    onCreateEnvironment();
  };

  const handleStartRename = (env: Environment) => {
    setEditingNameId(env.id);
    setTempName(env.name);
  };

  const handleSaveRename = (env: Environment) => {
    if (!tempName.trim()) return;
    onUpdateEnvironment({ ...env, name: tempName.trim() });
    setEditingNameId(null);
  };

  const handleAddVariable = () => {
    if (!selectedEnv) return;
    const newVar: EnvVariable = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true,
    };
    onUpdateEnvironment({
      ...selectedEnv,
      variables: [...selectedEnv.variables, newVar],
    });
  };

  const handleUpdateVariable = (varId: string, field: keyof EnvVariable, value: any) => {
    if (!selectedEnv) return;
    const updatedVars = selectedEnv.variables.map((v) =>
      v.id === varId ? { ...v, [field]: value } : v
    );
    onUpdateEnvironment({
      ...selectedEnv,
      variables: updatedVars,
    });
  };

  const handleRemoveVariable = (varId: string) => {
    if (!selectedEnv) return;
    onUpdateEnvironment({
      ...selectedEnv,
      variables: selectedEnv.variables.filter((v) => v.id !== varId),
    });
    setSelectedVarIds((prev) => prev.filter((id) => id !== varId));
  };

  const handleBatchEnable = (enable: boolean) => {
    if (!selectedEnv) return;
    const updatedVars = selectedEnv.variables.map((v) =>
      selectedVarIds.includes(v.id) ? { ...v, enabled: enable } : v
    );
    onUpdateEnvironment({
      ...selectedEnv,
      variables: updatedVars,
    });
  };

  const handleBatchToggle = () => {
    if (!selectedEnv) return;
    const updatedVars = selectedEnv.variables.map((v) =>
      selectedVarIds.includes(v.id) ? { ...v, enabled: !v.enabled } : v
    );
    onUpdateEnvironment({
      ...selectedEnv,
      variables: updatedVars,
    });
  };

  const handleBatchDelete = () => {
    if (!selectedEnv) return;
    if (
      confirm(`Are you sure you want to delete the ${selectedVarIds.length} selected variables?`)
    ) {
      const updatedVars = selectedEnv.variables.filter((v) => !selectedVarIds.includes(v.id));
      onUpdateEnvironment({
        ...selectedEnv,
        variables: updatedVars,
      });
      setSelectedVarIds([]);
    }
  };

  const handleCopySnippet = (key: string, id: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const toggleShowValue = (id: string) => {
    setShowValues((p) => ({ ...p, [id]: !p[id] }));
  };

  const handleExportCSV = () => {
    if (!selectedEnv) return;
    const headers = ['key', 'value', 'enabled'];
    const rows = selectedEnv.variables.map((v) => [
      `"${(v.key || '').replace(/"/g, '""')}"`,
      `"${(v.value || '').replace(/"/g, '""')}"`,
      v.enabled ? 'true' : 'false',
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${selectedEnv.name ? selectedEnv.name.toLowerCase().replace(/\s+/g, '-') : 'environment'}-variables.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEnv) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines: string[][] = [];
        let currentLine: string[] = [];
        let currentCell = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              currentCell += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            currentLine.push(currentCell.trim());
            currentCell = '';
          } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
              i++;
            }
            currentLine.push(currentCell.trim());
            if (currentLine.length > 0 && currentLine.some((cell) => cell !== '')) {
              lines.push(currentLine);
            }
            currentLine = [];
            currentCell = '';
          } else {
            currentCell += char;
          }
        }

        if (currentCell || currentLine.length > 0) {
          currentLine.push(currentCell.trim());
          if (currentLine.some((cell) => cell !== '')) {
            lines.push(currentLine);
          }
        }

        if (lines.length < 2) {
          alert('CSV file is empty or does not contain data rows.');
          return;
        }

        const headers = lines[0].map((h) => h.toLowerCase());
        const keyIndex = headers.indexOf('key');
        const valueIndex = headers.indexOf('value');
        const enabledIndex = headers.indexOf('enabled');

        if (keyIndex === -1 && valueIndex === -1) {
          alert('CSV headers must include at least "key" or "value" columns.');
          return;
        }

        const importedVars: EnvVariable[] = [];
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          const key = keyIndex !== -1 && row[keyIndex] !== undefined ? row[keyIndex] : '';
          const value = valueIndex !== -1 && row[valueIndex] !== undefined ? row[valueIndex] : '';
          const enabledStr =
            enabledIndex !== -1 && row[enabledIndex] !== undefined
              ? row[enabledIndex].toLowerCase()
              : 'true';
          const enabled = enabledStr !== 'false';

          if (key || value) {
            importedVars.push({
              id: crypto.randomUUID(),
              key,
              value,
              enabled,
            });
          }
        }

        if (importedVars.length === 0) {
          alert('No valid variables found in CSV.');
          return;
        }

        const action = confirm(
          `Found ${importedVars.length} variables. Do you want to merge them into current variables? (Cancel to replace all current variables)`
        );
        let updatedVars: EnvVariable[] = [];
        if (action) {
          const currentVars = [...selectedEnv.variables];
          importedVars.forEach((newVar) => {
            const matchIndex = currentVars.findIndex((cv) => cv.key && cv.key === newVar.key);
            if (matchIndex !== -1 && newVar.key) {
              currentVars[matchIndex] = {
                ...currentVars[matchIndex],
                value: newVar.value,
                enabled: newVar.enabled,
              };
            } else {
              currentVars.push(newVar);
            }
          });
          updatedVars = currentVars;
        } else {
          updatedVars = importedVars;
        }

        onUpdateEnvironment({
          ...selectedEnv,
          variables: updatedVars,
        });

        e.target.value = '';
      } catch (err) {
        alert('Error parsing CSV file. Please make sure the structure is correct.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 font-sans">
      {/* ENVIRONMENTS SIDEBAR PANEL */}
      <div className="w-80 border-r border-slate-800 flex flex-col h-full bg-[#07090e] shrink-0">
        <div className="p-4 border-b border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Box size={16} className="text-orange-500" /> API Environments
            </h1>
            <button
              onClick={handleCreateNew}
              className="text-[10px] font-black text-white bg-orange-600 hover:bg-orange-500 px-2.5 py-1 rounded-md flex items-center gap-1 transition-all uppercase tracking-wider shadow-[0_0_12px_rgba(234,88,12,0.2)] cursor-pointer"
            >
              <Plus size={12} /> Add
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Create profiles with active values substituted dynamically as{' '}
            <code className="text-orange-400 font-bold">&#123;&#123;variable&#125;&#125;</code>{' '}
            inside URLs, Headers, and JSON bodies.
          </p>
        </div>

        {/* LIST ENVS */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {environments.map((env) => {
            const isSelected = env.id === selectedEnvId;
            const isActive = env.id === activeEnvironmentId;
            const isEditing = env.id === editingNameId;

            return (
              <div
                key={env.id}
                onClick={() => setSelectedEnvId(env.id)}
                className={`group p-3 rounded-lg cursor-pointer transition-all border flex flex-col gap-1.5 relative ${
                  isSelected
                    ? 'bg-orange-600/5 border-orange-500/30 shadow-[0_0_15px_rgba(234,88,12,0.03)]'
                    : 'bg-slate-900/20 hover:bg-slate-900/40 border-slate-900/40 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Box size={14} className={isActive ? 'text-orange-500' : 'text-slate-500'} />

                    {isEditing ? (
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={() => handleSaveRename(env)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(env);
                          if (e.key === 'Escape') setEditingNameId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-955 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 outline-none w-full"
                      />
                    ) : (
                      <span
                        className={`text-xs font-semibold truncate ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}
                      >
                        {env.name}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(env);
                        }}
                        className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300"
                        title="Rename profile"
                      >
                        <Edit3 size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove environment project context "${env.name}"?`)) {
                            onDeleteEnvironment(env.id);
                          }
                        }}
                        className="p-1 hover:bg-slate-805 rounded text-slate-500 hover:text-rose-400"
                        title="Delete profile"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">
                    {env.variables.length} Variable{env.variables.length === 1 ? '' : 's'}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEnvironment(isActive ? null : env.id);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-orange-600/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(234,88,12,0.1)]'
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {isActive ? 'ACTIVE' : 'ACTIVATE'}
                  </button>
                </div>
              </div>
            );
          })}

          {environments.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
              <Box size={32} className="text-slate-800 animate-pulse" />
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                  No environments
                </p>
                <p className="text-[10px] text-slate-650 max-w-[180px] mx-auto">
                  Create a profile to inject dynamic local constants.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT GRID WORKSPACE */}
      <div className="flex-1 flex flex-col h-full bg-[#0a0c10] overflow-hidden">
        {selectedEnv ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* ENVIRONMENT KEY EDITOR HEADER */}
            <div className="p-6 border-b border-slate-800 bg-[#08090d] flex items-center justify-between gap-4 shrink-0">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-805 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <Folder size={10} /> Profile Environment
                  </span>

                  {activeEnvironmentId === selectedEnv.id ? (
                    <span className="px-1.5 py-0.2 text-[8px] bg-orange-600/15 text-orange-400 border border-orange-500/20 rounded font-black uppercase tracking-widest animate-pulse">
                      ● active context
                    </span>
                  ) : (
                    <span
                      onClick={() => onSelectEnvironment(selectedEnv.id)}
                      className="px-1.5 py-0.2 text-[8px] bg-slate-900 text-slate-500 border border-slate-800 rounded font-bold uppercase tracking-widest cursor-pointer hover:border-slate-700 hover:text-slate-300"
                    >
                      select as active
                    </span>
                  )}
                </div>

                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  {selectedEnv.name}{' '}
                  <span className="text-[11px] font-normal text-slate-650">({selectedEnv.id})</span>
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="file"
                  id="csv-import-element"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />

                <button
                  onClick={() => document.getElementById('csv-import-element')?.click()}
                  className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-all uppercase tracking-wider cursor-pointer"
                  title="Import variables from a CSV file"
                >
                  <Upload size={13} className="text-orange-500" /> Import CSV
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-all uppercase tracking-wider cursor-pointer"
                  title="Export current environment variables to a CSV file"
                >
                  <Download size={13} className="text-orange-500" /> Export CSV
                </button>

                <button
                  onClick={handleAddVariable}
                  className="px-3.5 py-2 bg-slate-900 border border-slate-850 hover:border-slate-700 text-xs font-bold text-slate-200 hover:text-white rounded-lg flex items-center gap-1.5 transition-all uppercase tracking-wider cursor-pointer"
                >
                  <Plus size={13} className="text-orange-500" /> Add Variable row
                </button>
                <button
                  onClick={onClose}
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white rounded-lg flex items-center gap-1 transition-all uppercase tracking-wider shadow-lg hover:shadow-orange-500/10 cursor-pointer"
                >
                  Return to builder
                </button>
              </div>
            </div>

            {/* QUICK LEGEND */}
            <div className="px-6 py-3 bg-[#08090d]/40 border-b border-slate-900 text-[11px] text-slate-500 flex items-center gap-2 shrink-0">
              <Sparkles size={12} className="text-orange-500" />
              <span>
                Use double curly brackets syntax like <strong>&#123;&#123;key&#125;&#125;</strong>{' '}
                in URLs or payloads. Clicking the copy icon on any variable copies its ready code
                tag.
              </span>
            </div>

            {/* VARIABLES TABLE CARD */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* BATCH ACTIONS TOOLBAR */}
              {selectedVarIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-orange-600/10 border border-orange-500/20 rounded-xl shadow-[0_0_20px_rgba(234,88,12,0.05)] animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-orange-600 text-white font-black text-[10px] shadow-[0_0_10px_rgba(234,88,12,0.4)]">
                      {selectedVarIds.length}
                    </span>
                    <span className="text-[11px] font-bold text-slate-200 tracking-wide uppercase">
                      Selected for Batch Operations
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBatchEnable(true)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-705 rounded-lg text-[10px] font-black text-emerald-400 hover:text-emerald-300 transition-all uppercase tracking-wider shadow-sm cursor-pointer"
                    >
                      Enable Selected
                    </button>
                    <button
                      onClick={() => handleBatchEnable(false)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-855 border border-slate-800 hover:border-slate-705 rounded-lg text-[10px] font-black text-slate-400 hover:text-slate-300 transition-all uppercase tracking-wider shadow-sm cursor-pointer"
                    >
                      Disable Selected
                    </button>
                    <button
                      onClick={handleBatchToggle}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-855 border border-slate-800 hover:border-slate-705 rounded-lg text-[10px] font-black text-blue-400 hover:text-blue-300 transition-all uppercase tracking-wider shadow-sm cursor-pointer"
                    >
                      Invert Toggle
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      className="px-3 py-1.5 bg-rose-955/20 hover:bg-rose-900/40 border border-rose-900/30 hover:border-rose-705/55 rounded-lg text-[10px] font-black text-rose-400 hover:text-rose-300 transition-all uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Trash2 size={11} /> Delete ({selectedVarIds.length})
                    </button>
                    <button
                      onClick={() => setSelectedVarIds([])}
                      className="text-[10px] text-slate-500 hover:text-slate-300 underline font-semibold transition-colors ml-1 px-2 cursor-pointer"
                    >
                      Cancel selection
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-[#08090d] border border-slate-850 rounded-xl overflow-hidden shadow-2xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#050608] text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-850">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={
                            selectedEnv.variables.length > 0 &&
                            selectedVarIds.length === selectedEnv.variables.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVarIds(selectedEnv.variables.map((v) => v.id));
                            } else {
                              setSelectedVarIds([]);
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-900 text-orange-600 focus:ring-0 focus:ring-offset-0 cursor-pointer animate-none"
                        />
                      </th>
                      <th className="px-4 py-3 text-center w-12">State</th>
                      <th className="px-4 py-3 w-[260px]">Variable Variable Key</th>
                      <th className="px-4 py-3">Variable Current Value</th>
                      <th className="px-4 py-3 text-center w-16">Tag</th>
                      <th className="px-4 py-3 text-center w-12">Trash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {selectedEnv.variables.map((item) => {
                      const isSelected = selectedVarIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-900/15 transition-all ${isSelected ? 'bg-orange-600/[0.02]' : ''}`}
                        >
                          <td className="px-4 py-2 text-center bg-slate-950/20">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedVarIds((prev) => [...prev, item.id]);
                                } else {
                                  setSelectedVarIds((prev) => prev.filter((id) => id !== item.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-900 text-orange-600 focus:ring-0 focus:ring-offset-0 cursor-pointer animate-none"
                            />
                          </td>

                          <td className="px-4 py-2 bg-slate-950/40 text-center">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(e) =>
                                handleUpdateVariable(item.id, 'enabled', e.target.checked)
                              }
                              className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-900 text-orange-600 focus:ring-0 focus:ring-offset-0 cursor-pointer animate-none"
                            />
                          </td>

                          <td className="px-4 py-2 font-mono">
                            <input
                              type="text"
                              value={item.key}
                              onChange={(e) => handleUpdateVariable(item.id, 'key', e.target.value)}
                              placeholder="e.g. baseUrl"
                              className="bg-transparent text-slate-200 outline-none w-full border-b border-transparent focus:border-orange-500/20 pb-0.5 focus:text-orange-400 transition-all font-semibold"
                            />
                          </td>

                          <td className="px-4 py-2 font-mono relative group/row">
                            <div className="flex items-center gap-2">
                              <input
                                type={showValues[item.id] ? 'text' : 'password'}
                                value={item.value}
                                onChange={(e) =>
                                  handleUpdateVariable(item.id, 'value', e.target.value)
                                }
                                placeholder="e.g. value, bearer tokens..."
                                className="bg-transparent text-slate-300 outline-none w-full border-b border-transparent focus:border-orange-500/20 pb-0.5 transition-all"
                              />
                              <button
                                onClick={() => toggleShowValue(item.id)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-650 hover:text-slate-400 shrink-0 cursor-pointer"
                                title={showValues[item.id] ? 'Hide Secret' : 'Show Secret'}
                              >
                                {showValues[item.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-2 text-center">
                            {item.key ? (
                              <button
                                onClick={() => handleCopySnippet(item.key, item.id)}
                                className="p-1.5 hover:bg-slate-805 rounded transition-all text-slate-500 hover:text-orange-400 flex items-center justify-center mx-auto cursor-pointer"
                                title="Copy variable handle code tag"
                              >
                                {copiedKeyId === item.id ? (
                                  <Check size={12} className="text-emerald-500 animate-bounce" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-700 italic">-</span>
                            )}
                          </td>

                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handleRemoveVariable(item.id)}
                              className="p-1.5 hover:bg-slate-850 rounded text-slate-650 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Remove variable row"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {selectedEnv.variables.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 text-center text-slate-600 italic font-mono text-xs"
                        >
                          No variables configured in this environment profile. Hit &quot;Add
                          Variable row&quot; above to declare values.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ANALYTICS DASHBOARD & RESOLVER LAB GRID */}
              {selectedEnv.variables.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* METRIC CHARTS AND STATS */}
                  <div className="p-5 bg-[#08090d] border border-slate-850 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles size={14} className="text-orange-500" /> Environment Profile
                        Analytics
                      </h3>
                      <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        <button
                          onClick={() => setAnalyticsTab('types')}
                          className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                            analyticsTab === 'types'
                              ? 'bg-orange-600/10 text-orange-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <LucidePieChart size={10} /> Type Split
                        </button>
                        <button
                          onClick={() => setAnalyticsTab('lengths')}
                          className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                            analyticsTab === 'lengths'
                              ? 'bg-orange-600/10 text-orange-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <LucideBarChart size={10} /> Key Sizes
                        </button>
                      </div>
                    </div>

                    <div className="h-44 w-full flex items-center justify-center">
                      {analyticsTab === 'types' ? (
                        chartData.types.length > 0 ? (
                          <div className="w-full h-full flex flex-col justify-center gap-4">
                            <div className="h-3 w-full rounded-full bg-slate-900 overflow-hidden flex">
                              {chartData.types.map((t, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    width: `${(t.value / selectedEnv.variables.length) * 100}%`,
                                    backgroundColor: t.fill,
                                  }}
                                  title={`${t.name}: ${t.value}`}
                                />
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {chartData.types.map((t, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1.5 text-[10px] font-mono"
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: t.fill }}
                                  />
                                  <span className="text-slate-400 truncate">{t.name}</span>
                                  <span className="text-slate-200 font-bold ml-auto">
                                    {t.value} (
                                    {Math.round((t.value / selectedEnv.variables.length) * 100)}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] font-mono text-slate-505 italic">
                            No variables typed
                          </p>
                        )
                      ) : chartData.lengths.length > 0 ? (
                        <div className="w-full h-full flex flex-col justify-center gap-2">
                          {chartData.lengths.map((t, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                                <span>{t.name}</span>
                                <span className="text-slate-300 font-bold">{t.count}</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(t.count / selectedEnv.variables.length) * 100}%`,
                                    backgroundColor: t.fill,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] font-mono text-slate-505 italic">
                          No variables present for sizing
                        </p>
                      )}
                    </div>
                  </div>

                  {/* LIVE RESOLVER LAB */}
                  <div className="p-5 bg-[#08090d] border border-slate-850 rounded-xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-orange-500" /> Active Local
                        Resolution Preview Sandbox
                      </h3>
                      <p className="text-[11px] text-slate-505 leading-relaxed">
                        Verify substitution outputs by mapping defined variables dynamically inside
                        standard double curly bracket tags:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                          Input Raw Template URL
                        </span>
                        <div className="bg-slate-950 border border-slate-850 rounded-lg p-2.5 font-mono text-xs text-slate-400 truncate">
                          &#123;&#123;
                          {selectedEnv.variables.find((v) => v.key)?.key || 'variable'}
                          &#125;&#125;/posts/1
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                          Substituted Output Endpoint
                        </span>
                        <div className="bg-slate-950 border border-orange-500/20 rounded-lg p-2.5 font-mono text-xs text-orange-400 truncate font-semibold">
                          {selectedEnv.variables.find((v) => v.key)?.value ||
                            'http://placeholder-value'}
                          /posts/1
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="w-16 h-16 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex items-center justify-center text-slate-600 shadow-2xl">
              <Box size={28} className="text-slate-700 animate-pulse" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Select Environment Context
              </h2>
              <p className="text-xs text-slate-655 leading-relaxed">
                Choose an environment context on the left side or create a new profile to configure
                local dynamic parameter tables.
              </p>
              <button
                onClick={handleCreateNew}
                className="mt-2 text-xs font-black text-white bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-lg inline-flex items-center gap-1 transition-all uppercase tracking-wider shadow cursor-pointer"
              >
                <Plus size={14} /> Create New Environment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnvironmentManager;
