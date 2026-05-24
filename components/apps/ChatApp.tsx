'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
  CHAT_CONVERSATION,
  CHAT_CONVERSATIONS,
  DELETE_CONVERSATION,
  ME,
} from '@/lib/graphql-modules';
import { useAiChatGateway } from '@/hooks/use-ai-chat-gateway';
import { useWindowLaunch } from '@/components/window-launch-context';
import { getThreadTitle, removeThreadTitle, setThreadTitle } from '@/lib/chat-thread-titles';
import { CHAT_PROMPT_TEMPLATES } from '@/components/apps/chat/templates';
import { NavItem, ProjectCard, PromptCard } from '@/components/apps/chat/presentational';
import {
  ClipboardList,
  Code,
  Copy,
  FileText,
  Folder,
  HelpCircle,
  Hexagon,
  LayoutTemplate,
  Loader2,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Square,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DEFAULT_MODEL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CHAT_MODEL?.trim()) ||
  'steamdj/llama3.1-cpu-only';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

function parseConversationPayload(raw: unknown): UiMessage[] {
  if (!raw || typeof raw !== 'object') return [];
  const messages = (raw as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return [];
  return messages.map((msg, i) => {
    const o = msg as { role?: string; content?: string; timestamp?: string };
    const role =
      o.role === 'assistant' || o.role === 'user' || o.role === 'system' ? o.role : 'user';
    return {
      id: `${role}-${i}-${o.timestamp ?? ''}`,
      role,
      content: typeof o.content === 'string' ? o.content : '',
    };
  });
}

type ConvRow = { id: string; message_count?: number; updated_at?: string | null };

function parseConversationsList(raw: unknown): ConvRow[] {
  if (!raw || typeof raw !== 'object') return [];
  const inner = raw as { conversations?: unknown };
  if (!Array.isArray(inner.conversations)) return [];
  return inner.conversations.filter(
    (x): x is ConvRow =>
      Boolean(x) && typeof x === 'object' && typeof (x as ConvRow).id === 'string'
  );
}

function titleFromFirstMessage(text: string): string {
  const t = text.trim();
  if (!t) return 'New thread';
  return t.length > 40 ? `${t.slice(0, 37)}...` : t;
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm prose-pre:border prose-pre:border-[#27272a] prose-pre:bg-[#18181b]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export function ChatApp() {
  const { sendCompletion, abortActiveRequests } = useAiChatGateway();
  const launchOptions = useWindowLaunch();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('chatThread');
  });

  useEffect(() => {
    const threadId = launchOptions?.chatThreadId;
    if (threadId) {
      queueMicrotask(() => {
        setActiveThreadId(threadId);
      });
    }
  }, [launchOptions?.chatThreadId]);

  const [inputValue, setInputValue] = useState('');
  const [think, setThink] = useState(false);
  const [deepSearch, setDeepSearch] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [optimisticUser, setOptimisticUser] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [searchThreadQuery, setSearchThreadQuery] = useState('');
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [editThreadTitle, setEditThreadTitle] = useState('');
  const [threadToDelete, setThreadToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    messageId: string;
    x: number;
    y: number;
    content: string;
  } | null>(null);
  const [titleVersion, setTitleVersion] = useState(0);
  /** Skip GraphQL get until first exchange persisted (new UUIDs 404 until then). */
  const [skipConversationFetch, setSkipConversationFetch] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  const me = useQuery(ME);
  const conversationsQ = useQuery(CHAT_CONVERSATIONS, { variables: { limit: 50 } });
  const conversationQ = useQuery(CHAT_CONVERSATION, {
    variables: { conversationId: activeThreadId ?? '' },
    skip: !activeThreadId || skipConversationFetch,
  });
  const [deleteConversationMut] = useMutation(DELETE_CONVERSATION);

  const serverRows = useMemo(
    () => parseConversationsList(conversationsQ.data?.chatConversations),
    [conversationsQ.data?.chatConversations]
  );

  const serverMessages = useMemo(
    () => parseConversationPayload(conversationQ.data?.chatConversation),
    [conversationQ.data?.chatConversation]
  );

  const displayMessages = useMemo(() => {
    const rows: UiMessage[] = [...serverMessages];
    if (optimisticUser) {
      const hasUser = rows.some((m) => m.role === 'user' && m.content === optimisticUser);
      if (!hasUser) {
        rows.push({ id: 'optimistic-user', role: 'user', content: optimisticUser });
      }
    }
    if (streamingContent) {
      rows.push({ id: 'streaming-assistant', role: 'assistant', content: streamingContent });
    }
    return rows;
  }, [serverMessages, optimisticUser, streamingContent]);

  const scrollToBottom = useCallback(() => {
    const pane = messagesScrollRef.current;
    if (pane) {
      // During streaming, many updates fire; smooth scroll stacks and can feel like the layout shifts.
      const behavior = streamingContent.length > 0 ? 'auto' : 'smooth';
      pane.scrollTo({ top: pane.scrollHeight, behavior });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [streamingContent]);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length, streamingContent, scrollToBottom]);

  useEffect(() => {
    const onClick = () => setContextMenu(null);
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {
      SpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult:
          | ((ev: {
              resultIndex: number;
              results: {
                length: number;
                [i: number]: { isFinal: boolean; [0]: { transcript: string } };
              };
            }) => void)
          | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult:
          | ((ev: {
              resultIndex: number;
              results: {
                length: number;
                [i: number]: { isFinal: boolean; [0]: { transcript: string } };
              };
            }) => void)
          | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInputValue((prev) => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  const refreshLists = useCallback(async () => {
    await Promise.all([
      conversationsQ.refetch(),
      activeThreadId ? conversationQ.refetch() : Promise.resolve(),
    ]);
  }, [conversationsQ, conversationQ, activeThreadId]);

  const handleShare = useCallback(() => {
    if (!activeThreadId) return;
    const url = `${window.location.origin}${window.location.pathname}?chatThread=${activeThreadId}`;
    void navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [activeThreadId]);

  const handleRenameThread = useCallback((id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setThreadTitle(id, newTitle.trim());
    setRenamingThreadId(null);
    setTitleVersion((v) => v + 1);
  }, []);

  const handleDeleteThread = useCallback(async () => {
    if (!threadToDelete) return;
    try {
      await deleteConversationMut({ variables: { conversationId: threadToDelete.id } });
      removeThreadTitle(threadToDelete.id);
      if (activeThreadId === threadToDelete.id) setActiveThreadId(null);
      setThreadToDelete(null);
      setOptimisticUser(null);
      setStreamingContent('');
      await refreshLists();
    } catch {
      setThreadToDelete(null);
    }
  }, [threadToDelete, deleteConversationMut, activeThreadId, refreshLists]);

  const toggleListening = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) {
      window.alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      r.stop();
      setIsListening(false);
    } else {
      try {
        r.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  }, [isListening]);

  const handleSendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    if (text.length > 4000) {
      window.alert('Message is too long. Maximum allowed length is 4000 characters.');
      return;
    }

    let threadId = activeThreadId;
    if (!threadId) {
      threadId = crypto.randomUUID();
      setSkipConversationFetch(true);
      setActiveThreadId(threadId);
      setThreadTitle(threadId, titleFromFirstMessage(text));
      setTitleVersion((v) => v + 1);
    } else if (!getThreadTitle(threadId)) {
      setThreadTitle(threadId, titleFromFirstMessage(text));
      setTitleVersion((v) => v + 1);
    }

    setInputValue('');
    setStreamError(null);
    setOptimisticUser(text);
    setStreamingContent('');
    setIsStreaming(true);

    sendCompletion(
      {
        message: text,
        think,
        deepSearch,
        model,
        conversationId: threadId,
      },
      {
        onChunk: (_d, full) => setStreamingContent(full),
        onDone: async (full) => {
          setStreamingContent(full);
          setIsStreaming(false);
          setOptimisticUser(null);
          setStreamingContent('');
          setSkipConversationFetch(false);
          await refreshLists();
        },
        onError: (msg) => {
          setStreamError(msg);
          setIsStreaming(false);
          setOptimisticUser(null);
          setStreamingContent('');
          setSkipConversationFetch(false);
        },
        onAborted: () => {
          setIsStreaming(false);
          setOptimisticUser(null);
          setStreamingContent('');
          setSkipConversationFetch(false);
        },
      }
    );
  }, [
    inputValue,
    isStreaming,
    activeThreadId,
    think,
    deepSearch,
    model,
    sendCompletion,
    refreshLists,
  ]);

  const threadLabel = useCallback(
    (id: string) => {
      void titleVersion;
      return getThreadTitle(id) ?? id.slice(0, 8);
    },
    [titleVersion]
  );

  const filteredThreads = serverRows.filter((t) =>
    threadLabel(t.id).toLowerCase().includes(searchThreadQuery.toLowerCase())
  );

  const userEmail = me.data?.me?.email;
  const userInitial = (userEmail?.charAt(0) ?? '?').toUpperCase();

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#09090b] font-sans text-[#e4e4e7]">
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#27272a] bg-[#121214] py-4 sm:w-[240px] lg:w-[260px]">
        <div className="flex flex-col gap-5 px-3">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 px-2 text-left"
            onClick={() => setActiveThreadId(null)}
          >
            <Hexagon className="h-6 w-6 fill-white text-white" />
            <span className="text-lg font-bold tracking-tight text-white">DurgasOS</span>
            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded border border-[#3f3f46] bg-[#27272a]">
              <span className="h-0.5 w-2.5 rounded-full bg-white" />
            </span>
          </button>

          <div className="relative group">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52525b]" />
            <input
              type="search"
              placeholder="Search workspaces"
              className="w-full rounded-lg border border-[#27272a] bg-[#18181b] py-2.5 pl-9 pr-10 text-sm text-[#e4e4e7] shadow-sm placeholder:text-[#52525b] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[#3f3f46] bg-[#27272a] px-1.5 py-0.5 text-[10px] font-medium text-[#71717a]">
              ⌘K
            </span>
          </div>

          <nav className="flex flex-col gap-1">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#52525b]">
              Workspace
            </p>
            <NavItem
              icon={<MessageSquare className="h-4 w-4" />}
              label="Conversations"
              active
              badge="AI"
            />
            <NavItem icon={<Folder className="h-4 w-4" />} label="Projects" />
            <button
              type="button"
              className="text-left"
              aria-label="Open template library"
              onClick={() => setShowTemplatesModal(true)}
            >
              <NavItem icon={<LayoutTemplate className="h-4 w-4" />} label="Templates" />
            </button>
            <NavItem icon={<FileText className="h-4 w-4" />} label="Documents" />
            <NavItem
              icon={<Users className="h-4 w-4" />}
              label="Team"
              actionIcon={<Plus className="h-3.5 w-3.5" />}
            />
            <NavItem icon={<RotateCcw className="h-4 w-4" />} label="History" />
            <div className="mt-3 flex flex-col gap-1 border-t border-[#27272a] pt-3">
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#52525b]">
                Settings & Help
              </p>
              <NavItem icon={<Settings className="h-4 w-4" />} label="Settings" />
              <NavItem icon={<HelpCircle className="h-4 w-4" />} label="Help" />
            </div>
          </nav>
        </div>
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-transparent">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-[#27272a] bg-[#09090b]/80 px-4 backdrop-blur-md sm:h-[72px] sm:px-8">
          <h1 className="text-lg font-semibold text-[#e4e4e7] sm:text-xl">AI Chat</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            {activeThreadId ? (
              <div className="mr-1 flex h-9 items-center overflow-hidden rounded-[5px] border border-[#27272a] bg-[#18181b] text-xs shadow-sm sm:mr-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex h-full items-center gap-1.5 px-3 font-medium text-[#a1a1aa] transition-colors hover:text-white"
                >
                  {isCopied ? (
                    <Copy className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  {isCopied ? 'Copied' : 'Share'}
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div ref={messagesScrollRef} className="min-h-0 flex-1 overflow-y-auto p-0">
          {!activeThreadId &&
          displayMessages.filter((m) => m.id !== 'streaming-assistant').length === 0 ? (
            <div className="-mt-8 flex h-full flex-col items-center justify-center text-center">
              <h2 className="mb-3 text-3xl font-bold tracking-tight text-[#e4e4e7] sm:text-[44px]">
                Welcome to DurgasOS AI
              </h2>
              <p className="mb-8 text-[15px] font-medium text-[#71717a]">
                Start a conversation backed by your ai.backend. Threads sync to server memory;
                titles stay on this device.
              </p>
              <div className="grid w-full grid-cols-1 gap-3 px-[5px] sm:grid-cols-2">
                <PromptCard
                  icon={<ClipboardList className="h-4 w-4 text-orange-500" />}
                  iconBg="bg-orange-100"
                  title="Write copy"
                  onClick={() => setInputValue('Write copy for ')}
                />
                <PromptCard
                  icon={<Sparkles className="h-4 w-4 text-blue-500" />}
                  iconBg="bg-blue-100"
                  title="Brainstorm"
                  onClick={() => setInputValue('Brainstorm ideas for ')}
                />
                <PromptCard
                  icon={<UserCircle className="h-4 w-4 text-green-600" />}
                  iconBg="bg-green-100/80"
                  title="Explain simply"
                  onClick={() => setInputValue('Explain in simple terms: ')}
                />
                <PromptCard
                  icon={<Code className="h-4 w-4 text-pink-500" />}
                  iconBg="bg-pink-100"
                  title="Write code"
                  onClick={() => setInputValue('Write a Next.js component to ')}
                />
              </div>
            </div>
          ) : (
            <div className="mx-0 mb-[100px] flex w-full flex-col gap-6 overflow-hidden px-[10px] pb-[100px]">
              {conversationsQ.error ? (
                <p className="text-sm text-red-400">Could not load conversations.</p>
              ) : null}
              {conversationQ.error && activeThreadId ? (
                <p className="text-sm text-red-400">Could not load this thread.</p>
              ) : null}
              {streamError ? <p className="text-sm text-red-400">{streamError}</p> : null}

              {displayMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role !== 'user' ? (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-600/20 text-xs shadow-sm">
                      <Hexagon className="h-4 w-4 text-indigo-400" />
                    </div>
                  ) : null}
                  <div
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        messageId: message.id,
                        x: e.clientX,
                        y: e.clientY,
                        content: message.content,
                      });
                    }}
                    className={
                      message.role === 'user'
                        ? 'relative whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-[#3f3f46] bg-[#27272a] px-5 py-3 text-sm leading-relaxed text-[#e4e4e7]'
                        : 'relative py-2 text-sm leading-relaxed text-[#a1a1aa]'
                    }
                  >
                    <MarkdownBody content={message.content} />
                  </div>
                  {message.role === 'user' ? (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#3f3f46] bg-[#27272a] text-xs font-bold text-[#a1a1aa]">
                      {userInitial}
                    </div>
                  ) : null}
                </div>
              ))}

              {isStreaming && !streamingContent ? (
                <div className="flex gap-4 justify-start">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-600/20 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  </div>
                  <p className="text-sm text-[#71717a]">Thinking…</p>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-row flex-wrap items-center justify-start bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent p-0">
          <div className="pointer-events-auto w-full">
            <div className="relative rounded-none border border-[#27272a] bg-[#18181b] p-4 shadow-2xl">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputValue.trim() && !isStreaming) void handleSendMessage();
                  }
                }}
                maxLength={4000}
                placeholder="Message DurgasOS AI…"
                disabled={isStreaming}
                className="mb-16 min-h-[88px] w-full resize-none border-0 bg-transparent text-[15px] font-medium text-[#e4e4e7] outline-none ring-0 placeholder:text-[#52525b]"
                spellCheck={false}
              />

              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[#71717a]">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[#a1a1aa]">
                    <input
                      type="checkbox"
                      checked={think}
                      onChange={(e) => setThink(e.target.checked)}
                      className="rounded border-[#3f3f46] bg-[#27272a]"
                    />
                    Think
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[#a1a1aa]">
                    <input
                      type="checkbox"
                      checked={deepSearch}
                      onChange={(e) => setDeepSearch(e.target.checked)}
                      className="rounded border-[#3f3f46] bg-[#27272a]"
                    />
                    RAG
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-2 py-1 text-[11px] text-[#e4e4e7]"
                    title="Model id passed to chat.completions"
                  >
                    <option value="steamdj/llama3.1-cpu-only">Llama 3.1 (CPU)</option>
                    <option value="steamdj/mistral-cpu-only">Mistral (CPU)</option>
                    <option value="Raiff1982/codette-ultimate-rc-xi-cpu">Codette</option>
                  </select>
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`rounded-lg p-1.5 transition-colors ${isListening ? 'bg-red-500/10 text-red-500' : 'hover:bg-[#27272a] hover:text-white'}`}
                    title={isListening ? 'Stop listening' : 'Dictate'}
                  >
                    <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTemplatesModal(true)}
                    aria-label="Browse prompt templates"
                    className="flex items-center gap-1 text-[12px] font-semibold text-[#a1a1aa] hover:text-white"
                  >
                    <Search className="h-3.5 w-3.5" /> Prompts
                  </button>
                </div>
                <span
                  className={`mr-10 text-[11px] font-medium sm:mr-12 ${inputValue.length >= 4000 ? 'text-red-400' : ''}`}
                >
                  {inputValue.length} / 4,000
                </span>
              </div>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={() => abortActiveRequests()}
                  className="absolute bottom-4 right-4 rounded-xl bg-[#27272a] p-2 text-white transition-colors hover:bg-[#3f3f46]"
                  title="Stop"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!inputValue.trim()}
                  aria-label="Send message"
                  className="absolute bottom-4 right-4 rounded-xl bg-indigo-600 p-2 text-white transition-colors hover:bg-indigo-500 disabled:bg-[#27272a] disabled:text-[#52525b]"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {showTemplatesModal ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b]/80 p-4 backdrop-blur-sm">
            <div className="flex h-full w-full flex-col justify-start rounded-none border border-[#27272a] bg-[#121214] shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-[#27272a] p-4 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
                  <LayoutTemplate className="h-5 w-5 text-indigo-400" />
                  Template library
                </h2>
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(false)}
                  aria-label="Close template library"
                  className="rounded-lg p-2 text-[#a1a1aa] transition-colors hover:bg-[#27272a] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="flex flex-col gap-8">
                  {CHAT_PROMPT_TEMPLATES.map((categoryGroup) => (
                    <div key={categoryGroup.category}>
                      <h3 className="mb-4 px-1 text-sm font-semibold uppercase tracking-wider text-[#a1a1aa]">
                        {categoryGroup.category}
                      </h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {categoryGroup.items.map((template) => (
                          <button
                            type="button"
                            key={template.title}
                            onClick={() => {
                              setInputValue(template.prompt);
                              setShowTemplatesModal(false);
                            }}
                            className="flex cursor-pointer flex-col rounded-[5px] border border-[#27272a] bg-[#18181b] px-[15px] py-[10px] text-left transition-all hover:border-indigo-500/50 hover:bg-[#27272a]/50"
                          >
                            <h4 className="mb-2 font-semibold text-[#e4e4e7]">{template.title}</h4>
                            <p className="line-clamp-3 text-sm text-[#71717a]">{template.prompt}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {threadToDelete ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b]/80 p-4 backdrop-blur-sm">
            <div className="w-full rounded-2xl border border-[#27272a] bg-[#121214] p-6 shadow-2xl">
              <h3 className="mb-2 text-lg font-bold text-white">Delete thread</h3>
              <p className="mb-6 text-sm text-[#a1a1aa]">
                Delete{' '}
                <span className="font-semibold text-[#e4e4e7]">
                  &quot;{threadToDelete.title}&quot;
                </span>{' '}
                on the server? This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setThreadToDelete(null)}
                  className="rounded-xl bg-[#27272a] px-4 py-2 text-sm font-medium text-[#e4e4e7] hover:bg-[#3f3f46]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteThread()}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <aside className="relative flex w-[240px] shrink-0 flex-col border-l border-[#27272a] bg-[#121214] px-[10px] py-[10px] sm:w-[280px] lg:w-[300px]">
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-[13px] font-semibold text-[#e4e4e7]">
            Threads <span className="ml-1 font-medium text-[#71717a]">({serverRows.length})</span>
          </h3>
          <MoreHorizontal className="h-4 w-4 text-[#a1a1aa]" aria-hidden />
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52525b]" />
          <input
            type="search"
            placeholder="Search threads"
            value={searchThreadQuery}
            onChange={(e) => setSearchThreadQuery(e.target.value)}
            className="w-full rounded-[5px] border border-[#27272a] bg-[#18181b] py-2 pl-9 pr-3 text-sm text-[#e4e4e7] placeholder:text-[#52525b] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-16 pr-1">
          <ProjectCard
            title="New thread"
            desc="Start a conversation"
            active={activeThreadId === null}
            onClick={() => {
              setActiveThreadId(null);
              setSkipConversationFetch(false);
              setOptimisticUser(null);
              setStreamingContent('');
            }}
          />
          {filteredThreads.map((thread) => (
            <ProjectCard
              key={thread.id}
              title={threadLabel(thread.id)}
              desc={thread.updated_at ? new Date(thread.updated_at).toLocaleString() : '—'}
              active={activeThreadId === thread.id}
              onClick={() => {
                setActiveThreadId(thread.id);
                setSkipConversationFetch(false);
              }}
              isRenaming={renamingThreadId === thread.id}
              editTitle={editThreadTitle}
              onEditTitleChange={setEditThreadTitle}
              onRenameStart={() => {
                setRenamingThreadId(thread.id);
                setEditThreadTitle(getThreadTitle(thread.id) ?? threadLabel(thread.id));
              }}
              onRenameSubmit={() => handleRenameThread(thread.id, editThreadTitle)}
              onDelete={() => setThreadToDelete({ id: thread.id, title: threadLabel(thread.id) })}
              canEdit
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setActiveThreadId(null)}
          className="absolute bottom-6 right-5 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-indigo-500/50 bg-indigo-600 shadow-xl shadow-indigo-600/20 transition-colors hover:bg-indigo-500 lg:right-6"
          title="New thread"
        >
          <Plus className="h-5 w-5 text-white" />
        </button>
      </aside>

      {contextMenu ? (
        <div
          className="fixed z-[100] w-44 overflow-hidden rounded-xl border border-[#3f3f46] bg-[#18181b] py-1 shadow-2xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[#e4e4e7] transition-colors hover:bg-[#27272a]"
            onClick={() => {
              void navigator.clipboard.writeText(contextMenu.content);
              setContextMenu(null);
            }}
          >
            <Copy className="h-4 w-4 text-[#71717a]" /> Copy
          </button>
        </div>
      ) : null}
    </div>
  );
}
