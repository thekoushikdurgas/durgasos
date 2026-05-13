'use client';
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

const FallbackApp = ({ name }: { name: string }) => (
  <div className="absolute inset-0 bg-slate-900 border border-t-0 border-white/5 flex items-center justify-center flex-col gap-4 text-white/50">
    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner">
      <span className="text-2xl font-bold opacity-30">?</span>
    </div>
    <p>{name} App is currently under development.</p>
  </div>
);

export function WindowManager() {
  const { windows } = useOS();

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
      default:
        return <FallbackApp name={appId} />;
    }
  };

  return (
    <>
      {windows.map((w: WindowState) => (
        <Window key={w.id} {...w} launch={w.launch}>
          {renderApp(w.appId)}
        </Window>
      ))}
    </>
  );
}
