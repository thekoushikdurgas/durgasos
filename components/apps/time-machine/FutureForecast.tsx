'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  ShieldAlert,
  HelpCircle,
  Compass,
  RefreshCw,
  Flame,
  ChevronRight,
  Sliders,
  Eye,
  TrendingUp,
  Layers,
} from 'lucide-react';

interface Milestone {
  year: string;
  title: string;
  description: string;
  probability: number;
  outcomeType?: string;
}

interface ProjectionScenario {
  milestoneYear: string;
  scenarioTitle: string;
  scenarioDetails: string;
  futureImpact: string;
  confidenceRating?: string;
}

interface TrendPoint {
  yearOffset: number;
  low: number;
  median: number;
  high: number;
}

interface ConfidenceIntervalInfo {
  metricName: string;
  explanation: string;
}

interface ForecastData {
  historicalTrendSummary: string;
  milestones: Milestone[];
  projections: ProjectionScenario[];
  trendPoints?: TrendPoint[];
  confidenceIntervalInfo?: ConfidenceIntervalInfo;
}

interface FutureForecastProps {
  forecastData: ForecastData | null;
  selectedEraName: string;
  selectedLocation: string;
  selectedDate: string;

  // Custom interactive parameters
  techLevel: string;
  setTechLevel: (v: string) => void;
  societalChange: string;
  setSocietalChange: (v: string) => void;
  environmentalShift: string;
  setEnvironmentalShift: (v: string) => void;
  timeHorizon: string;
  setTimeHorizon: (v: string) => void;
  customCatalyst: string;
  setCustomCatalyst: (v: string) => void;
  currentTrends: string;
  setCurrentTrends: (v: string) => void;

  forecastTopic: string;
  setForecastTopic: (v: string) => void;

  // Historical event themes multi-toggle parameter
  historicalEventTypes: string;
  setHistoricalEventTypes: (v: string) => void;

  forecastLoading: boolean;
  onSimulate: () => void;
}

const TrendChart = ({ points, info }: { points: TrendPoint[]; info?: ConfidenceIntervalInfo }) => {
  if (!points || points.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getX = (offset: number) => {
    return paddingLeft + (offset / 250) * chartW;
  };

  const getY = (val: number) => {
    return paddingTop + chartH - (val / 100) * chartH;
  };

  const lowPointsStr = points.map((p) => `${getX(p.yearOffset)},${getY(p.low)}`).join(' ');
  const highPointsStr = [...points]
    .reverse()
    .map((p) => `${getX(p.yearOffset)},${getY(p.high)}`)
    .join(' ');
  const polygonPoints = `${getX(0)},${getY(52)} ${lowPointsStr} ${getX(250)},${getY(points[points.length - 1].high)} ${highPointsStr} ${getX(0)},${getY(52)}`;

  const medianPointsStr =
    `${getX(0)},${getY(52)} ` +
    points.map((p) => `${getX(p.yearOffset)},${getY(p.median)}`).join(' ');

  return (
    <div className="bg-[#0b0b0e] border border-white/5 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="space-y-0.5">
          <span className="text-[10.5px] font-mono tracking-widest text-cyan-400 font-bold uppercase block">
            🌌 Speculative Extrapolation Spectrum
          </span>
          <h4 className="text-xs font-bold text-zinc-350 font-sans">
            {info?.metricName || 'Speculative Development Index'} over Future Years (Time Horizon)
          </h4>
        </div>
        <div className="flex items-center gap-4 text-[9px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1.5 bg-cyan-400 rounded-sm inline-block" />
            <span className="text-zinc-405">Median Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1.5 bg-cyan-400/10 border border-cyan-400/25 rounded-sm inline-block" />
            <span className="text-zinc-405">Confidence Interval (±)</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines (Y) */}
          {[0, 25, 50, 75, 100].map((val) => (
            <g key={val} className="opacity-40">
              <line
                x1={paddingLeft}
                y1={getY(val)}
                x2={width - paddingRight}
                y2={getY(val)}
                stroke="#2c2c35"
                strokeWidth={0.5}
                strokeDasharray="2 3"
              />
              <text
                x={paddingLeft - 8}
                y={getY(val) + 3}
                textAnchor="end"
                className="fill-zinc-450 font-mono text-[8.5px]"
              >
                {val}%
              </text>
            </g>
          ))}

          {/* Grid Lines (X) */}
          {[0, 25, 50, 100, 250].map((offset) => (
            <g key={offset} className="opacity-40">
              <line
                x1={getX(offset)}
                y1={paddingTop}
                x2={getX(offset)}
                y2={height - paddingBottom}
                stroke="#2c2c35"
                strokeWidth={0.5}
                strokeDasharray="2 3"
              />
              <text
                x={getX(offset)}
                y={height - paddingBottom + 12}
                textAnchor="middle"
                className="fill-zinc-455 font-mono text-[8.5px]"
              >
                +{offset}y
              </text>
            </g>
          ))}

          {/* Shaded Area for Confidence Interval */}
          <polygon
            points={polygonPoints}
            fill="url(#areaGrad)"
            stroke="#22d3ee"
            strokeOpacity={0.12}
            strokeWidth={0.75}
          />

          {/* Median Projection trend line */}
          <polyline
            points={medianPointsStr}
            fill="none"
            stroke="#22d3ee"
            strokeWidth={2}
            className="drop-shadow-[0_0_3px_rgba(34,211,238,0.3)]"
          />

          {/* Interactive Reference dots */}
          <circle
            cx={getX(0)}
            cy={getY(52)}
            r={3.5}
            fill="#22d3ee"
            stroke="#000000"
            strokeWidth={1}
          />
          {points.map((p, i) => (
            <g key={i}>
              <line
                x1={getX(p.yearOffset)}
                y1={getY(p.low)}
                x2={getX(p.yearOffset)}
                y2={getY(p.high)}
                stroke="#22d3ee"
                strokeWidth={1}
                strokeOpacity={0.25}
              />
              <line
                x1={getX(p.yearOffset) - 3}
                y1={getY(p.high)}
                x2={getX(p.yearOffset) + 3}
                y2={getY(p.high)}
                stroke="#22d3ee"
                strokeWidth={1}
                strokeOpacity={0.5}
              />
              <line
                x1={getX(p.yearOffset) - 3}
                y1={getY(p.low)}
                x2={getX(p.yearOffset) + 3}
                y2={getY(p.low)}
                stroke="#22d3ee"
                strokeWidth={1}
                strokeOpacity={0.5}
              />
              <circle
                cx={getX(p.yearOffset)}
                cy={getY(p.median)}
                r={3.5}
                fill="#22d3ee"
                stroke="#09090b"
                strokeWidth={1.5}
              />
            </g>
          ))}
        </svg>
      </div>

      <p className="text-[11px] text-zinc-450 font-sans leading-relaxed pt-1 select-text">
        {info?.explanation}
      </p>
    </div>
  );
};

export default function FutureForecast({
  forecastData,
  selectedEraName,
  selectedLocation,
  selectedDate,
  techLevel,
  setTechLevel,
  societalChange,
  setSocietalChange,
  environmentalShift,
  setEnvironmentalShift,
  timeHorizon,
  setTimeHorizon,
  customCatalyst,
  setCustomCatalyst,
  currentTrends,
  setCurrentTrends,
  forecastTopic,
  setForecastTopic,
  historicalEventTypes,
  setHistoricalEventTypes,
  forecastLoading,
  onSimulate,
}: FutureForecastProps) {
  // Preset configuration choices
  const techLevels = ['Low', 'Moderate', 'High', 'Extreme'];

  const societalDynamics = [
    { value: 'Static', label: 'Static/Sustained' },
    { value: 'Moderate Evolution', label: 'Evolutionary' },
    { value: 'Radical Adaptation', label: 'Radical Pivot' },
    { value: 'Post-Scarcity Utopia', label: 'Post-Scarcity' },
  ];

  const environmentalShifts = [
    { value: 'Stable', label: 'Stable/Regulated' },
    { value: 'Resource Scarcity', label: 'Scarcity Crisis' },
    { value: 'Extreme Climate Shifts', label: 'Extreme Shift' },
    { value: 'Eco-Techno Harmony', label: 'Eco-Symbiosis' },
  ];

  const horizons = [
    { value: 'Immediate Centenary (100-300 yrs)', label: 'Centenary (100–300y)' },
    { value: 'Deep Millennial (500-1000 yrs)', label: 'Millennial (500–1000y)' },
    { value: 'Far Epochal (2000+ yrs)', label: 'Epochal (2000y+)' },
  ];

  const eventThemes = [
    { value: 'Sovereignty & Charters', label: 'Politics & Pacts' },
    { value: 'Discoveries & Technics', label: 'Science & Inventions' },
    { value: 'Faith & Philosophy', label: 'Culture & Philosophy' },
    { value: 'Trade, Mercantilism & Coin', label: 'Commerce & Trade' },
    { value: 'Conquests & Alliances', label: 'Military & Alliances' },
  ];

  const toggleTheme = (val: string) => {
    const list = historicalEventTypes ? historicalEventTypes.split(',').map((s) => s.trim()) : [];
    if (list.includes(val)) {
      const filtered = list.filter((item) => item !== val);
      setHistoricalEventTypes(filtered.join(', '));
    } else {
      list.push(val.trim());
      setHistoricalEventTypes(list.join(', '));
    }
  };

  // Dynamically calculate a mock simulation divergence factor based on choices to increase immersion
  const getSimulationFactors = () => {
    let complexity = 50;
    if (techLevel === 'Extreme') complexity += 25;
    if (techLevel === 'High') complexity += 15;
    if (societalChange.includes('Radical') || societalChange.includes('Post-Scarcity'))
      complexity += 15;
    if (environmentalShift.includes('Extreme') || environmentalShift.includes('Scarcity'))
      complexity += 15;
    if (customCatalyst.trim().length > 0) complexity += 10;
    if (currentTrends.trim().length > 0) complexity += 10;
    return Math.min(100, complexity);
  };

  const simulationDivergence = getSimulationFactors();

  return (
    <div className="space-y-8 font-sans" id="forecast-module">
      {/* SECTION 1: Forecaster Parameter Setting Dashboard */}
      <div className="bg-[#0e0e12] border border-white/5 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-400/20">
              <Sliders className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-widest text-white uppercase font-serif italic">
                Predictive Calibration Deck
              </h3>
              <p className="text-[11px] text-zinc-400">
                Calibrate custom multi-variable parameters & trends to map speculative future
                scenarios.
              </p>
            </div>
          </div>

          {/* Active Anchor Coordinates pill */}
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <span className="text-[9px] font-mono tracking-wider bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full border border-white/5">
              ⚓ Anchor: {selectedEraName || 'Antiquity'} ({selectedDate})
            </span>
          </div>
        </div>

        {/* Dynamic Selectors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Sector Focus Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
              — Sector Node Focus
            </label>
            <select
              value={forecastTopic}
              onChange={(e) => setForecastTopic(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 font-mono text-xs text-cyan-300 font-semibold border border-white/10 hover:border-white/20 focus:border-cyan-400 focus:outline-none transition active:scale-[0.99]"
            >
              <option value="Urban Architecture & Ecology">Urban Architecture & Ecology</option>
              <option value="Information Systems & Custody">Information Systems & Custody</option>
              <option value="Socio-Political Hierarchies & Law">
                Socio-Political Hierarchies & Law
              </option>
              <option value="Biotechnics & Environmental Harmony">
                Biotechnics & Environmental Harmony
              </option>
            </select>
          </div>

          {/* 1b. Historical Event/Trend Themes */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
              — Historical Event Types to Synthesize
            </label>
            <div className="flex flex-wrap gap-1">
              {eventThemes.map((theme) => {
                const isActive = (historicalEventTypes || '')
                  .split(',')
                  .map((s) => s.trim())
                  .includes(theme.value);
                return (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => toggleTheme(theme.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-[9.5px] font-mono border transition duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 font-bold'
                        : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/10'
                    }`}
                  >
                    {theme.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Temporal Horizon Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
              — Speculative Time Horizon
            </label>
            <div className="flex flex-wrap gap-1">
              {horizons.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setTimeHorizon(h.value)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition duration-200 cursor-pointer ${
                    timeHorizon === h.value
                      ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/10'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tech level Pill bar selectors */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
              — Technology Advancements Intensity
            </label>
            <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-white/5">
              {techLevels.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setTechLevel(lvl)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition duration-150 cursor-pointer ${
                    techLevel === lvl
                      ? 'bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Societal Dynamics */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
              — Societal & Cultural Changes Pace
            </label>
            <div className="flex flex-wrap gap-1">
              {societalDynamics.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSocietalChange(item.value)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition duration-200 cursor-pointer ${
                    societalChange === item.value
                      ? 'bg-amber-500/10 border-amber-400 text-amber-300 font-bold'
                      : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Ecological Gravity */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
              — Environmental & Climate Shifts
            </label>
            <div className="flex flex-wrap gap-1">
              {environmentalShifts.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setEnvironmentalShift(item.value)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition duration-200 cursor-pointer ${
                    environmentalShift === item.value
                      ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300 font-bold'
                      : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Custom Predictive Catalyst */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
              — Custom Speculative Driver/Catalyst (e.g. AI Singularity)
            </label>
            <input
              type="text"
              value={customCatalyst}
              onChange={(e) => setCustomCatalyst(e.target.value)}
              placeholder="e.g. Alien contact, underwater colonies, nuclear reset"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 hover:border-white/20 focus:border-cyan-400 focus:outline-none text-xs text-zinc-205 placeholder-zinc-600 transition"
            />
          </div>

          {/* 7. Observed Current/Present Trends */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
              — Observed Current/Present Trends
            </label>
            <input
              type="text"
              value={currentTrends}
              onChange={(e) => setCurrentTrends(e.target.value)}
              placeholder="e.g. Generative AI agents, decentralized crypto networks, green energy grid"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 hover:border-white/20 focus:border-cyan-400 focus:outline-none text-xs text-zinc-205 placeholder-zinc-600 transition"
            />
          </div>
        </div>

        {/* Trigger Button & Dashboard Feedback Metrics Row */}
        <div className="bg-zinc-950/80 rounded-xl p-4 border border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="space-y-1">
              <span className="block text-[8px] uppercase text-zinc-500 tracking-wider">
                Simulation Variance Index
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold tracking-wider">
                  {simulationDivergence}%
                </span>
                <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-500"
                    style={{ width: `${simulationDivergence}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-white/5 hidden sm:block" />

            <div className="space-y-1">
              <span className="block text-[8px] uppercase text-zinc-500 tracking-wider">
                Predictive Fidelity
              </span>
              <span className="text-zinc-400 font-bold tracking-wider">
                {techLevel === 'Extreme' ? 'HYPER-SPECULATIVE' : 'SECURE_LOOP'}
              </span>
            </div>
          </div>

          <button
            onClick={onSimulate}
            disabled={forecastLoading || !selectedEraName}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black text-xs font-bold font-mono tracking-wider uppercase rounded-xl transition duration-300 disabled:opacity-40 flex items-center justify-center gap-2 group cursor-pointer shadow-[0_4px_16px_rgba(34,211,238,0.15)] active:scale-[0.98]"
          >
            {forecastLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                DIVERGING TIMELINE...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-black hover:scale-110 transition" />
                SIMULATE_FORESIGHT
              </>
            )}
          </button>
        </div>
      </div>

      {/* HISTORICAL FORECAST TRENDS DISCLAIMER */}
      <div className="p-4 bg-amber-955/25 border border-amber-500/25 rounded-2xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1 text-xs">
          <span className="font-mono font-bold uppercase tracking-wider text-amber-500 block">
            ⚠️ HIGHLY SPECULATIVE FORESIGHT DISCLAIMER
          </span>
          <p className="text-zinc-300 leading-relaxed font-sans text-[11px]">
            Future scenarios generated herein are purely speculative extrapolations based on locked
            historical trends, chosen focus vectors, and selected parameters. These projections are
            mathematical and stylistic simulations using generative AI technology. They possess no
            absolute predictive accuracy and must not be treated as deterministic blueprints for
            actual local future occurrences.
          </p>
        </div>
      </div>

      {/* SECTION 2: Scenarios & Data Display */}
      {!forecastData ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-2xl bg-[#0c0c0e]/40 text-center">
          <Compass className="w-10 h-10 text-cyan-400/40 mb-3.5 animate-pulse" />
          <h4 className="text-sm font-bold text-zinc-400 font-mono uppercase tracking-widest">
            Awaiting Nexus Calibration
          </h4>
          <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
            Select stress parameters above and trigger the foresight model. The system will
            extrapolate localized future milestones based on target historical data structures.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Historical Trend Summary Banner */}
          <div className="p-5 bg-[#0e0e12] border border-cyan-400/25 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl" />

            <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-mono tracking-widest font-bold uppercase">
                Temporal Connection Analysis Core
              </span>
            </div>

            <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest leading-none mb-2">
              How history shapes the future in {selectedLocation.split(',')[0]} (Focus:{' '}
              {forecastTopic})
            </h4>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic border-l-2 border-cyan-400 pl-4">
              &ldquo;{forecastData.historicalTrendSummary}&rdquo;
            </p>
          </div>

          {/* Interpolation Trend Projection Wave Chart */}
          {forecastData.trendPoints && (
            <TrendChart
              points={forecastData.trendPoints}
              info={forecastData.confidenceIntervalInfo}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side: Future Timeline Milestones */}
            <div className="bg-[#0c0c10]/40 border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="text-[10px] text-zinc-400 font-bold font-mono tracking-widest uppercase flex items-center justify-between gap-1.5 border-b border-white/5 pb-3">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Speculative Path Milestones
                </span>
                <span className="text-[8px] bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded font-mono border border-cyan-400/20">
                  POTENTIAL BRANCH
                </span>
              </div>

              <div className="p-3 bg-cyan-500/5 text-cyan-300 rounded-xl border border-cyan-400/10 text-[10px] leading-relaxed mb-2 font-mono flex items-center gap-2">
                <span>✦</span>
                <span>
                  Milestones are generated as speculative forks of human history based on
                  convergence of trends and chosen parameters, not static fate.
                </span>
              </div>

              <div className="relative border-l border-white/10 pl-4 ml-2.5 space-y-6 pt-2">
                {forecastData.milestones?.map((m, idx) => (
                  <div key={idx} className="relative group">
                    {/* Milestone Node */}
                    <div className="absolute -left-[22.5px] top-1 w-4 h-4 rounded-full bg-[#0c0c0e] border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.5)] transition duration-300 group-hover:scale-110">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-300">{m.year}</span>
                        <span className="text-zinc-650">•</span>
                        <span className="text-[9px] font-mono uppercase tracking-wider bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded">
                          Speculative Likelihood: {m.probability}%
                        </span>
                        {m.outcomeType && (
                          <span className="text-[9px] font-mono uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded animate-pulse">
                            {m.outcomeType}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-extrabold text-zinc-150 font-serif italic py-0.5 leading-snug">
                        {m.title}
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{m.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Projections Scenarios */}
            <div className="space-y-4">
              <div className="text-[10px] text-zinc-400 font-bold font-mono tracking-widest uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Speculative Projection Scenarios
                </span>
                <span className="text-[8px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-400/20">
                  MULTIPLE OUTCOMES
                </span>
              </div>

              <div className="space-y-4">
                {forecastData.projections?.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-zinc-950 border border-white/5 rounded-2xl hover:border-cyan-400/30 transition-all duration-300 flex flex-col justify-between group overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-400/5 to-transparent rounded-full opacity-60 pointer-events-none" />

                    <div className="space-y-2 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-400/15">
                          Target Year: {p.milestoneYear}
                        </span>
                        {p.confidenceRating && (
                          <span className="text-[9px] font-mono uppercase tracking-wider bg-orange-500/10 border border-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                            Volatility: {p.confidenceRating}
                          </span>
                        )}
                      </div>

                      <h5 className="text-sm font-extrabold text-white font-serif py-1 italic group-hover:text-cyan-300 transition-colors">
                        {p.scenarioTitle}
                      </h5>

                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                        {p.scenarioDetails}
                      </p>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-white/5 space-y-1.5">
                      <div className="text-[8.5px] uppercase tracking-widest font-mono text-zinc-500 font-bold">
                        Projected Future Impact Index
                      </div>
                      <p className="text-xs text-cyan-300 leading-relaxed italic">
                        &ldquo;{p.futureImpact}&rdquo;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
