import React, { useState, useEffect, useRef } from 'react';
import { useStore } from './store';
import { Difficulty, ProfileStats } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Activity } from 'lucide-react';

interface ScorePoint {
  id: string;
  date: number;
  score: number;
  difficulty: Difficulty;
  time: number;
}

interface ScoreChartProps {
  stats?: ProfileStats;
}

export const ScoreChart: React.FC<ScoreChartProps> = ({ stats }) => {
  const { profileStats: globalStats } = useStore();
  const profileStats = stats || globalStats;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 260 });
  const [hoveredPoint, setHoveredPoint] = useState<ScorePoint | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  // Handle responsiveness via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      const height = Math.min(300, Math.max(240, width * 0.45));
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const data: ScorePoint[] = profileStats.recentScores || [];
  const last10 = data.slice(-10);

  if (last10.length === 0) {
    return (
      <div className="bg-slate-800/80 border border-slate-700 p-8 text-center text-slate-400 rounded-xl">
        <Activity size={32} className="mx-auto mb-3 text-slate-500 animate-pulse" />
        <p className="font-semibold text-white mb-1">No scores available</p>
        <p className="text-xs">Solve single-player games to start tracking score improvements!</p>
      </div>
    );
  }

  // Margins
  const margin = { top: 25, right: 30, bottom: 35, left: 45 };
  const { width, height } = dimensions;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Manual Scaling Calculations
  const scores = last10.map((d) => d.score);
  const minVal = Math.min(...scores);
  const maxVal = Math.max(...scores);
  const yBottom = Math.max(0, minVal * 0.8);
  const yTop = maxVal === yBottom ? yBottom + 1000 : maxVal * 1.15;
  const yRange = yTop - yBottom;

  const xScale = (index: number) => {
    const divisor = Math.max(1, last10.length - 1);
    return margin.left + (index / divisor) * chartWidth;
  };

  const yScale = (score: number) => {
    return height - margin.bottom - ((score - yBottom) / yRange) * chartHeight;
  };

  // Build line & area path strings
  const points = last10.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.score),
  }));

  const linePath =
    points.length > 0 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - margin.bottom} L ${points[0].x} ${height - margin.bottom} Z`
      : '';

  // Generate 5 Y-axis grid ticks
  const ticksY: number[] = [];
  const tickStep = yRange / 4;
  for (let i = 0; i <= 4; i++) {
    ticksY.push(Math.round(yBottom + i * tickStep));
  }

  const getDiffColor = (diff: Difficulty) => {
    switch (diff) {
      case 'Very Easy':
        return 'text-teal-400 border-teal-400/20 bg-teal-500/10';
      case 'Easy':
        return 'text-emerald-400 border-emerald-400/20 bg-emerald-500/10';
      case 'Medium':
        return 'text-sky-400 border-sky-400/20 bg-sky-500/10';
      case 'Hard':
        return 'text-amber-400 border-amber-400/20 bg-amber-500/10';
      case 'Expert':
        return 'text-rose-400 border-rose-400/20 bg-rose-500/10';
      default:
        return 'text-slate-400 border-slate-400/20 bg-slate-500/10';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const initialScore = last10[0]?.score || 0;
  const latestScore = last10[last10.length - 1]?.score || 0;
  const improvement = latestScore - initialScore;
  const improvementPercent = initialScore > 0 ? Math.round((improvement / initialScore) * 100) : 0;

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 p-6 flex flex-col relative overflow-visible rounded-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Analytics
          </div>
          <h4 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
            <TrendingUp size={18} className="text-indigo-400" />
            Performance Curve
          </h4>
        </div>

        {improvementPercent !== 0 && (
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border ${
              improvementPercent >= 0
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
            }`}
          >
            <span>
              {improvementPercent >= 0 ? '+' : ''}
              {improvementPercent}%
            </span>
            <span className="text-slate-500 uppercase text-[9px] font-normal">last 10 games</span>
          </div>
        )}
      </div>

      <div ref={containerRef} className="w-full relative select-none">
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id="chartGlowArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chartLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <g>
            {ticksY.map((tick, i) => (
              <line
                key={i}
                x1={margin.left}
                y1={yScale(tick)}
                x2={width - margin.right}
                y2={yScale(tick)}
                stroke="#334155"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity="0.4"
              />
            ))}
          </g>

          <line
            x1={margin.left}
            y1={height - margin.bottom}
            x2={width - margin.right}
            y2={height - margin.bottom}
            stroke="#334155"
            strokeWidth={1}
            opacity="0.3"
          />

          {/* Y Axis */}
          <g className="text-[9px] font-mono text-slate-500 fill-slate-500 font-bold">
            {ticksY.map((tick, i) => (
              <text key={i} x={margin.left - 10} y={yScale(tick) + 3} textAnchor="end">
                {tick}
              </text>
            ))}
          </g>

          {/* X Axis */}
          <g className="text-[9px] font-mono text-slate-500 fill-slate-500 font-bold">
            {last10.map((_, i) => (
              <text key={i} x={xScale(i)} y={height - margin.bottom + 18} textAnchor="middle">
                G{last10.length - 9 + i}
              </text>
            ))}
          </g>

          {/* Paths */}
          {areaPath && <path d={areaPath} fill="url(#chartGlowArea)" />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#chartLineGradient)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}

          {/* Interactive cursor line */}
          {hoveredPoint !== null && (
            <line
              x1={hoverPos.x}
              y1={margin.top}
              x2={hoverPos.x}
              y2={height - margin.bottom}
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              opacity="0.5"
            />
          )}

          {/* Points */}
          <g>
            {last10.map((d, i) => {
              const x = xScale(i);
              const y = yScale(d.score);
              const isHovered = hoveredIndex === i;

              return (
                <g key={d.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 10 : 5}
                    fill={isHovered ? '#6366f1' : '#4f46e5'}
                    opacity={isHovered ? 0.35 : 0}
                    className="transition-all duration-200"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 5.5 : 4}
                    fill={isHovered ? '#818cf8' : '#6366f1'}
                    stroke="#1e293b"
                    strokeWidth={1.5}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => {
                      setHoveredPoint(d);
                      setHoveredIndex(i);
                      setHoverPos({ x, y });
                    }}
                    onMouseLeave={() => {
                      setHoveredPoint(null);
                      setHoveredIndex(null);
                    }}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute',
                left: `calc(${hoverPos.x}px - 80px)`,
                top: `calc(${hoverPos.y}px - 100px)`,
              }}
              className="z-40 w-40 bg-slate-900 border border-slate-700/80 p-2.5 rounded-lg shadow-2xl pointer-events-none backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                  GAME {last10.indexOf(hoveredPoint) + 1}
                </span>
                <span
                  className={`text-[9px] uppercase px-1 py-0.5 rounded border leading-none font-bold ${getDiffColor(hoveredPoint.difficulty)}`}
                >
                  {hoveredPoint.difficulty}
                </span>
              </div>
              <div className="text-base font-black text-white font-mono leading-none tracking-tight">
                {hoveredPoint.score}
                <span className="text-[10px] font-semibold text-slate-400 font-sans ml-0.5">
                  pts
                </span>
              </div>
              <div className="mt-1.5 pt-1 border-t border-slate-800 flex justify-between text-[9px] text-slate-500 font-bold uppercase">
                <span>TIME:</span>
                <span className="font-mono text-slate-200">{formatTime(hoveredPoint.time)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>Point Nodes</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-gradient-to-r from-indigo-400 to-indigo-600 inline-block" />
          <span>Scores Curve</span>
        </div>
      </div>
    </div>
  );
};
export default ScoreChart;
