'use client';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useOS, WindowState } from './os-context';
import { Window } from './Window';
import { useIsMobile } from '@/hooks/use-is-mobile';

const LoadingSpinner = () => (
  <div className="flex h-full w-full items-center justify-center bg-slate-950/20 text-xs text-white/50 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-2">
      <div className="h-4 w-4 animate-spin rounded-full border border-sky-400 border-t-transparent" />
      <span>Loading app...</span>
    </div>
  </div>
);

const FileExplorerApp = dynamic(
  () => import('./apps/FileExplorer').then((m) => m.FileExplorerApp),
  { ssr: false, loading: LoadingSpinner }
);
const SettingsApp = dynamic(() => import('./apps/Settings').then((m) => m.SettingsApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const TerminalApp = dynamic(() => import('./apps/Terminal').then((m) => m.TerminalApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const ChatApp = dynamic(() => import('./apps/ChatApp').then((m) => m.ChatApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const RagApp = dynamic(() => import('./apps/RagApp').then((m) => m.RagApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const StorageApp = dynamic(() => import('./apps/StorageApp').then((m) => m.StorageApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const MetricsApp = dynamic(() => import('./apps/MetricsApp').then((m) => m.MetricsApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const VisionApp = dynamic(() => import('./apps/VisionApp').then((m) => m.VisionApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const MultimodalApp = dynamic(() => import('./apps/MultimodalApp').then((m) => m.MultimodalApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const CouncilApp = dynamic(() => import('./apps/CouncilApp').then((m) => m.CouncilApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const BrowserApp = dynamic(() => import('./apps/BrowserApp').then((m) => m.BrowserApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const AppsManagerApp = dynamic(
  () => import('./apps/AppsManagerApp').then((m) => m.AppsManagerApp),
  { ssr: false, loading: LoadingSpinner }
);
const VolumeManagerApp = dynamic(
  () => import('./apps/VolumeManagerApp').then((m) => m.VolumeManagerApp),
  { ssr: false, loading: LoadingSpinner }
);
const ArchiverApp = dynamic(() => import('./apps/ArchiverApp').then((m) => m.ArchiverApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const PlayerApp = dynamic(() => import('./apps/PlayerApp').then((m) => m.PlayerApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const RemoteApp = dynamic(() => import('./apps/RemoteApp').then((m) => m.RemoteApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const DocsApp = dynamic(() => import('./apps/DocsApp').then((m) => m.DocsApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const SheetsApp = dynamic(() => import('./apps/SheetsApp').then((m) => m.SheetsApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const TransferApp = dynamic(() => import('./apps/TransferApp').then((m) => m.TransferApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const WorkflowApp = dynamic(() => import('./apps/WorkflowApp').then((m) => m.WorkflowApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const VectorDbApp = dynamic(() => import('./apps/VectorDbApp').then((m) => m.VectorDbApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const ResumeMatcherApp = dynamic(
  () => import('./apps/ResumeMatcherApp').then((m) => m.ResumeMatcherApp),
  { ssr: false, loading: LoadingSpinner }
);
const TimeMachineApp = dynamic(
  () => import('./apps/TimeMachineApp').then((m) => m.TimeMachineApp),
  { ssr: false, loading: LoadingSpinner }
);
const VoidIdeApp = dynamic(() => import('./apps/VoidIdeApp').then((m) => m.VoidIdeApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const GalleryApp = dynamic(() => import('./apps/GalleryApp').then((m) => m.GalleryApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const GmailApp = dynamic(() => import('./apps/GmailApp').then((m) => m.GmailApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const CalendarApp = dynamic(() => import('./apps/CalendarApp').then((m) => m.CalendarApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const ContactsApp = dynamic(() => import('./apps/ContactsApp').then((m) => m.ContactsApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const DriveApp = dynamic(() => import('./apps/DriveApp').then((m) => m.DriveApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const TodoApp = dynamic(() => import('./apps/TodoApp').then((m) => m.TodoApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const RepoApp = dynamic(() => import('./apps/RepoApp').then((m) => m.RepoApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const RoadRashApp = dynamic(() => import('./apps/RoadRashApp').then((m) => m.RoadRashApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const ViewerApp = dynamic(() => import('./apps/ViewerApp').then((m) => m.ViewerApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const GemmaApp = dynamic(() => import('./apps/GemmaApp').then((m) => m.GemmaApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const WorldMapApp = dynamic(() => import('./apps/WorldMapApp').then((m) => m.WorldMapApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const DurgasmanApp = dynamic(() => import('./apps/DurgasmanApp').then((m) => m.DurgasmanApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const DataVideoApp = dynamic(() => import('./apps/vsql/VsqlApp').then((m) => m.VsqlApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const SudokuApp = dynamic(() => import('./apps/SudokuApp').then((m) => m.SudokuApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const LibraryApp = dynamic(() => import('./apps/library/LibraryApp').then((m) => m.LibraryApp), {
  ssr: false,
  loading: LoadingSpinner,
});
const DevToolApp = dynamic(() => import('./apps/DevToolApp').then((m) => m.DevToolApp), {
  ssr: false,
  loading: LoadingSpinner,
});

const FallbackApp = ({ name }: { name: string }) => (
  <div className="absolute inset-0 bg-slate-900 border border-t-0 border-white/5 flex items-center justify-center flex-col gap-4 text-white/50">
    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner">
      <span className="text-2xl font-bold opacity-30">?</span>
    </div>
    <p>{name} App is currently under development.</p>
  </div>
);

export function WindowManager() {
  const { windows, activeWindow } = useOS();
  const isMobile = useIsMobile();

  const windowsToRender = useMemo(() => {
    if (!isMobile) return windows;
    const visible = windows.filter((w) => !w.isMinimized);
    if (!visible.length) return [];
    const pick =
      activeWindow && visible.some((w) => w.id === activeWindow)
        ? visible.find((w) => w.id === activeWindow)!
        : [...visible].sort((a, b) => b.zIndex - a.zIndex)[0];
    return [pick];
  }, [windows, activeWindow, isMobile]);

  const renderApp = (appId: string) => {
    switch (appId) {
      case 'explorer':
        return <FileExplorerApp />;
      case 'settings':
        return <SettingsApp />;
      case 'terminal':
        return <TerminalApp />;
      case 'chat':
        return <ChatApp />;
      case 'rag':
        return <RagApp />;
      case 'storage':
        return <StorageApp />;
      case 'metrics':
        return <MetricsApp />;
      case 'vision':
        return <VisionApp />;
      case 'multimodal':
        return <MultimodalApp />;
      case 'council':
        return <CouncilApp />;
      case 'browser':
        return <BrowserApp />;
      case 'gallery':
        return <GalleryApp />;
      case 'gmail':
        return <GmailApp />;
      case 'calendar':
        return <CalendarApp />;
      case 'contacts':
        return <ContactsApp />;
      case 'drive':
        return <DriveApp />;
      case 'todo':
        return <TodoApp />;
      case 'repo':
        return <RepoApp />;
      case 'roadrash':
        return <RoadRashApp />;
      case 'apps-manager':
        return <AppsManagerApp />;
      case 'volumes':
        return <VolumeManagerApp />;
      case 'archiver':
        return <ArchiverApp />;
      case 'player':
        return <PlayerApp />;
      case 'remote':
        return <RemoteApp />;
      case 'docs':
        return <DocsApp />;
      case 'sheets':
        return <SheetsApp />;
      case 'transfer':
        return <TransferApp />;
      case 'workflow':
        return <WorkflowApp />;
      case 'vectordb':
        return <VectorDbApp />;
      case 'void-ide':
        return <VoidIdeApp />;
      case 'viewer':
        return <ViewerApp />;
      case 'resume':
        return <ResumeMatcherApp />;
      case 'time-machine':
        return <TimeMachineApp />;
      case 'gemma':
        return <GemmaApp />;
      case 'worldmap':
        return <WorldMapApp />;
      case 'durgasman':
        return <DurgasmanApp />;
      case 'datavideo':
        return <DataVideoApp />;
      case 'sudoku':
        return <SudokuApp />;
      case 'library':
        return <LibraryApp />;
      case 'dev-tool':
        return <DevToolApp />;
      default:
        return <FallbackApp name={appId} />;
    }
  };

  return (
    <>
      {windowsToRender.map((w: WindowState) => (
        <Window key={w.id} {...w} launch={w.launch}>
          {renderApp(w.appId)}
        </Window>
      ))}
    </>
  );
}
