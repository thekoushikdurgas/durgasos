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
  | 'void-ide'
  | 'viewer'
  | 'gmail'
  | 'calendar'
  | 'contacts'
  | 'drive'
  | 'todo';

export interface AppDefinition {
  id: AppId;
  name: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
  color: string;
  category: AppCategory;
}

export const APPS: Record<AppId, AppDefinition> = {
  explorer: {
    id: 'explorer',
    name: 'Files',
    icon: Folder,
    color: 'text-blue-400',
    category: 'core',
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    color: 'text-gray-400',
    category: 'system',
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    icon: Terminal,
    color: 'text-green-400',
    category: 'core',
  },
  browser: {
    id: 'browser',
    name: 'Web',
    icon: Globe,
    color: 'text-indigo-400',
    category: 'core',
  },
  gallery: {
    id: 'gallery',
    name: 'Gallery',
    icon: ImageIcon,
    color: 'text-pink-400',
    category: 'core',
  },
  chat: {
    id: 'chat',
    name: 'Chat',
    icon: Mail,
    color: 'text-cyan-400',
    category: 'core',
  },
  rag: {
    id: 'rag',
    name: 'RAG',
    icon: Gem,
    color: 'text-emerald-400',
    category: 'workflows',
  },
  vectordb: {
    id: 'vectordb',
    name: 'Vector DB',
    icon: Database,
    color: 'text-cyan-400',
    category: 'data',
  },
  'void-ide': {
    id: 'void-ide',
    name: 'Void IDE',
    icon: Code,
    color: 'text-violet-300',
    category: 'core',
  },
  viewer: {
    id: 'viewer',
    name: 'Viewer',
    icon: FileSearch,
    color: 'text-slate-300',
    category: 'core',
  },
  storage: {
    id: 'storage',
    name: 'Storage',
    icon: HardDrive,
    color: 'text-orange-400',
    category: 'data',
  },
  metrics: {
    id: 'metrics',
    name: 'Metrics',
    icon: Loader,
    color: 'text-yellow-400',
    category: 'workflows',
  },
  vision: {
    id: 'vision',
    name: 'Vision',
    icon: Eye,
    color: 'text-violet-400',
    category: 'system',
  },
  multimodal: {
    id: 'multimodal',
    name: 'Multimodal',
    icon: PartyPopper,
    color: 'text-fuchsia-400',
    category: 'workflows',
  },
  council: {
    id: 'council',
    name: 'Council',
    icon: ArrowRight,
    color: 'text-amber-400',
    category: 'workflows',
  },
  workflow: {
    id: 'workflow',
    name: 'Workflows',
    icon: GitBranch,
    color: 'text-sky-300',
    category: 'workflows',
  },
  'apps-manager': {
    id: 'apps-manager',
    name: 'Apps',
    icon: AppWindow,
    color: 'text-sky-400',
    category: 'system',
  },
  volumes: {
    id: 'volumes',
    name: 'Volumes',
    icon: Layers,
    color: 'text-slate-300',
    category: 'data',
  },
  archiver: {
    id: 'archiver',
    name: 'Archiver',
    icon: Archive,
    color: 'text-amber-300',
    category: 'data',
  },
  player: {
    id: 'player',
    name: 'Player',
    icon: PlayCircle,
    color: 'text-rose-400',
    category: 'core',
  },
  remote: {
    id: 'remote',
    name: 'Remote',
    icon: Server,
    color: 'text-emerald-300',
    category: 'system',
  },
  docs: {
    id: 'docs',
    name: 'Docs',
    icon: FileText,
    color: 'text-blue-300',
    category: 'core',
  },
  sheets: {
    id: 'sheets',
    name: 'Sheets',
    icon: Table2,
    color: 'text-green-300',
    category: 'core',
  },
  transfer: {
    id: 'transfer',
    name: 'Transfer',
    icon: ArrowLeftRight,
    color: 'text-orange-300',
    category: 'data',
  },
  resume: {
    id: 'resume',
    name: 'Resume',
    icon: Briefcase,
    color: 'text-indigo-400',
    category: 'workflows',
  },
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    icon: Inbox,
    color: 'text-sky-300',
    category: 'core',
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    icon: CalendarDays,
    color: 'text-violet-300',
    category: 'core',
  },
  contacts: {
    id: 'contacts',
    name: 'Contacts',
    icon: Users,
    color: 'text-teal-300',
    category: 'core',
  },
  drive: {
    id: 'drive',
    name: 'Drive',
    icon: FolderOpen,
    color: 'text-amber-300',
    category: 'data',
  },
  todo: {
    id: 'todo',
    name: 'Todo',
    icon: ListTodo,
    color: 'text-violet-300',
    category: 'core',
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
  viewer: 'Preview unknown or binary files from storage or the demo filesystem.',
  gmail: 'Read-only Gmail inbox and messages.',
  calendar: 'Read-only Google Calendar events.',
  contacts: 'Read-only Google Contacts.',
  drive: 'Read-only Google Drive file listing.',
  todo: 'Kanban tasks synced with Google Tasks.',
};
