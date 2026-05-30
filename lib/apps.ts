import type { ComponentType } from 'react';
import {
  Folder,
  Settings,
  Terminal,
  Globe,
  Image as ImageIcon,
  Mail,
  CalendarDays,
  FolderOpen,
  Inbox,
  Gem,
  HardDrive,
  Loader,
  Eye,
  PartyPopper,
  ArrowRight,
  AppWindow,
  Layers,
  Archive,
  PlayCircle,
  Server,
  FileText,
  Table2,
  Users,
  ArrowLeftRight,
  GitBranch,
  Database,
  Briefcase,
  Code,
  FileSearch,
  ListTodo,
  FolderGit2,
  Compass,
  Gamepad2,
  Sparkles,
  Map,
  Video,
  Network,
  Grid3X3,
  BookOpen,
  Wrench,
} from 'lucide-react';

export type AppCategory = 'core' | 'workflows' | 'data' | 'system';

export type AppId =
  | 'explorer'
  | 'settings'
  | 'terminal'
  | 'browser'
  | 'gallery'
  | 'chat'
  | 'rag'
  | 'storage'
  | 'metrics'
  | 'vision'
  | 'multimodal'
  | 'council'
  | 'apps-manager'
  | 'volumes'
  | 'archiver'
  | 'player'
  | 'remote'
  | 'docs'
  | 'sheets'
  | 'transfer'
  | 'workflow'
  | 'vectordb'
  | 'resume'
  | 'time-machine'
  | 'void-ide'
  | 'viewer'
  | 'gmail'
  | 'calendar'
  | 'contacts'
  | 'drive'
  | 'todo'
  | 'repo'
  | 'roadrash'
  | 'gemma'
  | 'worldmap'
  | 'durgasman'
  | 'datavideo'
  | 'sudoku'
  | 'library'
  | 'dev-tool';

export interface AppDefinition {
  id: AppId;
  name: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
  color: string;
  category: AppCategory;
  tags: readonly string[];
}

export const APPS: Record<AppId, AppDefinition> = {
  explorer: {
    id: 'explorer',
    name: 'Files',
    icon: Folder,
    color: 'text-blue-400',
    category: 'core',
    tags: ['files', 'productivity'],
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    color: 'text-gray-400',
    category: 'system',
    tags: ['system', 'preferences'],
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    icon: Terminal,
    color: 'text-green-400',
    category: 'core',
    tags: ['devtools', 'shell'],
  },
  browser: {
    id: 'browser',
    name: 'Web',
    icon: Globe,
    color: 'text-indigo-400',
    category: 'core',
    tags: ['web', 'productivity'],
  },
  gallery: {
    id: 'gallery',
    name: 'Gallery',
    icon: ImageIcon,
    color: 'text-pink-400',
    category: 'core',
    tags: ['media', 'files'],
  },
  chat: {
    id: 'chat',
    name: 'Chat',
    icon: Mail,
    color: 'text-cyan-400',
    category: 'core',
    tags: ['ai', 'communication'],
  },
  rag: {
    id: 'rag',
    name: 'RAG',
    icon: Gem,
    color: 'text-emerald-400',
    category: 'workflows',
    tags: ['ai', 'data'],
  },
  vectordb: {
    id: 'vectordb',
    name: 'Vector DB',
    icon: Database,
    color: 'text-cyan-400',
    category: 'data',
    tags: ['ai', 'data'],
  },
  'void-ide': {
    id: 'void-ide',
    name: 'Void IDE',
    icon: Code,
    color: 'text-violet-300',
    category: 'core',
    tags: ['devtools', 'ai'],
  },
  viewer: {
    id: 'viewer',
    name: 'Viewer',
    icon: FileSearch,
    color: 'text-slate-300',
    category: 'core',
    tags: ['files', 'preview'],
  },
  storage: {
    id: 'storage',
    name: 'Storage',
    icon: HardDrive,
    color: 'text-orange-400',
    category: 'data',
    tags: ['data', 'cloud'],
  },
  metrics: {
    id: 'metrics',
    name: 'Metrics',
    icon: Loader,
    color: 'text-yellow-400',
    category: 'workflows',
    tags: ['ai', 'analytics'],
  },
  vision: {
    id: 'vision',
    name: 'Vision',
    icon: Eye,
    color: 'text-violet-400',
    category: 'system',
    tags: ['ai', 'media'],
  },
  multimodal: {
    id: 'multimodal',
    name: 'Multimodal',
    icon: PartyPopper,
    color: 'text-fuchsia-400',
    category: 'workflows',
    tags: ['ai', 'media'],
  },
  council: {
    id: 'council',
    name: 'Council',
    icon: ArrowRight,
    color: 'text-amber-400',
    category: 'workflows',
    tags: ['ai', 'automation'],
  },
  workflow: {
    id: 'workflow',
    name: 'Workflows',
    icon: GitBranch,
    color: 'text-sky-300',
    category: 'workflows',
    tags: ['automation', 'productivity'],
  },
  'apps-manager': {
    id: 'apps-manager',
    name: 'Apps',
    icon: AppWindow,
    color: 'text-sky-400',
    category: 'system',
    tags: ['system', 'productivity'],
  },
  volumes: {
    id: 'volumes',
    name: 'Volumes',
    icon: Layers,
    color: 'text-slate-300',
    category: 'data',
    tags: ['data', 'system'],
  },
  archiver: {
    id: 'archiver',
    name: 'Archiver',
    icon: Archive,
    color: 'text-amber-300',
    category: 'data',
    tags: ['files', 'compression'],
  },
  player: {
    id: 'player',
    name: 'Player',
    icon: PlayCircle,
    color: 'text-rose-400',
    category: 'core',
    tags: ['media'],
  },
  remote: {
    id: 'remote',
    name: 'Remote',
    icon: Server,
    color: 'text-emerald-300',
    category: 'system',
    tags: ['system', 'network'],
  },
  docs: {
    id: 'docs',
    name: 'Docs',
    icon: FileText,
    color: 'text-blue-300',
    category: 'core',
    tags: ['productivity', 'writing'],
  },
  sheets: {
    id: 'sheets',
    name: 'Sheets',
    icon: Table2,
    color: 'text-green-300',
    category: 'core',
    tags: ['productivity', 'data'],
  },
  transfer: {
    id: 'transfer',
    name: 'Transfer',
    icon: ArrowLeftRight,
    color: 'text-orange-300',
    category: 'data',
    tags: ['data', 'sync'],
  },
  resume: {
    id: 'resume',
    name: 'Resume',
    icon: Briefcase,
    color: 'text-indigo-400',
    category: 'workflows',
    tags: ['ai', 'career'],
  },
  'time-machine': {
    id: 'time-machine',
    name: 'Time Machine',
    icon: Compass,
    color: 'text-amber-500',
    category: 'workflows',
    tags: ['ai', 'history'],
  },
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    icon: Inbox,
    color: 'text-sky-300',
    category: 'core',
    tags: ['google', 'communication'],
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    icon: CalendarDays,
    color: 'text-violet-300',
    category: 'core',
    tags: ['google', 'productivity'],
  },
  contacts: {
    id: 'contacts',
    name: 'Contacts',
    icon: Users,
    color: 'text-teal-300',
    category: 'core',
    tags: ['google', 'communication'],
  },
  drive: {
    id: 'drive',
    name: 'Drive',
    icon: FolderOpen,
    color: 'text-amber-300',
    category: 'data',
    tags: ['google', 'files'],
  },
  todo: {
    id: 'todo',
    name: 'Todo',
    icon: ListTodo,
    color: 'text-violet-300',
    category: 'core',
    tags: ['google', 'productivity'],
  },
  repo: {
    id: 'repo',
    name: 'Repo',
    icon: FolderGit2,
    color: 'text-purple-400',
    category: 'core',
    tags: ['devtools', 'github'],
  },
  roadrash: {
    id: 'roadrash',
    name: 'Road Rash',
    icon: Gamepad2,
    color: 'text-rose-500',
    category: 'workflows',
    tags: ['game', 'retro'],
  },
  gemma: {
    id: 'gemma',
    name: 'Gemma',
    icon: Sparkles,
    color: 'text-purple-400',
    category: 'core',
    tags: ['ai', 'devtools'],
  },
  worldmap: {
    id: 'worldmap',
    name: 'World Map',
    icon: Map,
    color: 'text-sky-400',
    category: 'workflows',
    tags: ['ai', 'analytics', 'map'],
  },
  durgasman: {
    id: 'durgasman',
    name: 'Durgasman',
    icon: Network,
    color: 'text-orange-500',
    category: 'core',
    tags: ['devtools', 'network', 'productivity'],
  },
  datavideo: {
    id: 'datavideo',
    name: 'Data Video',
    icon: Video,
    color: 'text-pink-500',
    category: 'data',
    tags: ['video', 'data', 'sqlite', 'codec'],
  },
  sudoku: {
    id: 'sudoku',
    name: 'Sudoku',
    icon: Grid3X3,
    color: 'text-indigo-400',
    category: 'workflows',
    tags: ['game', 'ai', 'retro'],
  },
  library: {
    id: 'library',
    name: 'Library',
    icon: BookOpen,
    color: 'text-emerald-400',
    category: 'core',
    tags: ['ai', 'productivity', 'books'],
  },
  'dev-tool': {
    id: 'dev-tool',
    name: 'Dev AI',
    icon: Wrench,
    color: 'text-violet-400',
    category: 'core',
    tags: ['devtools', 'ai'],
  },
};

export const APP_CATEGORY_LABELS: Record<AppCategory, string> = {
  core: 'Core',
  workflows: 'Workflows',
  data: 'Data',
  system: 'System',
};

/** Short blurbs for Apps Manager and tooltips (single source with APPS). */
export const APP_DESCRIPTIONS: Record<AppId, string> = {
  explorer: 'Browse and open files in the workspace.',
  settings: 'Desktop preferences, AI providers, and connectivity.',
  terminal: 'Command-line shell for quick tasks.',
  browser: 'Embedded web browsing.',
  gallery: 'Browse images and videos from workspace storage.',
  chat: 'AI chat against the configured gateway.',
  rag: 'Retrieval-augmented generation over your documents.',
  vectordb: 'Inspect vector collections and RAG indices.',
  'void-ide': 'Monaco workspace and inline AI for code.',
  storage: 'Object storage buckets and uploads.',
  metrics: 'Usage metrics and model telemetry.',
  vision: 'Image analysis and vision APIs.',
  multimodal: 'Cross-modal AI tools.',
  council: 'Multi-agent council workflows.',
  workflow: 'Define and run automation workflows.',
  'apps-manager': 'Install or remove desktop applications.',
  volumes: 'Disk and volume overview.',
  archiver: 'Compress and extract archives.',
  player: 'Audio and video playback.',
  remote: 'Remote connections and servers.',
  docs: 'Rich-text documents.',
  sheets: 'Spreadsheet-style grids.',
  transfer: 'Move and sync data between locations.',
  resume: 'Résumé parsing and job matching helpers.',
  'time-machine':
    'Warp through human history, explore iconic moments with AR visual layers, and forecast our future based on historical trajectories.',
  viewer: 'Preview unknown or binary files from storage or the demo filesystem.',
  gmail: 'Read-only Gmail inbox and messages.',
  calendar: 'Read-only Google Calendar events.',
  contacts: 'Read-only Google Contacts.',
  drive: 'Read-only Google Drive file listing.',
  todo: 'Kanban tasks synced with Google Tasks.',
  repo: 'GitHub profile, repositories, and stars (public or linked account).',
  roadrash:
    'Play the classic retro pseudo-3D Road Rash game set in beautiful and chaotic Indian streets!',
  gemma:
    'Interact with Google Gemma models, load checkpoints, and simulate LoRA fine-tuning workflows.',
  worldmap: 'Real-time global events and supply chain monitor using Gemini grounding.',
  durgasman:
    'A fully-featured API Client Studio to send HTTP requests, manage environments, analyze responses, and generate collection docs using Gemini AI.',
  datavideo:
    'Pack compressed SQLite databases into video frames (MP4/MKV) and query databases stored inside video files.',
  sudoku:
    'Play Sudoku games generated dynamically by Gemini with real-time multiplayer lobbies and AI coaching.',
  library:
    'Personal book library with borrowing tracking, research notes, and Gemma-grounded chat over your catalog.',
  'dev-tool':
    'AI-powered dev utilities: minify, regex, JSON types, prompts, memory bank, icon generator, and more.',
};

/** Sorted unique tags across all apps (launcher filter dropdown). */
export const ALL_APP_TAGS: string[] = [...new Set(Object.values(APPS).flatMap((a) => a.tags))].sort(
  (a, b) => a.localeCompare(b)
);

/** All apps sorted by display name for the launcher grid. */
export function getAppsForLauncher(): AppDefinition[] {
  return Object.values(APPS).sort((a, b) => a.name.localeCompare(b.name));
}
