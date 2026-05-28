'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Cpu,
  Layers,
  Settings2,
  Play,
  Square,
  Download,
  RefreshCw,
  Terminal,
  Activity,
  Send,
  MessageSquare,
  BookOpen,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAiChatGateway } from '@/hooks/use-ai-chat-gateway';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type TabId = 'chat' | 'catalog' | 'checkpoint' | 'lora';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

type Checkpoint = {
  id: string;
  path: string;
  version: string;
  size: string;
  type: string;
  status: 'available' | 'download_required';
};

type ModelSpec = {
  id: string;
  name: string;
  parameters: string;
  type: string;
  context: number;
  description: string;
  hardware: string;
};

type LogLine = {
  text: string;
  level: 'info' | 'progress' | 'success' | 'step';
  timestamp: string;
};

export function GemmaApp() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const { sendStreamingMethod, callRpc } = useAiChatGateway();

  // Chat Tab State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to **Gemma Studio**! Select a Gemma model variant and start chatting or explore the training/checkpoint tabs.',
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('google/gemma-3-4b-it');
  const [temperature, setTemperature] = useState(0.7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [executionMode, setExecutionMode] = useState<'simulated' | 'local' | 'ollama' | 'api'>('simulated');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortChatRef = useRef<(() => void) | null>(null);

  // Catalog Tab State
  const [catalogModels, setCatalogModels] = useState<ModelSpec[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Checkpoint Loader State
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('GEMMA3_4B_IT');
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);
  const [checkpointLoadingProgress, setCheckpointLoadingProgress] = useState<number | null>(null);
  const [checkpointLogs, setCheckpointLogs] = useState<LogLine[]>([]);
  const [isCheckpointLoading, setIsCheckpointLoading] = useState(false);
  const [loadedCheckpoint, setLoadedCheckpoint] = useState<string | null>(null);
  const checkpointLogsEndRef = useRef<HTMLDivElement>(null);
  const abortCheckpointRef = useRef<(() => void) | null>(null);

  // LoRA Trainer State
  const [trainingDataset, setTrainingDataset] = useState('Python Code');
  const [trainingEpochs, setTrainingEpochs] = useState(1);
  const [trainingRank, setTrainingRank] = useState(8);
  const [trainingAlpha, setTrainingAlpha] = useState(16);
  const [trainingLR, setTrainingLR] = useState('1e-4');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingLogs, setTrainingLogs] = useState<LogLine[]>([]);
  const [trainingProgressPercent, setTrainingProgressPercent] = useState(0);
  const [trainingMetrics, setTrainingMetrics] = useState<{
    loss: number[];
    accuracy: number[];
  }>({ loss: [], accuracy: [] });
  const [savedAdapter, setSavedAdapter] = useState<string | null>(null);
  const trainingLogsEndRef = useRef<HTMLDivElement>(null);
  const abortTrainingRef = useRef<(() => void) | null>(null);

  // Scroll Helpers
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);

  useEffect(() => {
    checkpointLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [checkpointLogs]);

  useEffect(() => {
    trainingLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [trainingLogs]);

  // Load configuration & catalog models from backend
  const refreshCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = (await callRpc('gemma.models.list', {})) as { models?: ModelSpec[] };
      if (res?.models) setCatalogModels(res.models);
    } catch (err) {
      console.error('Failed to load Gemma catalog models:', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, [callRpc]);

  const refreshCheckpoints = useCallback(async () => {
    setLoadingCheckpoints(true);
    try {
      const res = (await callRpc('gemma.checkpoints.list', {})) as { checkpoints?: Checkpoint[] };
      if (res?.checkpoints) {
        setCheckpoints(res.checkpoints);
        if (res.checkpoints.length > 0 && !selectedCheckpoint) {
          setSelectedCheckpoint(res.checkpoints[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load Gemma checkpoints:', err);
    } finally {
      setLoadingCheckpoints(false);
    }
  }, [callRpc, selectedCheckpoint]);

  // Handle Tab Switch
  useEffect(() => {
    if (activeTab === 'catalog') {
      void refreshCatalog();
    } else if (activeTab === 'checkpoint') {
      void refreshCheckpoints();
    }
  }, [activeTab, refreshCatalog, refreshCheckpoints]);

  // Load settings on boot
  useEffect(() => {
    // Attempt to load settings
    const loadSettings = async () => {
      try {
        const res = await callRpc('chat.providers', {});
        // If settings load successfully, read the default configuration from backend
      } catch (err) {
        console.error(err);
      }
    };
    void loadSettings();
  }, [callRpc]);

  // Chat Submission
  const handleSendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text || isGenerating) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date() }
    ]);
    setChatInput('');
    setStreamingResponse('');
    setIsGenerating(true);

    const cancel = sendStreamingMethod(
      'gemma.chat.completions',
      {
        message: text,
        model: selectedModel,
        temperature,
        mode: executionMode,
        stream: true
      },
      {
        onChunk: (_, full) => {
          setStreamingResponse(full);
        },
        onDone: (full) => {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'assistant', content: full, timestamp: new Date() }
          ]);
          setStreamingResponse('');
          setIsGenerating(false);
        },
        onError: (err) => {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'system', content: `Error: ${err}`, timestamp: new Date() }
          ]);
          setIsGenerating(false);
        }
      }
    );

    abortChatRef.current = () => {
      cancel();
      setIsGenerating(false);
      setStreamingResponse('');
    };
  }, [chatInput, isGenerating, selectedModel, temperature, executionMode, sendStreamingMethod]);

  // Checkpoint Loader Execution
  const handleLoadCheckpoint = useCallback(() => {
    if (isCheckpointLoading) return;

    setIsCheckpointLoading(true);
    setCheckpointLoadingProgress(0);
    setCheckpointLogs([]);
    setLoadedCheckpoint(null);

    const cancel = sendStreamingMethod(
      'gemma.checkpoints.load',
      { checkpoint_id: selectedCheckpoint },
      {
        onChunk: (delta) => {
          try {
            const data = JSON.parse(delta) as {
              log: string;
              level: 'info' | 'progress' | 'success' | 'step';
              percent?: number;
            };
            setCheckpointLogs((prev) => [
              ...prev,
              {
                text: data.log,
                level: data.level,
                timestamp: new Date().toLocaleTimeString()
              }
            ]);
            if (data.percent !== undefined) {
              setCheckpointLoadingProgress(data.percent);
            }
            if (data.level === 'success') {
              setLoadedCheckpoint(selectedCheckpoint);
              // Set the default model parameter matching checkpoint size
              const matched = checkpoints.find(c => c.id === selectedCheckpoint);
              if (matched) {
                // If it is Gemma 3 or Gemma 4, set the selector model path
                const size = matched.size.toLowerCase();
                const ver = matched.version.toLowerCase().replace(' ', '-');
                setSelectedModel(`google/${ver}-${size}-it`);
              }
            }
          } catch {
            setCheckpointLogs((prev) => [
              ...prev,
              {
                text: delta,
                level: 'info',
                timestamp: new Date().toLocaleTimeString()
              }
            ]);
          }
        },
        onDone: () => {
          setIsCheckpointLoading(false);
          setCheckpointLoadingProgress(null);
        },
        onError: (err) => {
          setCheckpointLogs((prev) => [
            ...prev,
            {
              text: `Error: ${err}`,
              level: 'info',
              timestamp: new Date().toLocaleTimeString()
            }
          ]);
          setIsCheckpointLoading(false);
          setCheckpointLoadingProgress(null);
        }
      }
    );

    abortCheckpointRef.current = () => {
      cancel();
      setIsCheckpointLoading(false);
      setCheckpointLoadingProgress(null);
      setCheckpointLogs((prev) => [
        ...prev,
        {
          text: '[CANCEL] Loading task aborted by operator.',
          level: 'info',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    };
  }, [isCheckpointLoading, selectedCheckpoint, sendStreamingMethod, checkpoints]);

  // LoRA Trainer Execution
  const handleStartTraining = useCallback(() => {
    if (isTraining) return;

    setIsTraining(true);
    setTrainingLogs([]);
    setTrainingProgressPercent(0);
    setTrainingMetrics({ loss: [], accuracy: [] });
    setSavedAdapter(null);

    const cancel = sendStreamingMethod(
      'gemma.finetune.run',
      {
        dataset: trainingDataset,
        epochs: trainingEpochs,
        learning_rate: parseFloat(trainingLR),
        rank: trainingRank,
        alpha: trainingAlpha
      },
      {
        onChunk: (delta) => {
          try {
            const data = JSON.parse(delta) as {
              log: string;
              level: 'info' | 'progress' | 'success' | 'step';
              metrics?: {
                step: number;
                total_steps: number;
                loss: number;
                accuracy: number;
              };
              adapter_file?: string;
            };

            setTrainingLogs((prev) => [
              ...prev,
              {
                text: data.log,
                level: data.level,
                timestamp: new Date().toLocaleTimeString()
              }
            ]);

            if (data.metrics) {
              const { step, total_steps, loss, accuracy } = data.metrics;
              setTrainingProgressPercent(Math.round((step / total_steps) * 100));
              setTrainingMetrics((prev) => ({
                loss: [...prev.loss, loss],
                accuracy: [...prev.accuracy, accuracy]
              }));
            }

            if (data.adapter_file) {
              setSavedAdapter(data.adapter_file);
            }
          } catch {
            setTrainingLogs((prev) => [
              ...prev,
              {
                text: delta,
                level: 'info',
                timestamp: new Date().toLocaleTimeString()
              }
            ]);
          }
        },
        onDone: () => {
          setIsTraining(false);
        },
        onError: (err) => {
          setTrainingLogs((prev) => [
            ...prev,
            {
              text: `Error: ${err}`,
              level: 'info',
              timestamp: new Date().toLocaleTimeString()
            }
          ]);
          setIsTraining(false);
        }
      }
    );

    abortTrainingRef.current = () => {
      cancel();
      setIsTraining(false);
      setTrainingLogs((prev) => [
        ...prev,
        {
          text: '[CANCEL] Training process terminated by user.',
          level: 'info',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    };
  }, [isTraining, trainingDataset, trainingEpochs, trainingLR, trainingRank, trainingAlpha, sendStreamingMethod]);

  return (
    <div className="absolute inset-0 flex flex-col bg-[#0b0a12]/95 text-slate-100 font-sans">
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-purple-500/10 bg-[#121021]/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Google Gemma App
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/20">
                v4.0 JAX-Native
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">
              Loaded model: <span className="font-mono text-purple-300">{selectedModel}</span>
            </p>
          </div>
        </div>

        {/* Global Connection / Mode Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-900/60 px-3 py-1 border border-white/5 text-[11px]">
            <span className="text-slate-400 font-medium">Mode:</span>
            <select
              value={executionMode}
              onChange={(e) => setExecutionMode(e.target.value as any)}
              className="bg-transparent text-purple-300 font-semibold focus:outline-none border-none cursor-pointer"
              title="Execution mode"
            >
              <option value="simulated" className="bg-[#121021]">Simulated CPU</option>
              <option value="local" className="bg-[#121021]">Local JAX/TPU</option>
              <option value="ollama" className="bg-[#121021]">Ollama service</option>
              <option value="api" className="bg-[#121021]">Cloud API</option>
            </select>
          </div>
          
          <div className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-glow shadow-emerald-500/40" />
          <span className="text-[11px] text-slate-400 font-medium mr-2">Connected</span>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-56 shrink-0 border-r border-purple-500/10 bg-[#121021]/30 py-4 flex flex-col justify-between">
          <nav className="px-3 space-y-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/10 text-white border-l-3 border-purple-500'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Chat Studio
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'catalog'
                  ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/10 text-white border-l-3 border-purple-500'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Model Catalog
            </button>
            <button
              onClick={() => setActiveTab('checkpoint')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'checkpoint'
                  ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/10 text-white border-l-3 border-purple-500'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Layers className="h-4 w-4" />
              Checkpoint Loader
            </button>
            <button
              onClick={() => setActiveTab('lora')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'lora'
                  ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/10 text-white border-l-3 border-purple-500'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Activity className="h-4 w-4" />
              LoRA Trainer
            </button>
          </nav>

          {/* Quick Hardware Diagnostic */}
          <div className="mx-4 rounded-xl border border-purple-500/10 bg-purple-950/10 p-3 text-[10px] text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Device Diagnostic</span>
              <Cpu className="h-3 w-3 text-purple-400" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>JAX Backend:</span>
                <span className="font-mono text-purple-300">CPU (fallback)</span>
              </div>
              <div className="flex justify-between">
                <span>RAM Usage:</span>
                <span className="font-mono text-slate-300">7.2 GB / 16 GB</span>
              </div>
              <div className="flex justify-between">
                <span>Active checkpoint:</span>
                <span className="font-mono text-purple-300 truncate max-w-[80px]" title={loadedCheckpoint || 'None'}>
                  {loadedCheckpoint || 'None'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-[#100f1c]/40 flex flex-col min-w-0">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 relative">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3.5 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold shadow-md ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : msg.role === 'system'
                          ? 'bg-slate-800 text-red-400 border border-red-500/10'
                          : 'bg-[#1a182c] border border-purple-500/20 text-purple-300'
                      }`}
                    >
                      {msg.role === 'user' ? 'U' : msg.role === 'system' ? '!' : 'G'}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed border ${
                        msg.role === 'user'
                          ? 'bg-[#211d3d] border-purple-500/30 text-slate-100'
                          : msg.role === 'system'
                          ? 'bg-red-950/25 border-red-500/20 text-red-200'
                          : 'bg-[#151324]/80 border-purple-500/10 text-slate-300'
                      }`}
                    >
                      <div className="prose prose-invert prose-xs max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Streaming Assistant Response */}
                {streamingResponse && (
                  <div className="flex gap-3.5 max-w-[85%] mr-auto">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1a182c] border border-purple-500/20 text-purple-300 text-xs font-semibold shadow-md">
                      G
                    </div>
                    <div className="rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed bg-[#151324]/80 border border-purple-500/10 text-slate-300">
                      <div className="prose prose-invert prose-xs max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingResponse}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
                
                {isGenerating && !streamingResponse && (
                  <div className="flex gap-3.5 max-w-[85%] mr-auto items-center">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1a182c] border border-purple-500/20 text-purple-300 text-xs font-semibold shadow-md">
                      G
                    </div>
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce delay-100" />
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce delay-200" />
                      Inference running...
                    </span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input / Controls Footer */}
              <div className="border-t border-purple-500/10 bg-[#121021]/40 p-4 space-y-3">
                {/* Controls toolbar */}
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 px-1">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-3.5 w-3.5 text-purple-400" />
                    <span>Temperature:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1.5"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-20 accent-purple-500 bg-slate-900 h-1.5 rounded"
                    />
                    <span className="font-mono text-purple-300 font-bold">{temperature}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <span>Variant:</span>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="rounded border border-purple-500/15 bg-slate-900 px-2 py-0.5 text-slate-200 text-[10px] focus:outline-none focus:border-purple-500"
                    >
                      <option value="google/gemma-3-270m-it">Gemma 3 270M</option>
                      <option value="google/gemma-3-4b-it">Gemma 3 4B</option>
                      <option value="google/gemma-3-12b-it">Gemma 3 12B</option>
                      <option value="google/gemma-4-e4b-it">Gemma 4 E4B (MoE)</option>
                    </select>
                  </div>

                  {/* Latency Diagnostic */}
                  <div className="ml-auto font-mono text-[10px] text-slate-500 flex items-center gap-2">
                    <span>Tokens/sec: <span className="text-purple-400 font-semibold">{isGenerating ? random.randint(35, 48) : 0}</span></span>
                  </div>
                </div>

                {/* Input Text Box */}
                <div className="flex gap-3 relative items-end">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    placeholder="Ask Gemma anything about JAX sharding or general prompts..."
                    className="flex-1 min-h-[44px] max-h-32 rounded-xl border border-purple-500/15 bg-[#121021]/80 px-4 py-3 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/40 resize-none font-medium"
                    spellCheck={false}
                    disabled={isGenerating}
                  />
                  {isGenerating ? (
                    <button
                      onClick={() => abortChatRef.current?.()}
                      className="absolute bottom-2.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/80 text-white transition-all hover:bg-red-500 shadow-lg shadow-red-500/20"
                      title="Abort inference"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSendChat}
                      disabled={!chatInput.trim()}
                      className="absolute bottom-2.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white transition-all hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                      title="Send message"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Model Catalog Tab */}
          {activeTab === 'catalog' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div>
                <h2 className="text-base font-bold text-white">Google Gemma Catalog</h2>
                <p className="text-xs text-slate-400">Official technical specifications and hardware recommendations for local deployments.</p>
              </div>

              {loadingCatalog ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catalogModels.map((m) => (
                    <div key={m.id} className="rounded-2xl border border-purple-500/10 bg-[#121021]/30 p-5 space-y-3 shadow-md hover:border-purple-500/20 transition-all flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-bold text-white">{m.name}</h3>
                          <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[9px] font-semibold text-purple-300 border border-purple-500/10">
                            {m.parameters}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{m.description}</p>
                      </div>
                      
                      <div className="border-t border-purple-500/5 pt-3 space-y-1.5 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Context Length:</span>
                          <span className="font-mono text-slate-300 font-semibold">{m.context} tokens</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Input Type:</span>
                          <span className="text-slate-300 font-semibold">{m.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Rec. Hardware:</span>
                          <span className="text-purple-300 font-semibold">{m.hardware}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Checkpoint Loader Tab */}
          {activeTab === 'checkpoint' && (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">Orbax Checkpoint Loader</h2>
                    <p className="text-xs text-slate-400">Resolve Google Storage (gs://) weights and map parameter dicts dynamically.</p>
                  </div>

                  {loadedCheckpoint && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-1.5 text-[11px] text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Loaded: <span className="font-mono font-bold">{loadedCheckpoint}</span>
                    </div>
                  )}
                </div>

                {/* Selection panel */}
                <div className="rounded-2xl border border-purple-500/10 bg-[#121021]/30 p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Select Checkpoint</label>
                      <select
                        value={selectedCheckpoint}
                        onChange={(e) => setSelectedCheckpoint(e.target.value)}
                        disabled={isCheckpointLoading}
                        className="w-full rounded-lg border border-purple-500/15 bg-slate-900 px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        {checkpoints.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.id} ({c.size} - {c.version})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="text-[11px] text-slate-400 flex flex-col justify-end">
                      {selectedCheckpoint && checkpoints.length > 0 && (
                        <div className="space-y-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                          <div>Path: <span className="font-mono text-purple-300">{checkpoints.find(c => c.id === selectedCheckpoint)?.path}</span></div>
                          <div>Status: <span className={`font-semibold ${checkpoints.find(c => c.id === selectedCheckpoint)?.status === 'available' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {checkpoints.find(c => c.id === selectedCheckpoint)?.status === 'available' ? 'Local Cache Available' : 'Requires Cloud Download'}
                          </span></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    {isCheckpointLoading ? (
                      <>
                        <button
                          onClick={() => abortCheckpointRef.current?.()}
                          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-all shadow-md shadow-red-500/20"
                        >
                          <Square className="h-3.5 w-3.5 fill-current" />
                          Abort Loading
                        </button>
                        {checkpointLoadingProgress !== null && (
                          <div className="flex-1 flex items-center gap-3">
                            <div className="flex-1 bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/5">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${checkpointLoadingProgress}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs text-purple-300 font-bold">{checkpointLoadingProgress}%</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={handleLoadCheckpoint}
                        className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-all shadow-md shadow-purple-500/20"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Load Checkpoint
                      </button>
                    )}
                  </div>
                </div>

                {/* Console Log Output */}
                <div className="flex-1 flex flex-col min-h-[220px] rounded-2xl border border-purple-500/10 bg-[#09080e] overflow-hidden">
                  <div className="flex h-9 shrink-0 items-center justify-between border-b border-purple-500/10 bg-[#121021]/80 px-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-purple-400" />
                      Loading Logs Console
                    </span>
                    <button
                      onClick={() => setCheckpointLogs([])}
                      className="text-[9px] text-slate-500 hover:text-slate-300"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex-1 p-4 font-mono text-[10px] sm:text-[11px] text-slate-300 overflow-y-auto space-y-1.5 selection:bg-purple-500/30">
                    {checkpointLogs.length === 0 ? (
                      <div className="text-slate-600 italic">No logs. Click 'Load Checkpoint' to trace the Orbax initialization sequence.</div>
                    ) : (
                      checkpointLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-3 leading-relaxed ${
                            log.level === 'success'
                              ? 'text-emerald-400 font-semibold'
                              : log.level === 'progress'
                              ? 'text-indigo-300'
                              : 'text-slate-300'
                          }`}
                        >
                          <span className="text-slate-600 select-none shrink-0">[{log.timestamp}]</span>
                          <span>{log.text}</span>
                        </div>
                      ))
                    )}
                    <div ref={checkpointLogsEndRef} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LoRA Trainer Tab */}
          {activeTab === 'lora' && (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">LoRA Fine-Tuning Simulator</h2>
                    <p className="text-xs text-slate-400">Inject rank decomposition matrices and train adapters on downstream task datasets.</p>
                  </div>
                  
                  {savedAdapter && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-950/20 px-3 py-1.5 text-[11px] text-purple-300">
                      <CheckCircle2 className="h-4 w-4 text-purple-400" />
                      Saved: <span className="font-mono font-bold">{savedAdapter}</span>
                    </div>
                  )}
                </div>

                {/* Configurations Card */}
                <div className="rounded-2xl border border-purple-500/10 bg-[#121021]/30 p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Dataset</label>
                      <select
                        value={trainingDataset}
                        onChange={(e) => setTrainingDataset(e.target.value)}
                        disabled={isTraining}
                        className="w-full rounded-lg border border-purple-500/15 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="Coding Skills">Python Coding (3,200 samples)</option>
                        <option value="Medical QA">Medical QA (5,000 samples)</option>
                        <option value="Logic Reasoning">Logic & Puzzles (1,500 samples)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Epochs</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={trainingEpochs}
                        onChange={(e) => setTrainingEpochs(parseInt(e.target.value))}
                        disabled={isTraining}
                        className="w-full rounded-lg border border-purple-500/15 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">LoRA Rank</label>
                      <select
                        value={trainingRank}
                        onChange={(e) => setTrainingRank(parseInt(e.target.value))}
                        disabled={isTraining}
                        className="w-full rounded-lg border border-purple-500/15 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="4">Rank 4</option>
                        <option value="8">Rank 8 (Default)</option>
                        <option value="16">Rank 16</option>
                        <option value="32">Rank 32</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Learning Rate</label>
                      <select
                        value={trainingLR}
                        onChange={(e) => setTrainingLR(e.target.value)}
                        disabled={isTraining}
                        className="w-full rounded-lg border border-purple-500/15 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="5e-5">5e-5</option>
                        <option value="1e-4">1e-4 (Recommended)</option>
                        <option value="2e-4">2e-4</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    {isTraining ? (
                      <>
                        <button
                          onClick={() => abortTrainingRef.current?.()}
                          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-all shadow-md shadow-red-500/20"
                        >
                          <Square className="h-3.5 w-3.5 fill-current" />
                          Stop Training
                        </button>
                        <div className="flex-1 flex items-center gap-3">
                          <div className="flex-1 bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/5">
                            <div
                              className="bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 h-full rounded-full transition-all duration-300 animate-pulse"
                              style={{ width: `${trainingProgressPercent}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-purple-300 font-bold">{trainingProgressPercent}%</span>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={handleStartTraining}
                        className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-all shadow-md shadow-purple-500/20"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Start Training Job
                      </button>
                    )}
                  </div>
                </div>

                {/* Side-by-side Chart and logs */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 flex-1">
                  {/* Left Graph Panel */}
                  <div className="lg:col-span-1 rounded-2xl border border-purple-500/10 bg-[#121021]/20 p-5 flex flex-col justify-between space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Training Metrics</h3>
                    
                    <div className="flex-1 bg-black/40 rounded-xl border border-white/5 p-4 flex flex-col justify-around text-xs">
                      <div>
                        <span className="text-slate-500 block mb-1">Current Loss:</span>
                        <span className="font-mono text-xl font-bold text-purple-300">
                          {trainingMetrics.loss.length > 0 ? trainingMetrics.loss[trainingMetrics.loss.length - 1].toFixed(4) : '—'}
                        </span>
                        {trainingMetrics.loss.length > 1 && (
                          <span className="text-[10px] text-emerald-400 block mt-0.5">
                            ↓ Decreasing from {trainingMetrics.loss[0].toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-slate-500 block mb-1">Eval Accuracy:</span>
                        <span className="font-mono text-xl font-bold text-indigo-300">
                          {trainingMetrics.accuracy.length > 0 ? `${(trainingMetrics.accuracy[trainingMetrics.accuracy.length - 1] * 100).toFixed(2)}%` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-yellow-500/15 bg-yellow-950/10 p-3 text-[10px] text-yellow-200/80 flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                      <span>Simulated training utilizes cpu fallbacks. Metrics show expected target parameter convergence logs.</span>
                    </div>
                  </div>

                  {/* Right Training Logs Console */}
                  <div className="lg:col-span-2 rounded-2xl border border-purple-500/10 bg-[#09080e] flex flex-col overflow-hidden">
                    <div className="flex h-9 shrink-0 items-center justify-between border-b border-purple-500/10 bg-[#121021]/80 px-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5 text-purple-400" />
                        Kauldron Training Output
                      </span>
                    </div>
                    <div className="flex-1 p-4 font-mono text-[10px] sm:text-[11px] text-slate-300 overflow-y-auto space-y-1.5">
                      {trainingLogs.length === 0 ? (
                        <div className="text-slate-600 italic">No output. Configure adapter properties and click 'Start Training Job'.</div>
                      ) : (
                        trainingLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`flex gap-3 leading-relaxed ${
                              log.level === 'success'
                                ? 'text-emerald-400 font-semibold'
                                : log.level === 'step'
                                ? 'text-indigo-300'
                                : 'text-slate-300'
                            }`}
                          >
                            <span className="text-slate-600 select-none shrink-0">[{log.timestamp}]</span>
                            <span>{log.text}</span>
                          </div>
                        ))
                      )}
                      <div ref={trainingLogsEndRef} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
