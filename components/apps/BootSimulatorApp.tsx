'use client';

import { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  Power,
  Cpu,
  ShieldAlert,
  Monitor,
  Terminal,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { useJsonRpcStream } from '@/hooks/use-json-rpc-ws';
import { cn } from '@/lib/utils';

interface BootLog {
  stage: 'POST' | 'FIRMWARE' | 'BOOTLOADER' | 'KERNEL' | 'USERSPACE';
  message: string;
  timestamp: number;
}

export function BootSimulatorApp() {
  const { callStreaming, abort } = useJsonRpcStream();
  const [bootMode, setBootMode] = useState<'uefi' | 'bios'>('uefi');
  const [logs, setLogs] = useState<BootLog[]>([]);
  const [status, setStatus] = useState<'off' | 'booting' | 'ready'>('off');
  const [currentStage, setCurrentStage] = useState<
    'none' | 'POST' | 'FIRMWARE' | 'BOOTLOADER' | 'KERNEL' | 'USERSPACE'
  >('none');

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const startBoot = async () => {
    setStatus('booting');
    setLogs([]);
    setCurrentStage('POST');

    try {
      await callStreaming(
        'os_labs.simulate_boot',
        { bootMode },
        {
          onMessage: (msg) => {
            if (msg.type === 'chunk') {
              const chunk = msg as unknown as { stage: any; message: string; timestamp: number };
              setLogs((prev) => [
                ...prev,
                {
                  stage: chunk.stage,
                  message: chunk.message,
                  timestamp: chunk.timestamp,
                },
              ]);
              setCurrentStage(chunk.stage);
            }
          },
          onDone: () => {
            setStatus('ready');
            setCurrentStage('none');
          },
          onError: (err) => {
            setStatus('off');
            setCurrentStage('none');
            setLogs((prev) => [
              ...prev,
              {
                stage: 'POST',
                message: `[BOOT CRASH]: ${err}`,
                timestamp: Date.now() / 1000,
              },
            ]);
          },
        }
      );
    } catch (e) {
      setStatus('off');
      setCurrentStage('none');
    }
  };

  const powerOff = () => {
    abort();
    setStatus('off');
    setLogs([]);
    setCurrentStage('none');
  };

  // Scroll to bottom on new logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // RAM Allocation Map logic based on active stage
  const isSegmentActive = (segment: string) => {
    if (status === 'off') return false;
    if (status === 'ready') return true;

    switch (segment) {
      case 'rom':
        return currentStage === 'POST' || currentStage === 'FIRMWARE';
      case 'boot':
        return currentStage === 'FIRMWARE' || currentStage === 'BOOTLOADER';
      case 'kernel':
        return (
          currentStage === 'BOOTLOADER' || currentStage === 'KERNEL' || currentStage === 'USERSPACE'
        );
      case 'user':
        return currentStage === 'USERSPACE';
      default:
        return false;
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-950/60 text-white/95 select-none font-sans">
      {/* Control Sidebar */}
      <aside className="w-72 border-r border-white/10 p-4.5 flex flex-col justify-between bg-slate-950/50 backdrop-blur-md shrink-0">
        <div className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <Monitor className="h-4 w-4" />
              Chassis Controller
            </h2>
            <p className="text-[10px] leading-relaxed text-white/40">
              Select firmware modes and parameters before booting the virtual machine.
            </p>
          </div>

          {/* Firmware selector */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-bold tracking-wider text-white/40 block">
              Firmware Interface
            </label>
            <div className="flex bg-slate-900/60 rounded-lg border border-white/5 p-1">
              <button
                type="button"
                disabled={status === 'booting'}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200',
                  bootMode === 'uefi'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5 disabled:opacity-30'
                )}
                onClick={() => setBootMode('uefi')}
              >
                UEFI (GRUB/GPT)
              </button>
              <button
                type="button"
                disabled={status === 'booting'}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200',
                  bootMode === 'bios'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5 disabled:opacity-30'
                )}
                onClick={() => setBootMode('bios')}
              >
                Legacy BIOS (MBR)
              </button>
            </div>
          </div>

          {/* Core Settings Info */}
          <div className="p-3 border border-white/5 bg-slate-900/40 rounded-xl space-y-2 text-[10px] text-white/50 leading-relaxed shadow-inner">
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span>Primary CPU Cores</span>
              <span className="font-mono text-amber-400/90 font-semibold">8 Cores (SMP)</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span>Firmware ROM size</span>
              <span className="font-mono text-amber-400/90 font-semibold">16 MB Flash</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span>Main System RAM</span>
              <span className="font-mono text-amber-400/90 font-semibold">32 GB DDR5</span>
            </div>
            <div className="flex justify-between">
              <span>Primary Storage</span>
              <span className="font-mono text-amber-400/90 font-semibold">NVMe 512GB (Root)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {status === 'off' ? (
            <button
              type="button"
              onClick={startBoot}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-yellow-400 active:scale-[0.98] text-black font-black text-[11px] uppercase tracking-widest rounded-lg shadow-lg shadow-amber-500/10 transition-all duration-200"
            >
              <Power className="h-3.5 w-3.5" />
              Power On Virtual OS
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startBoot}
                disabled={status === 'booting'}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-white/10 active:scale-[0.98] disabled:opacity-30 text-white/90 font-bold text-[10px] uppercase tracking-wider rounded-lg border border-white/10 transition-all duration-150"
              >
                <RotateCcw className="h-3 w-3" />
                Reset System
              </button>
              <button
                type="button"
                onClick={powerOff}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-950/30 hover:bg-red-900/30 border border-red-500/30 active:scale-[0.98] text-red-300 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all duration-150"
              >
                <Power className="h-3 w-3" />
                Power Off
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Terminal and RAM Map */}
      <div className="flex-1 flex flex-col h-full bg-slate-950/30 min-w-0 min-h-0">
        {/* Terminal Section */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950/70 border-b border-white/10 relative overflow-hidden">
          <header className="px-4 py-2 bg-slate-950/90 border-b border-white/5 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-bold uppercase tracking-wider">
              <Terminal className="h-3.5 w-3.5 text-amber-500" />
              System Diagnostics Console
            </div>
            {status === 'booting' && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
            )}
            {status === 'ready' && (
              <span className="flex items-center gap-1 text-emerald-400 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                <CheckCircle2 className="h-3 w-3" />
                Kernel Online
              </span>
            )}
          </header>

          <div
            className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-amber-200/90 space-y-1.5 select-text selection:bg-amber-500/30 relative"
            style={{ textShadow: '0 0 1px rgba(245,158,11,0.25)' }}
          >
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-white/20 select-none">
                <ShieldAlert className="h-8 w-8 text-white/10 mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  System Offline
                </p>
                <p className="text-[9px] text-white/25 mt-1 max-w-[240px] leading-normal">
                  No electrical signal detected. Click &quot;Power On&quot; to begin the instruction
                  cycles.
                </p>
              </div>
            ) : (
              <>
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 animate-in fade-in slide-in-from-left-1 duration-150"
                  >
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-wider shrink-0 select-none mt-0.5',
                        log.stage === 'POST' &&
                          'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25',
                        log.stage === 'FIRMWARE' &&
                          'bg-amber-500/15 text-amber-300 border border-amber-500/25',
                        log.stage === 'BOOTLOADER' &&
                          'bg-purple-500/15 text-purple-300 border border-purple-500/25',
                        log.stage === 'KERNEL' &&
                          'bg-teal-500/15 text-teal-300 border border-teal-500/25',
                        log.stage === 'USERSPACE' &&
                          'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                      )}
                    >
                      {log.stage}
                    </span>
                    <span className="break-all whitespace-pre-wrap">{log.message}</span>
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </>
            )}
          </div>
        </div>

        {/* RAM Allocation Visualizer */}
        <div className="h-[185px] p-4.5 bg-slate-950/40 shrink-0 flex flex-col justify-between min-h-0 overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[10px] uppercase font-black text-white/40 tracking-wider">
                RAM Frame & Segment Allocator
              </h3>
              <p className="text-[9px] text-white/35 mt-0.5 leading-relaxed">
                Hardware mapping showing loaded instruction blocks inside the 32 GB physical memory
                space.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3.5 h-[88px] mt-2.5 min-h-0">
            {/* Firmware ROM Segment */}
            <div
              className={cn(
                'border rounded-xl p-2.5 flex flex-col justify-between transition-all duration-300 min-w-0',
                isSegmentActive('rom')
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)] text-amber-200'
                  : 'bg-white/[0.02] border-white/5 text-white/20'
              )}
            >
              <div className="flex justify-between items-start gap-1">
                <span className="text-[8px] font-bold uppercase tracking-wider truncate">
                  0x0000 - 0x1000
                </span>
                <Cpu
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isSegmentActive('rom') ? 'text-amber-400' : 'opacity-25'
                  )}
                />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase truncate">Firmware ROM</div>
                <div className="text-[8px] opacity-55 truncate">ACPI & POST</div>
              </div>
            </div>

            {/* Bootloader Sector */}
            <div
              className={cn(
                'border rounded-xl p-2.5 flex flex-col justify-between transition-all duration-300 min-w-0',
                isSegmentActive('boot')
                  ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)] text-purple-200'
                  : 'bg-white/[0.02] border-white/5 text-white/20'
              )}
            >
              <div className="flex justify-between items-start gap-1">
                <span className="text-[8px] font-bold uppercase tracking-wider truncate">
                  0x1000 - 0x8000
                </span>
                <FileCode
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isSegmentActive('boot') ? 'text-purple-400' : 'opacity-25'
                  )}
                />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase truncate">Boot Loader</div>
                <div className="text-[8px] opacity-55 truncate">GPT/MBR Stage 2</div>
              </div>
            </div>

            {/* Kernel Space */}
            <div
              className={cn(
                'border rounded-xl p-2.5 flex flex-col justify-between transition-all duration-300 min-w-0',
                isSegmentActive('kernel')
                  ? 'bg-teal-500/10 border-teal-500/40 shadow-[0_0_12px_rgba(20,184,166,0.15)] text-teal-200'
                  : 'bg-white/[0.02] border-white/5 text-white/20'
              )}
            >
              <div className="flex justify-between items-start gap-1">
                <span className="text-[8px] font-bold uppercase tracking-wider truncate">
                  0x8000 - 0x800000
                </span>
                <Cpu
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isSegmentActive('kernel') ? 'text-teal-400' : 'opacity-25'
                  )}
                />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase truncate">Kernel Space</div>
                <div className="text-[8px] opacity-55 truncate">Syscalls & Tasks</div>
              </div>
            </div>

            {/* User Space */}
            <div
              className={cn(
                'border rounded-xl p-2.5 flex flex-col justify-between transition-all duration-300 min-w-0',
                isSegmentActive('user')
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)] text-emerald-200'
                  : 'bg-white/[0.02] border-white/5 text-white/20'
              )}
            >
              <div className="flex justify-between items-start gap-1">
                <span className="text-[8px] font-bold uppercase tracking-wider truncate">
                  0x800000 - MAX
                </span>
                <Monitor
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isSegmentActive('user') ? 'text-emerald-400' : 'opacity-25'
                  )}
                />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase truncate">User Space</div>
                <div className="text-[8px] opacity-55 truncate">PID 1 & Shell apps</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
