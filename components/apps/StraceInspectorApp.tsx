'use client';

import { useState, lazy, Suspense } from 'react';
import { Play, PlayCircle, Loader2, Info, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import { useJsonRpcStream } from '@/hooks/use-json-rpc-ws';
import { cn } from '@/lib/utils';

const MONACO_CDN_VS = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';

const MonacoEditor = lazy(async () => {
  const mod = await import('@monaco-editor/react');
  mod.loader.config({ paths: { vs: MONACO_CDN_VS } });
  return { default: mod.default };
});

const C_TEMPLATE = `#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>

int main() {
    // 1. Prints to stdout (write syscall)
    printf("Initializing kernel trace...\\n");
    
    // 2. Open file (openat syscall)
    int fd = open("durgas.log", O_CREAT | O_WRONLY, 0644);
    
    // 3. Write data (write syscall)
    write(fd, "OS Sandbox execution successfully logged.\\n", 42);
    
    // 4. Close file (close syscall)
    close(fd);
    
    return 0;
}
`;

const PYTHON_TEMPLATE = `print("Running telemetry check...")

# 1. Open standard file context
with open("sys_check.txt", "w") as f:
    # 2. Write data to disk blocks
    f.write("CPU and Memory health OK\\n")
`;

interface SyscallTrace {
  syscall: string;
  args: string;
  result: string;
  ring: number;
  description: string;
}

export function StraceInspectorApp() {
  const { callStreaming } = useJsonRpcStream();
  const [language, setLanguage] = useState<'c' | 'python'>('c');
  const [code, setCode] = useState(C_TEMPLATE);
  const [running, setRunning] = useState(false);
  const [traces, setTraces] = useState<SyscallTrace[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<string>('');
  const [fallbackWarning, setFallbackWarning] = useState<string>('');

  const handleLanguageChange = (lang: 'c' | 'python') => {
    setLanguage(lang);
    setCode(lang === 'c' ? C_TEMPLATE : PYTHON_TEMPLATE);
    setTraces([]);
    setConsoleOutput('');
    setFallbackWarning('');
  };

  const handleRun = async () => {
    setRunning(true);
    setTraces([]);
    setConsoleOutput('');
    setFallbackWarning('');

    try {
      // 1. Execute Sandbox Code
      await callStreaming(
        'os_labs.run_sandbox',
        {
          code,
          language,
        },
        {
          onDone: (res) => {
            const stdout = String(res.stdout || '');
            const stderr = String(res.stderr || '');
            setConsoleOutput(stdout + (stderr ? `\n[STDERR]: ${stderr}` : ''));
            if (res.fallbackUsed) {
              setFallbackWarning(
                String(
                  res.fallbackReason || 'gcc compiler unavailable, using virtual container output.'
                )
              );
            }
          },
          onError: (err) => {
            setConsoleOutput(`[Execution Error]: ${err}`);
          },
        }
      );

      // 2. Fetch System Call Trace
      await callStreaming(
        'os_labs.trace_syscalls',
        {
          code,
          language,
        },
        {
          onDone: (res) => {
            setTraces((res.traces as SyscallTrace[]) || []);
            setRunning(false);
          },
          onError: (err) => {
            setConsoleOutput((prev) => prev + `\n[Syscall Error]: ${err}`);
            setRunning(false);
          },
        }
      );
    } catch (e) {
      setConsoleOutput(
        (prev) => prev + `\n[Subprocess Error]: Failed to contact backend container.`
      );
      setRunning(false);
    }
  };

  // Group syscalls by count
  const syscallCounts = traces.reduce(
    (acc, t) => {
      acc[t.syscall] = (acc[t.syscall] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex h-full w-full bg-slate-950/20 text-white/90">
      {/* Code Editor Pane */}
      <div className="w-1/2 border-r border-white/10 flex flex-col h-full bg-black/15">
        <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-4.5 w-4.5 text-cyan-400" />
            <span className="font-bold text-xs uppercase tracking-wider text-white/80">
              Code Sandbox
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex bg-black/45 rounded-lg border border-white/5 p-0.5">
              <button
                type="button"
                className={cn(
                  'px-2.5 py-1 rounded text-[10px] font-bold uppercase transition',
                  language === 'c'
                    ? 'bg-cyan-500/20 text-cyan-200'
                    : 'text-white/40 hover:text-white'
                )}
                onClick={() => handleLanguageChange('c')}
              >
                C (gcc)
              </button>
              <button
                type="button"
                className={cn(
                  'px-2.5 py-1 rounded text-[10px] font-bold uppercase transition',
                  language === 'python'
                    ? 'bg-cyan-500/20 text-cyan-200'
                    : 'text-white/40 hover:text-white'
                )}
                onClick={() => handleLanguageChange('python')}
              >
                Python 3
              </button>
            </div>

            {/* Run Button */}
            <button
              type="button"
              disabled={running}
              onClick={handleRun}
              className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/10 text-white font-semibold text-[10px] uppercase tracking-wider rounded-lg shadow-md transition"
            >
              {running ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              <span>{running ? 'Running...' : 'Run Code'}</span>
            </button>
          </div>
        </header>

        {/* Monaco Editor Container */}
        <div className="flex-1 min-h-0 bg-[#1e1e1e]">
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400 mr-2" />
                <span>Loading Monaco editor...</span>
              </div>
            }
          >
            <MonacoEditor
              height="100%"
              language={language === 'c' ? 'cpp' : 'python'}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? '')}
              options={{
                fontSize: 11,
                fontFamily: 'Fira Code, monospace',
                minimap: { enabled: false },
                lineNumbersMinChars: 3,
                scrollBeyondLastLine: false,
                padding: { top: 8, bottom: 8 },
              }}
            />
          </Suspense>
        </div>

        {/* Local Console Output */}
        <div className="h-36 border-t border-white/10 bg-black/60 flex flex-col shrink-0">
          <div className="px-3 py-1.5 border-b border-white/5 bg-white/5 text-[9px] uppercase tracking-widest text-white/55">
            Process Console Output (stdout/stderr)
          </div>
          <pre className="flex-1 p-3 overflow-y-auto font-mono text-[10px] text-cyan-300 leading-relaxed whitespace-pre-wrap select-text">
            {consoleOutput || 'Click "Run Code" to compile and execute program.'}
          </pre>
          {fallbackWarning && (
            <div className="px-3 py-1 bg-yellow-500/10 border-t border-yellow-500/20 text-[9px] text-yellow-300/80 flex items-center gap-1">
              <Info className="h-3 w-3 shrink-0" />
              <span>{fallbackWarning}</span>
            </div>
          )}
        </div>
      </div>

      {/* Syscall Tracer Pane */}
      <div className="w-1/2 flex flex-col h-full bg-slate-900/20">
        <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4.5 w-4.5 text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-wider text-white/80">
              Syscall Inspector (`strace`)
            </span>
          </div>
        </header>

        {traces.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-white/30 p-6">
            {running ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mb-2" />
                <span className="text-xs">Intercepting system calls on kernel boundary...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-8 w-8 text-white/20 mb-2" />
                <p className="text-xs font-semibold">Ready to trace</p>
                <p className="text-[10px] text-white/40 mt-1 max-w-xs leading-normal">
                  Write a script and hit Run. The OS tracer will capture and document every Ring 3
                  to Ring 0 boundary jump.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Counts Summary Header */}
            <div className="p-3 border-b border-white/10 bg-black/30 flex flex-wrap gap-1.5 shrink-0">
              <span className="text-[9px] uppercase font-bold text-white/40 mr-1 mt-1">
                Syscall Counts:
              </span>
              {Object.entries(syscallCounts).map(([name, count]) => (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-mono text-[9px] text-emerald-300"
                >
                  {name}: {count}
                </span>
              ))}
            </div>

            {/* Timeline List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {traces.map((trace, idx) => (
                <div key={idx} className="relative flex gap-3">
                  {/* Vertical Line Connector */}
                  {idx < traces.length - 1 && (
                    <div
                      className="absolute left-[15px] top-6 bottom-[-24px] w-0.5 bg-white/10"
                      aria-hidden
                    />
                  )}

                  {/* Indicator Icon (Privilege transition Ring 3 -> Ring 0) */}
                  <div className="w-8 h-8 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center font-mono text-[9px] font-bold text-emerald-300 shrink-0 select-none shadow">
                    R0
                  </div>

                  {/* Syscall Card */}
                  <div className="flex-1 frost-glass-surface p-3.5 border border-white/10 rounded-xl space-y-2 select-text">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black text-emerald-300">
                        {trace.syscall}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[9px] text-white/50 border border-white/5">
                        ret: {trace.result}
                      </span>
                    </div>

                    <div className="font-mono text-[9px] text-white/50 break-all leading-tight bg-black/20 p-1.5 rounded border border-white/5">
                      Args: ({trace.args})
                    </div>

                    <div className="text-[10px] text-white/70 leading-relaxed pt-0.5">
                      {trace.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
