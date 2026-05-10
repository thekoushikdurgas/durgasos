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
} from 'lucide-react';

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
  | 'transfer';

export interface AppDefinition {
  id: AppId;
  name: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
  color: string;
}

export const APPS: Record<AppId, AppDefinition> = {
  explorer: {
    id: 'explorer',
    name: 'Files',
    icon: Folder,
    color: 'text-blue-400',
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    color: 'text-gray-400',
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    icon: Terminal,
    color: 'text-green-400',
  },
  browser: {
    id: 'browser',
    name: 'Web',
    icon: Globe,
    color: 'text-indigo-400',
  },
  gallery: {
    id: 'gallery',
    name: 'Gallery',
    icon: ImageIcon,
    color: 'text-pink-400',
  },
  chat: {
    id: 'chat',
    name: 'Chat',
    icon: Mail,
    color: 'text-cyan-400',
  },
  rag: {
    id: 'rag',
    name: 'RAG',
    icon: Gem,
    color: 'text-emerald-400',
  },
  storage: {
    id: 'storage',
    name: 'Storage',
    icon: HardDrive,
    color: 'text-orange-400',
  },
  metrics: {
    id: 'metrics',
    name: 'Metrics',
    icon: Loader,
    color: 'text-yellow-400',
  },
  vision: {
    id: 'vision',
    name: 'Vision',
    icon: Eye,
    color: 'text-violet-400',
  },
  multimodal: {
    id: 'multimodal',
    name: 'Multimodal',
    icon: PartyPopper,
    color: 'text-fuchsia-400',
  },
  council: {
    id: 'council',
    name: 'Council',
    icon: ArrowRight,
    color: 'text-amber-400',
  },
  'apps-manager': {
    id: 'apps-manager',
    name: 'Apps',
    icon: AppWindow,
    color: 'text-sky-400',
  },
  volumes: {
    id: 'volumes',
    name: 'Volumes',
    icon: Layers,
    color: 'text-slate-300',
  },
  archiver: {
    id: 'archiver',
    name: 'Archiver',
    icon: Archive,
    color: 'text-amber-300',
  },
  player: {
    id: 'player',
    name: 'Player',
    icon: PlayCircle,
    color: 'text-rose-400',
  },
  remote: {
    id: 'remote',
    name: 'Remote',
    icon: Server,
    color: 'text-emerald-300',
  },
  docs: {
    id: 'docs',
    name: 'Docs',
    icon: FileText,
    color: 'text-blue-300',
  },
  sheets: {
    id: 'sheets',
    name: 'Sheets',
    icon: Table2,
    color: 'text-green-300',
  },
  transfer: {
    id: 'transfer',
    name: 'Transfer',
    icon: ArrowLeftRight,
    color: 'text-orange-300',
  },
};
