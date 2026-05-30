'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Play,
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
          onDone: (res) => {
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
    <div className="flex h-full w-full bg-slate-950/40 text-white/95 select-none">
      {/* Control Sidebar */}
      <div className="w-80 border-r border-white/10 p-5 flex flex-col justify-between bg-black/20 shrink-0">
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Monitor className="h-4.5 w-4.5" />
              Chassis Controller
            </h2>
            <p className="text-[10px] text-white/40 mt-1">
              Select firmware modes and parameters before booting the virtual machine.
            </p>
          </div>

          {/* Firmware selector */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-white/50 block">
              Firmware Interface
            </label>
            <div className="flex bg-black/45 rounded-lg border border-white/5 p-0.5">
              <button
                type="button"
                disabled={status === 'booting'}
                className={cn(
                  'flex-1 py-1.5 rounded text-[10px] font-black uppercase transition-all',
                  bootMode === 'uefi'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-white/45 hover:text-white disabled:opacity-30'
                )}
                onClick={() => setBootMode('uefi')}
              >
                UEFI (GUID/GPT)
              </button>
              <button
                type="button"
                disabled={status === 'booting'}
                className={cn(
                  'flex-1 py-1.5 rounded text-[10px] font-black uppercase transition-all',
                  bootMode === 'bios'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-white/45 hover:text-white disabled:opacity-30'
                )}
                onClick={() => setBootMode('bios')}
              >
                Legacy BIOS (MBR)
              </button>
            </div>
          </div>

          {/* Core Settings Info */}
          <div className="p-3 border border-white/5 bg-black/25 rounded-xl space-y-1.5 text-[10px] text-white/50 leading-relaxed">
            <div className="flex justify-between">
              <span>Primary CPU Cores</span>
              <span className="font-mono text-amber-300">8 Cores (SMP enabled)</span>
            </div>
            <div className="flex justify-between">
              <span>Firmware ROM size</span>
              <span className="font-mono text-amber-300">16 MB Flash</span>
            </div>
            <div className="flex justify-between">
              <span>Main System RAM</span>
              <span className="font-mono text-amber-300">32 GB DDR5 Dual Channel</span>
            </div>
            <div className="flex justify-between">
              <span>Primary Storage Device</span>
              <span className="font-mono text-amber-300">NVMe 512GB (ext4 Root)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {status === 'off' ? (
            <button
              type="button"
              onClick={startBoot}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 transition-all"
            >
              <Power className="h-4 w-4" />
              Power On Virtual OS
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startBoot}
                disabled={status === 'booting'}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white/10 hover:bg-white/15 active:scale-[0.98] disabled:opacity-30 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl border border-white/5 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset System
              </button>
              <button
                type="button"
                onClick={powerOff}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 active:scale-[0.98] text-red-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
              >
                <Power className="h-3.5 w-3.5" />
                Power Off
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Terminal and RAM Map */}
      <div className="flex-1 flex flex-col h-full bg-slate-950/10">
        {/* Terminal Section */}
        <div className="flex-1 flex flex-col min-h-0 bg-black/45 border-b border-white/10">
          <header className="px-4 py-2 bg-black/30 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-bold uppercase tracking-widest">
              <Terminal className="h-3.5 w-3.5 text-amber-500" />
              System Diagnostics Console
            </div>
            {status === 'booting' && (
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            )}
            {status === 'ready' && (
              <span className="flex items-center gap-1 text-emerald-400 text-[9px] font-bold uppercase">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Kernel Online
              </span>
            )}
          </header>

          <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-amber-200/90 space-y-1 select-text selection:bg-amber-500/30">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-white/20 select-none">
                <ShieldAlert className="h-10 w-10 text-white/10 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">System Offline</p>
                <p className="text-[10px] text-white/40 mt-1 max-w-xs leading-normal">
                  No electrical signal detected. Click &quot;Power On&quot; on the left panel to
                  begin the firmware instruction cycle.
                </p>
              </div>
            ) : (
              <>
                {logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 select-none mt-0.5',
                        log.stage === 'POST' &&
                          'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20',
                        log.stage === 'FIRMWARE' &&
                          'bg-amber-500/10 text-amber-300 border border-amber-500/20',
                        log.stage === 'BOOTLOADER' &&
                          'bg-purple-500/10 text-purple-300 border border-purple-500/20',
                        log.stage === 'KERNEL' &&
                          'bg-teal-500/10 text-teal-300 border border-teal-500/20',
                        log.stage === 'USERSPACE' &&
                          'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
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
        <div className="h-56 p-5 bg-black/20 shrink-0 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
              RAM Frame & Segment Allocator
            </h3>
            <p className="text-[9px] text-white/30 mt-0.5">
              Hardware visualization showing loaded segments inside the 32 GB physical memory block.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4 h-24 mt-2">
            {/* Firmware ROM Segment */}
            <div
              className={cn(
                'border rounded-xl p-3 flex flex-col justify-between transition-all duration-500',
                isSegmentActive('rom')
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)] text-amber-200'
                  : 'bg-white/3 border-white/5 text-white/30'
              )}
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  0x0000 - 0x1000
                </span>
                <Cpu
                  className={cn(
                    'h-3.5 w-3.5',
                    isSegmentActive('rom') ? 'text-amber-400' : 'opacity-20'
                  )}
                />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase">Firmware ROM</div>
                <div className="text-[8px] opacity-60">ACPI Tables & POST</div>
              </div>
            </div>

            {/* Bootloader Sector */}
            <div
              className={cn(
                'border rounded-xl p-3 flex flex-col justify-between transition-all duration-500',
                isSegmentActive('boot')
                  ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)] text-purple-200'
                  : 'bg-white/3 border-white/5 text-white/30'
              )}
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  0x1000 - 0x8000
                </span>
                <FileCode
                  className={cn(
                    'h-3.5 w-3.5',
                    isSegmentActive('boot') ? 'text-purple-400' : 'opacity-20'
                  )}
                />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase">Boot Loader</div>
                <div className="text-[8px] opacity-60">GPT/MBR Stage 2</div>
              </div>
            </div>

            {/* Kernel Space */}
            <div
              className={cn(
                'border rounded-xl p-3 flex flex-col justify-between transition-all duration-500',
                isSegmentActive('kernel')
                  ? 'bg-teal-500/10 border-teal-500/40 shadow-[0_0_12px_rgba(20,184,166,0.15)] text-teal-200'
                  : 'bg-white/3 border-white/5 text-white/30'
              )}
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  0x8000 - 0x800000
                </span>
                <Cpu
                  className={cn(
                    'h-3.5 w-3.5',
                    isSegmentActive('kernel') ? 'text-teal-400' : 'opacity-20'
                  )}
                />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase">Kernel Space</div>
                <div className="text-[8px] opacity-60">Syscalls & Sched</div>
              </div>
            </div>

            {/* User Space */}
            <div
              className={cn(
                'border rounded-xl p-3 flex flex-col justify-between transition-all duration-500',
                isSegmentActive('user')
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)] text-emerald-200'
                  : 'bg-white/3 border-white/5 text-white/30'
              )}
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  0x800000 - MAX
                </span>
                <Monitor
                  className={cn(
                    'h-3.5 w-3.5',
                    isSegmentActive('user') ? 'text-emerald-400' : 'opacity-20'
                  )}
                />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase">User Space</div>
                <div className="text-[8px] opacity-60">PID 1 & Shell apps</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
