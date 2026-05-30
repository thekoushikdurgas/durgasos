'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map,
  Zap,
  Shield,
  Globe as GlobeIcon,
  TrendingUp,
  Radio,
  Activity,
  Layers,
  Settings,
  RefreshCw,
  X,
  Clock,
  Search,
  AlertTriangle,
  Loader2,
  Users,
  Info,
} from 'lucide-react';
import { getBackendOrigin } from '@/lib/backend-url';

// Dynamically load the react-globe.gl component to avoid SSR errors
const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-xs text-white/50">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <span>Initializing orbital vectors...</span>
      </div>
    </div>
  ),
});

const GlobeAny = Globe as any;

export interface EventMarkerData {
  id: string;
  lat: number;
  lng: number;
  name: string;
  size: number;
  color: string;
  category: string;
  summary: string;
  title: string;
  country: string;
  daysAgo?: number;
  isFallback?: boolean;
}

export type MapStyleId = 'dark' | 'satellite' | 'night' | 'monochrome' | 'highcontrast' | 'cyber';
export type HeatmapMode = 'off' | 'density' | 'category';

interface NewsData {
  headline: string;
  summary: string;
  details: string[];
  timestamp: string;
}

interface NewsResponse {
  data: NewsData;
  groundingMetadata?: any;
}

const STYLE_CONFIG = {
  dark: {
    globeImageUrl: 'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
    bumpImageUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    backgroundImageUrl: 'https://unpkg.com/three-globe/example/img/night-sky.png',
    wrapperClass: '',
  },
  satellite: {
    globeImageUrl: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    bumpImageUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    backgroundImageUrl: 'https://unpkg.com/three-globe/example/img/night-sky.png',
    wrapperClass: '',
  },
  night: {
    globeImageUrl: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
    bumpImageUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    backgroundImageUrl: 'https://unpkg.com/three-globe/example/img/night-sky.png',
    wrapperClass: '',
  },
  monochrome: {
    globeImageUrl: 'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
    bumpImageUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    backgroundImageUrl: null,
    wrapperClass: 'brightness-75 contrast-125 saturate-0',
  },
  highcontrast: {
    globeImageUrl: 'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
    bumpImageUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    backgroundImageUrl: 'https://unpkg.com/three-globe/example/img/night-sky.png',
    wrapperClass: 'contrast-150 brightness-110 saturate-125',
  },
  cyber: {
    globeImageUrl: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
    bumpImageUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    backgroundImageUrl: null,
    wrapperClass: 'hue-rotate-180 brightness-90 saturate-200',
  },
};

const STYLES_LIST: { id: MapStyleId; label: string; desc: string }[] = [
  { id: 'dark', label: 'Tactical Dark', desc: 'Default radar standard' },
  { id: 'satellite', label: 'Satellite Earth', desc: 'True color terrain' },
  { id: 'night', label: 'City Lights', desc: 'Orbital night glow' },
  { id: 'monochrome', label: 'Slick Slate', desc: 'High-contrast gray' },
  { id: 'highcontrast', label: 'Vivid Contrast', desc: 'Enhanced topography' },
  { id: 'cyber', label: 'Cyber Terminal', desc: 'Deep neon overlay' },
];

const CATEGORIES: { id: string; label: string; color: string; icon: React.ReactNode }[] = [
  {
    id: 'Geopolitics',
    label: 'Geopolitics',
    color: '#3b82f6',
    icon: <GlobeIcon className="w-4 h-4 text-blue-500" />,
  },
  {
    id: 'Energy',
    label: 'Energy',
    color: '#eab308',
    icon: <Zap className="w-4 h-4 text-yellow-500" />,
  },
  {
    id: 'Military',
    label: 'Military',
    color: '#ef4444',
    icon: <Shield className="w-4 h-4 text-red-500" />,
  },
  {
    id: 'Economy',
    label: 'Economy',
    color: '#22c55e',
    icon: <TrendingUp className="w-4 h-4 text-green-500" />,
  },
];

export function WorldMapApp() {
  const [events, setEvents] = useState<EventMarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<EventMarkerData | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleId>('dark');
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('off');
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Globe dimensions measurement
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const globeRef = useRef<any>(undefined);

  // Resize handler
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: Math.max(300, entry.contentRect.width),
          height: Math.max(300, entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch events
  const fetchEvents = async (forceRefresh = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const origin = getBackendOrigin();
      const res = await fetch(`${origin}/api/events?refresh=${forceRefresh}`);
      if (!res.ok) throw new Error('Failed to retrieve intelligence streams');
      const data = await res.json();

      const mappedEvents = data.map((ev: any) => {
        let color = '#ffffff';
        if (ev.category === 'Energy') color = '#eab308';
        else if (ev.category === 'Military') color = '#ef4444';
        else if (ev.category === 'Geopolitics') color = '#3b82f6';
        else if (ev.category === 'Economy') color = '#22c55e';

        return {
          ...ev,
          name: ev.country,
          color,
        };
      });

      setEvents(mappedEvents);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Unknown network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Auto refresh every 5 minutes
    const interval = setInterval(() => fetchEvents(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter events
  const filteredEvents = events.filter((ev) => {
    const days = ev.daysAgo !== undefined ? ev.daysAgo : 0;
    const matchesDays = days <= selectedDays;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      ev.title.toLowerCase().includes(query) ||
      ev.country.toLowerCase().includes(query) ||
      ev.summary.toLowerCase().includes(query) ||
      ev.category.toLowerCase().includes(query);

    return matchesDays && matchesSearch;
  });

  const activeStyle = STYLE_CONFIG[mapStyle] || STYLE_CONFIG.dark;
  const isFallbackActive = events.some((e) => e.isFallback);

  return (
    <div className="absolute inset-0 flex bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Main Map Container */}
      <div ref={containerRef} className="relative flex-1 h-full min-w-0 bg-black">
        {/* React Globe */}
        {/* @ts-ignore */}
        <GlobeAny
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl={activeStyle.globeImageUrl}
          bumpImageUrl={activeStyle.bumpImageUrl}
          backgroundImageUrl={activeStyle.backgroundImageUrl || undefined}
          // Marker points
          pointsData={filteredEvents}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={(d: any) => (d.size || 1.5) * 0.08}
          pointRadius={(d: any) => (d.size || 1.5) * 0.8}
          pointsMerge={false}
          pointResolution={24}
          onPointClick={(point: any) => {
            setSelectedEvent(point as EventMarkerData);
            if (globeRef.current) {
              globeRef.current.pointOfView(
                {
                  lat: point.lat,
                  lng: point.lng,
                  altitude: 1.5,
                },
                800
              );
            }
          }}
          pointLabel={(d: any) => `
            <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 10px; font-family: monospace; font-size: 11px; max-width: 250px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); color: #fff;">
              <div style="font-weight: bold; color: ${d.color}; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span>${d.category.toUpperCase()}</span>
                <span>${d.country}</span>
              </div>
              <div style="font-weight: bold; margin-bottom: 4px; color: #f8fafc;">${d.title}</div>
              <div style="color: #cbd5e1; line-height: 1.3;">${d.summary}</div>
              <div style="color: rgba(255,255,255,0.4); margin-top: 4px; font-size: 9px;">Age: ${d.daysAgo === 0 ? 'Today' : d.daysAgo + ' days ago'}</div>
            </div>
          `}
          // Heatmap settings
          hexBinPointsData={heatmapMode !== 'off' ? filteredEvents : []}
          hexBinPointLat="lat"
          hexBinPointLng="lng"
          hexBinPointWeight="size"
          hexBinResolution={4}
          hexAltitude={(bin: any) => Math.min(0.35, (bin.sumWeight || 1) * 0.08)}
          hexSideColor={() => 'rgba(255, 255, 255, 0.06)'}
          hexBinTopColor={(bin: any) => {
            if (heatmapMode === 'density') {
              const weight = bin.sumWeight || 1;
              if (weight < 1.5) return 'rgba(59, 130, 246, 0.5)'; // blue
              if (weight < 2.5) return 'rgba(234, 179, 8, 0.6)'; // yellow
              return 'rgba(239, 68, 68, 0.7)'; // red
            } else {
              // Category based dominant color
              const categories: Record<string, number> = {};
              bin.points.forEach((pt: any) => {
                categories[pt.category] = (categories[pt.category] || 0) + (pt.size || 1);
              });
              let dominant = '';
              let max = 0;
              for (const cat in categories) {
                if (categories[cat] > max) {
                  max = categories[cat];
                  dominant = cat;
                }
              }
              if (dominant === 'Energy') return 'rgba(234, 179, 8, 0.6)';
              if (dominant === 'Military') return 'rgba(239, 68, 68, 0.7)';
              if (dominant === 'Geopolitics') return 'rgba(59, 130, 246, 0.6)';
              if (dominant === 'Economy') return 'rgba(34, 197, 94, 0.6)';
              return 'rgba(255, 255, 255, 0.5)';
            }
          }}
        />

        {/* HUD Top Left Header */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
          <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-4 py-2.5 rounded-xl shadow-2xl pointer-events-auto">
            <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
            <div>
              <h1 className="text-sm font-bold tracking-widest uppercase text-white">
                Supply Chain <span className="text-sky-400">Monitor</span>
              </h1>
              <p className="text-[10px] font-mono text-slate-400 tracking-wider">
                ORBITAL OPERATIONS TELEMETRY
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 w-fit pointer-events-auto">
            <Activity
              className={`w-3.5 h-3.5 ${loading ? 'text-sky-400 animate-spin' : isFallbackActive ? 'text-yellow-400' : 'text-emerald-400'}`}
            />
            <span>
              {loading
                ? 'DOWNLINK SYNCING...'
                : isFallbackActive
                  ? 'LOCAL SIMULATOR ACTIVE'
                  : 'GEMINI ACTIVE STREAM'}
            </span>
          </div>
        </div>

        {/* HUD Top Right Controls (Search and Refresh) */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter country or event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-52 md:w-64 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 pl-9 pr-4 py-2 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors shadow-2xl"
            />
          </div>
          <button
            onClick={() => fetchEvents(true)}
            className="p-2 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors shadow-2xl cursor-pointer"
            title="Force refresh intelligence cache"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* HUD Bottom Slider Controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-md px-4 pointer-events-auto">
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400 uppercase tracking-wider font-semibold">
                Temporal Query Range
              </span>
              <span className="text-sky-400 font-bold bg-sky-950/30 px-2 py-0.5 rounded border border-sky-900/30">
                {selectedDays === 0
                  ? 'Today Only'
                  : selectedDays === 1
                    ? 'Past 24 Hours'
                    : `Past ${selectedDays} Days`}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="7"
              value={selectedDays}
              onChange={(e) => setSelectedDays(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-sky-500 focus:outline-none"
            />

            <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDays(d)}
                  className={`hover:text-slate-200 transition-colors ${selectedDays === d ? 'text-sky-400 font-bold' : ''}`}
                >
                  {d === 0 ? 'Today' : `${d}d`}
                </button>
              ))}
            </div>

            <div className="text-[10px] text-slate-500 font-mono text-center flex items-center justify-center gap-1.5 pt-2 border-t border-slate-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
              Showing {filteredEvents.length} of {events.length} target vectors detected
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel / Sidebar (Left side deck) */}
      <div className="w-[280px] border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-md p-4 flex flex-col gap-4 z-10 select-none overflow-y-auto">
        {/* Categories */}
        <div className="bg-slate-900/30 border border-slate-800/60 p-3 rounded-xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" /> Categories
          </h3>
          <ul className="space-y-1 text-xs font-mono">
            {CATEGORIES.map((cat) => {
              const count = events.filter((e) => e.category === cat.id).length;
              const isActive = hoveredCategory === cat.id;

              return (
                <li
                  key={cat.id}
                  onMouseEnter={() => setHoveredCategory(cat.id)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 border-slate-700 text-white shadow-lg translate-x-1'
                      : hoveredCategory !== null
                        ? 'opacity-30 border-transparent text-slate-400 scale-95'
                        : 'border-transparent text-slate-300 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {cat.icon}
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold border border-slate-700/40">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Heatmap settings */}
        <div className="bg-slate-900/30 border border-slate-800/60 p-3 rounded-xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Heatmap Layers
          </h3>
          <div className="flex flex-col gap-1.5">
            {[
              { id: 'off', label: 'Tactical Pins', desc: 'Discrete event sites' },
              { id: 'density', label: 'Density Hotspots', desc: 'Volumetric overlays' },
              { id: 'category', label: 'Category Cluster', desc: 'Colored regional density' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setHeatmapMode(mode.id as HeatmapMode)}
                className={`flex flex-col text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all duration-200 cursor-pointer ${
                  heatmapMode === mode.id
                    ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-400 shadow-md'
                    : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                }`}
              >
                <span className="font-semibold">{mode.label}</span>
                <span className="text-[9px] opacity-70 mt-0.5">{mode.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Map Styles */}
        <div className="bg-slate-900/30 border border-slate-800/60 p-3 rounded-xl flex-1 flex flex-col min-h-[220px]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" /> Orbital Projections
          </h3>
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
            {STYLES_LIST.map((style) => (
              <button
                key={style.id}
                onClick={() => setMapStyle(style.id)}
                className={`flex flex-col text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all duration-200 cursor-pointer ${
                  mapStyle === style.id
                    ? 'bg-sky-950/20 border-sky-800/80 text-sky-400 shadow-md'
                    : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                }`}
              >
                <span className="font-semibold">{style.label}</span>
                <span className="text-[9px] opacity-70 mt-0.5">{style.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* News Sidebar (Right side deck slide-out) */}
      <WorldMapNewsSidebar
        country={selectedEvent ? selectedEvent.country : null}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

interface NewsSidebarProps {
  country: string | null;
  onClose: () => void;
}

type NewsTab = 'Energy News' | 'Military Conflicts' | 'Political Appointments';

const TABS: { id: NewsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'Energy News', label: 'Energy', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'Military Conflicts', label: 'Military', icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 'Political Appointments', label: 'Politics', icon: <Users className="w-3.5 h-3.5" /> },
];

function WorldMapNewsSidebar({ country, onClose }: NewsSidebarProps) {
  const [news, setNews] = useState<Record<NewsTab, NewsData | null>>({
    'Energy News': null,
    'Military Conflicts': null,
    'Political Appointments': null,
  });
  const [loading, setLoading] = useState<Record<NewsTab, boolean>>({
    'Energy News': false,
    'Military Conflicts': false,
    'Political Appointments': false,
  });
  const [error, setError] = useState<Record<NewsTab, string | null>>({
    'Energy News': null,
    'Military Conflicts': null,
    'Political Appointments': null,
  });
  const [activeTab, setActiveTab] = useState<NewsTab>('Energy News');

  const loadNews = async (targetCountry: string, tab: NewsTab, forceRefresh = false) => {
    if (!forceRefresh && news[tab]) return; // Already cached locally

    setLoading((prev) => ({ ...prev, [tab]: true }));
    setError((prev) => ({ ...prev, [tab]: null }));

    try {
      // Map frontend category tabs to backend categories
      let category = 'Energy';
      if (tab === 'Military Conflicts') category = 'Military';
      if (tab === 'Political Appointments') category = 'Geopolitics';

      const origin = getBackendOrigin();
      const res = await fetch(
        `${origin}/api/news?country=${encodeURIComponent(targetCountry)}&category=${encodeURIComponent(category)}&refresh=${forceRefresh}`
      );
      if (!res.ok) throw new Error('Downstream link failure');

      const responseBody: NewsResponse = await res.json();
      setNews((prev) => ({ ...prev, [tab]: responseBody.data }));
    } catch (err: any) {
      console.error(err);
      setError((prev) => ({ ...prev, [tab]: err.message || 'Failed to download news vectors.' }));
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  };

  useEffect(() => {
    if (!country) return;

    // Reset state on target change
    setNews({ 'Energy News': null, 'Military Conflicts': null, 'Political Appointments': null });
    setError({ 'Energy News': null, 'Military Conflicts': null, 'Political Appointments': null });
    setActiveTab('Energy News');

    loadNews(country, 'Energy News');
  }, [country]);

  useEffect(() => {
    if (country && !news[activeTab] && !loading[activeTab] && !error[activeTab]) {
      loadNews(country, activeTab);
    }
  }, [activeTab, country]);

  const handleRefresh = () => {
    if (country) {
      loadNews(country, activeTab, true);
    }
  };

  return (
    <AnimatePresence>
      {country && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-full sm:w-[440px] border-l border-slate-800/80 bg-slate-950/95 backdrop-blur-xl h-full shadow-2xl flex flex-col z-20 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/50 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/10 rounded-xl border border-sky-500/20">
                <GlobeIcon className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">{country}</h2>
                <p className="text-[9px] text-sky-400 font-mono uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                  Grounded Intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                disabled={loading[activeTab]}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-30 cursor-pointer"
                title="Force refresh intelligence source"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading[activeTab] ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex border-b border-slate-800/80 bg-slate-950/50">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-mono uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-sky-500 text-sky-400 bg-sky-500/5 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="min-h-full"
              >
                {loading[activeTab] ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin text-sky-500" />
                    <p className="text-xs font-mono animate-pulse">
                      Synthesizing intelligence vectors...
                    </p>
                  </div>
                ) : error[activeTab] ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-400">
                    <AlertTriangle className="w-8 h-8" />
                    <p className="text-xs text-center px-6 leading-relaxed">{error[activeTab]}</p>
                    <button
                      onClick={() => loadNews(country, activeTab, true)}
                      className="mt-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      RETRY DOWNLINK
                    </button>
                  </div>
                ) : news[activeTab] ? (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-white leading-snug">
                        {news[activeTab]?.headline}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{news[activeTab]?.timestamp}</span>
                      </div>

                      <div className="mt-4 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-inner">
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          {news[activeTab]?.summary}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-sky-500" /> Telemetry Details
                      </h4>
                      <ul className="space-y-3">
                        {news[activeTab]?.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>
                            <span className="leading-relaxed">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-20 text-slate-500 font-mono text-xs">
                    No intelligence packet ready.
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
