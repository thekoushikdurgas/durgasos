'use client';

import { useEffect, useState } from 'react';
import {
  Cpu,
  Activity,
  Thermometer,
  Wind,
  AlertTriangle,
  RefreshCw,
  Zap,
  Sliders,
  Database,
  Network,
} from 'lucide-react';
import { useJsonRpcStream } from '@/hooks/use-json-rpc-ws';
import { swallowClientError } from '@/lib/safe-client-storage';
import { cn } from '@/lib/utils';

interface TelemetryData {
  simulated: {
    cpuLoad: number;
    targetCpuLoad: number;
    cpuTemp: number;
    fanRpm: number;
    cpuFrequency: number;
    throttlingActive: boolean;
    turboBoost: boolean;
    pageFaultRate: number;
    cStates: {
      C0: number;
      C1: number;
      C6: number;
    };
    gpuLoad: number;
    targetGpuLoad: number;
    gpuTemp: number;
    vramTotalGB: number;
    vramUsageGB: number;
    pcieBandwidth: number;
    gpuFrequency: number;
    tlbHitRate: number;
    swapInRate: number;
    swapOutRate: number;
  };
  host: {
    cpuPercent: number;
    ramPercent: number;
    cores: number;
    platform: string;
    arch: string;
  };
}

export function LoadVisualizerApp() {
  const { callStreaming } = useJsonRpcStream();
  const [data, setData] = useState<TelemetryData | null>(null);
  const [stressLoad, setStressLoad] = useState<number>(10);
  const [gpuStressLoad, setGpuStressLoad] = useState<number>(10);
  const [loading, setLoading] = useState(true);

  // Custom fan curve configuration: 4 node points
  const [fanCurve, setFanCurve] = useState([
    { temp: 30, rpm: 1000 },
    { temp: 50, rpm: 1800 },
    { temp: 70, rpm: 3200 },
    { temp: 90, rpm: 5200 },
  ]);
  const [savingCurve, setSavingCurve] = useState(false);

  // Poll telemetry every 1.5s
  useEffect(() => {
    let active = true;

    const fetchTelemetry = () => {
      callStreaming(
        'os_labs.get_telemetry',
        {},
        {
          onDone: (res) => {
            if (!active) return;
            setData(res as unknown as TelemetryData);
            setLoading(false);
          },
          onError: (message) => {
            swallowClientError('os-labs.telemetry', message);
          },
        }
      ).catch((err) => {
        swallowClientError('os-labs.telemetry', err);
      });
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [callStreaming]);

  const handleStressChange = async (cpuVal: number, gpuVal: number) => {
    setStressLoad(cpuVal);
    setGpuStressLoad(gpuVal);
    try {
      await callStreaming('os_labs.trigger_load', { loadPercent: cpuVal, gpuLoadPercent: gpuVal });
    } catch (err) {
      swallowClientError('os-labs.trigger_load', err);
    }
  };

  const handleFanCurveChange = (idx: number, field: 'temp' | 'rpm', val: number) => {
    const next = [...fanCurve];
    next[idx] = { ...next[idx], [field]: val };
    setFanCurve(next);
  };

  const handleSaveFanCurve = async () => {
    setSavingCurve(true);
    try {
      await callStreaming('os_labs.configure_fan_curve', { curve: fanCurve });
    } catch (err) {
      swallowClientError('os-labs.fan_curve', err);
    } finally {
      setSavingCurve(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950/20 text-xs text-white/50 backdrop-blur-sm">
        <RefreshCw className="h-5 w-5 animate-spin text-cyan-400 mb-2" />
        <span>Initializing System Telemetry Link...</span>
      </div>
    );
  }

  const sim = data.simulated;
  const host = data.host;

  // Temperature status color mapping
  const getTempColor = (t: number) => {
    if (t < 55) return 'text-emerald-400';
    if (t < 80) return 'text-yellow-400';
    return 'text-red-400 animate-pulse';
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/20 text-white/90 overflow-y-auto p-5 space-y-5">
      {/* Overview Banner */}
      <header className="flex flex-wrap items-center justify-between gap-4 p-4 border border-white/10 bg-black/30 rounded-2xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
            <Cpu className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Advanced Load & Thermal Monitor</h1>
            <p className="text-[10px] text-white/40 mt-0.5">
              Host: {host.platform} ({host.arch}) | {host.cores} Cores
            </p>
          </div>
        </div>

        {/* Warning Badge */}
        {sim.throttlingActive && (
          <div className="px-3 py-1 border border-red-500/30 bg-red-500/10 text-red-300 font-black text-[9px] uppercase tracking-wider rounded-full flex items-center gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            <span>Thermal Throttling Active! Clock Capped.</span>
          </div>
        )}
        {sim.turboBoost && !sim.throttlingActive && (
          <div className="px-3 py-1 border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-black text-[9px] uppercase tracking-wider rounded-full flex items-center gap-1">
            <Zap className="h-3 w-3 animate-bounce" />
            <span>Turbo Boost Active</span>
          </div>
        )}
      </header>

      {/* Grid of Gauges (CPU & GPU Side-by-side) */}
      <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
        {/* CPU Core Load */}
        <section className="frost-glass-surface p-4 border border-white/10 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/40">
            <span>CPU Core Load</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white/90">{sim.cpuLoad.toFixed(1)}%</div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-700"
              style={{ width: `${sim.cpuLoad}%` }}
            />
          </div>
        </section>

        {/* CPU Temperature */}
        <section className="frost-glass-surface p-4 border border-white/10 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/40">
            <span>CPU Temperature</span>
            <Thermometer className="h-4 w-4 text-yellow-400" />
          </div>
          <div className={cn('text-2xl font-black', getTempColor(sim.cpuTemp))}>
            {sim.cpuTemp.toFixed(1)}°C
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-700',
                sim.cpuTemp < 55
                  ? 'bg-emerald-400'
                  : sim.cpuTemp < 80
                    ? 'bg-yellow-400'
                    : 'bg-red-500'
              )}
              style={{ width: `${(sim.cpuTemp / 105) * 100}%` }}
            />
          </div>
        </section>

        {/* GPU Core Load */}
        <section className="frost-glass-surface p-4 border border-white/10 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/40">
            <span>GPU Core Load</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white/90">{sim.gpuLoad.toFixed(1)}%</div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-700"
              style={{ width: `${sim.gpuLoad}%` }}
            />
          </div>
        </section>

        {/* GPU Temperature */}
        <section className="frost-glass-surface p-4 border border-white/10 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/40">
            <span>GPU Temperature</span>
            <Thermometer className="h-4 w-4 text-orange-400" />
          </div>
          <div className={cn('text-2xl font-black', getTempColor(sim.gpuTemp))}>
            {sim.gpuTemp.toFixed(1)}°C
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-700',
                sim.gpuTemp < 55
                  ? 'bg-emerald-400'
                  : sim.gpuTemp < 80
                    ? 'bg-yellow-400'
                    : 'bg-red-500'
              )}
              style={{ width: `${(sim.gpuTemp / 105) * 100}%` }}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
        {/* CPU Clock Frequency */}
        <section className="frost-glass-surface p-4 border border-white/10 rounded-xl space-y-2">
          <div className="text-[9px] uppercase font-bold text-white/40">CPU Core Frequency</div>
          <div className="text-lg font-black text-white/90">{sim.cpuFrequency.toFixed(2)} GHz</div>
        </section>

        {/* GPU Core Frequency */}
        <section className="frost-glass-surface p-4 border border-white/10 rounded-xl space-y-2">
          <div className="text-[9px] uppercase font-bold text-white/40">GPU Core Frequency</div>
          <div className="text-lg font-black text-white/90">{sim.gpuFrequency.toFixed(2)} GHz</div>
        </section>

        {/* Fan Speed */}
        <section className="frost-glass-surface p-4 border border-white/10 rounded-xl space-y-2">
          <div className="text-[9px] uppercase font-bold text-white/40 flex justify-between items-center">
            <span>Cooler Fan Speed</span>
            <Wind className="h-3 w-3 text-teal-400" />
          </div>
          <div className="text-lg font-black text-white/90">{sim.fanRpm} RPM</div>
        </section>

        {/* PCIe Link Bandwidth */}
        <section className="frost-glass-surface p-4 border border-white/10 rounded-xl space-y-2">
          <div className="text-[9px] uppercase font-bold text-white/40 flex justify-between items-center">
            <span>PCIe x16 Bus Speed</span>
            <Network className="h-3 w-3 text-cyan-400" />
          </div>
          <div className="text-lg font-black text-cyan-300">
            {sim.pcieBandwidth.toFixed(2)} GB/s
          </div>
        </section>
      </div>

      {/* Stress Simulator Controller */}
      <section className="frost-glass-surface p-5 border border-white/10 rounded-2xl space-y-5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-200">
            Load Simulation Controller
          </h2>
          <p className="text-[10px] text-white/40 mt-0.5">
            Slide to generate synthetic matrix-multiply CPU and GPU stress loops on the backend and
            watch thermals react.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] uppercase font-bold text-white/55">
              <span>CPU target load</span>
              <span className="font-mono text-cyan-300">{stressLoad}%</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={stressLoad}
                onChange={(e) => handleStressChange(parseInt(e.target.value), gpuStressLoad)}
                className="flex-1 accent-cyan-400 cursor-pointer h-1 rounded-lg bg-white/10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] uppercase font-bold text-white/55">
              <span>GPU target load</span>
              <span className="font-mono text-emerald-300">{gpuStressLoad}%</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={gpuStressLoad}
                onChange={(e) => handleStressChange(stressLoad, parseInt(e.target.value))}
                className="flex-1 accent-emerald-400 cursor-pointer h-1 rounded-lg bg-white/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Fan Curve Editor */}
      <section className="frost-glass-surface p-5 border border-white/10 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
              <Sliders className="h-4 w-4" />
              Dynamic ACPI Fan Curve Tuner
            </h2>
            <p className="text-[10px] text-white/40 mt-0.5">
              Configure cooling fan RPM targets dynamically across thermal threshold nodes.
            </p>
          </div>
          <button
            type="button"
            disabled={savingCurve}
            onClick={handleSaveFanCurve}
            className="px-3 py-1 bg-teal-600 hover:bg-teal-500 active:scale-[0.98] disabled:bg-white/10 text-white font-semibold text-[10px] uppercase tracking-wider rounded-lg shadow-md transition-all"
          >
            {savingCurve ? 'Applying...' : 'Apply Fan Curve'}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-4 grid-cols-2">
          {fanCurve.map((node, idx) => (
            <div key={idx} className="p-3 border border-white/5 bg-black/25 rounded-xl space-y-2">
              <div className="text-[10px] uppercase font-bold text-white/50 text-center border-b border-white/5 pb-1">
                Node {idx + 1}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-white/40 uppercase">Temp</span>
                  <span className="font-mono text-teal-300 font-bold">{node.temp}°C</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={node.temp}
                  onChange={(e) => handleFanCurveChange(idx, 'temp', parseInt(e.target.value))}
                  className="w-full accent-teal-400 h-0.5 cursor-pointer rounded-lg bg-white/10"
                />

                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-white/40 uppercase">Fan RPM</span>
                  <span className="font-mono text-cyan-300 font-bold">{node.rpm}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="5200"
                  step="100"
                  value={node.rpm}
                  onChange={(e) => handleFanCurveChange(idx, 'rpm', parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-0.5 cursor-pointer rounded-lg bg-white/10"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lower Technical Panels */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Power States & C-State Residency */}
        <section className="frost-glass-surface p-5 border border-white/10 rounded-2xl space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/80">
              CPU C-State Sleep Residency
            </h3>
            <p className="text-[10px] text-white/40 mt-0.5">
              CPU sleeps inside deep C-states when execution queue is empty.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { label: 'C0 (Active Core Execution)', value: sim.cStates.C0, color: 'bg-cyan-400' },
              { label: 'C1 (Halt Clock Phase)', value: sim.cStates.C1, color: 'bg-yellow-400/80' },
              { label: 'C6 (Deep Transistor Sleep)', value: sim.cStates.C6, color: 'bg-white/20' },
            ].map((state) => (
              <div key={state.label} className="space-y-1">
                <div className="flex justify-between text-[10px] text-white/60">
                  <span>{state.label}</span>
                  <span className="font-mono text-cyan-200">{state.value.toFixed(1)}%</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', state.color)}
                    style={{ width: `${state.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Operating System Memory & Page Faults */}
        <section className="frost-glass-surface p-5 border border-white/10 rounded-2xl space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/80">
              Memory & Page Translation Rates
            </h3>
            <p className="text-[10px] text-white/40 mt-0.5">
              Translation metrics between MMU and physical RAM frames.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border border-white/5 bg-black/25 rounded-xl space-y-2">
              <span className="text-[9px] uppercase tracking-wide text-white/45 block text-center">
                Translation Metrics
              </span>
              <div className="flex justify-between items-center text-[10px] text-white/60 pt-1">
                <span>Page Faults</span>
                <span className="font-mono text-yellow-300 font-bold">
                  {sim.pageFaultRate.toFixed(1)} /s
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-white/60">
                <span>TLB Hit Rate</span>
                <span className="font-mono text-emerald-300 font-bold">
                  {sim.tlbHitRate.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="p-3 border border-white/5 bg-black/25 rounded-xl space-y-2">
              <span className="text-[9px] uppercase tracking-wide text-white/45 block text-center">
                Swap partition load
              </span>
              <div className="flex justify-between items-center text-[10px] text-white/60 pt-1">
                <span>Swap-In Rate</span>
                <span className="font-mono text-orange-400 font-bold">
                  {sim.swapInRate.toFixed(2)} pages/s
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-white/60">
                <span>Swap-Out Rate</span>
                <span className="font-mono text-red-400 font-bold">
                  {sim.swapOutRate.toFixed(2)} pages/s
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border border-white/5 bg-black/25 rounded-xl text-center space-y-1">
              <span className="text-[9px] uppercase tracking-wide text-white/45">
                VRAM allocation
              </span>
              <div className="text-lg font-black text-emerald-300">
                {sim.vramUsageGB.toFixed(2)} / {sim.vramTotalGB.toFixed(1)} GB
              </div>
            </div>

            <div className="p-3 border border-white/5 bg-black/25 rounded-xl text-center space-y-1">
              <span className="text-[9px] uppercase tracking-wide text-white/45">
                Host Memory Usage
              </span>
              <div className="text-lg font-black text-cyan-300">{host.ramPercent.toFixed(1)}%</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
