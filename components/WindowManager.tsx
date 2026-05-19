'use client';
import { useMemo } from 'react';
import { useOS, WindowState } from './os-context';
import { Window } from './Window';
import { FileExplorerApp } from './apps/FileExplorer';
import { SettingsApp } from './apps/Settings';
import { TerminalApp } from './apps/Terminal';
import { ChatApp } from './apps/ChatApp';
import { RagApp } from './apps/RagApp';
import { StorageApp } from './apps/StorageApp';
import { MetricsApp } from './apps/MetricsApp';
import { VisionApp } from './apps/VisionApp';
import { MultimodalApp } from './apps/MultimodalApp';
import { CouncilApp } from './apps/CouncilApp';
import { BrowserApp } from './apps/BrowserApp';
import { AppsManagerApp } from './apps/AppsManagerApp';
import { VolumeManagerApp } from './apps/VolumeManagerApp';
import { ArchiverApp } from './apps/ArchiverApp';
import { PlayerApp } from './apps/PlayerApp';
import { RemoteApp } from './apps/RemoteApp';
import { DocsApp } from './apps/DocsApp';
import { SheetsApp } from './apps/SheetsApp';
import { TransferApp } from './apps/TransferApp';
import { WorkflowApp } from './apps/WorkflowApp';
import { VectorDbApp } from './apps/VectorDbApp';
import { ResumeMatcherApp } from './apps/ResumeMatcherApp';
import { VoidIdeApp } from './apps/VoidIdeApp';
import { GalleryApp } from './apps/GalleryApp';
import { GmailApp } from './apps/GmailApp';
import { CalendarApp } from './apps/CalendarApp';
import { ContactsApp } from './apps/ContactsApp';
import { DriveApp } from './apps/DriveApp';
import { TodoApp } from './apps/TodoApp';
import { ViewerApp } from './apps/ViewerApp';
import { useIsMobile } from '@/hooks/use-is-mobile';

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
