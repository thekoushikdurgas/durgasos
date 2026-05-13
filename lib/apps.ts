import type { ComponentType } from 'react';
import {
  Folder,
  Settings,
  Terminal,
  Globe,
  Image as ImageIcon,
  Mail,
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
  ArrowLeftRight,
  GitBranch,
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
  | 'workflow';

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
};

export const APP_CATEGORY_LABELS: Record<AppCategory, string> = {
  core: 'Core',
  workflows: 'Workflows',
  data: 'Data',
  system: 'System',
};
