'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, MapPin, Activity, Globe, Info, Star, Maximize } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

interface SavedPin {
  title: string;
  year: any;
  latitude: number;
  longitude: number;
}

interface InteractiveMapProps {
  year: number;
  selectedLat: number;
  selectedLng: number;
  onMapClick: (lat: number, lng: number) => void;
  pins: SavedPin[];
  activePinIndex: number | null;
  onPinClick: (index: number) => void;
}

interface EraContext {
  id: string;
  title: string;
  themeName: string;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    glow: string;
    accent: string;
    polygonFill: string;
  };
  gridOpacity: number;
  mapStyles: any[];
  regions: {
    name: string;
    lat: number;
    lng: number;
    radiusX: number;
    radiusY: number;
    color: string;
    hoverText: string;
  }[];
  routes: {
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    color: string;
    dashed: boolean;
    animated: boolean;
  }[];
}

// Custom Map Styles helper mapping eras to distinctive visual themes
export const getEraContext = (year: number): EraContext => {
  if (year < -100) {
    // Ancient World Theme
    return {
      id: 'antiquity',
      title: 'Classical Antiquity',
      themeName: 'Ancient Bronze & Parchment',
      colorTheme: {
        bg: '#0f0c08',
        border: 'rgba(217, 119, 6, 0.4)',
        text: 'text-amber-500',
        glow: 'rgba(217, 119, 6, 0.15)',
        accent: '#9a3412',
        polygonFill: 'rgba(180, 83, 9, 0.12)',
      },
      gridOpacity: 0.1,
      mapStyles: [
        { elementType: 'geometry', stylers: [{ color: '#13110d' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#13110d' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#a78b71' }] },
        {
          featureType: 'administrative.country',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#9a3412', weight: 1.5 }],
        },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#090807' }] },
      ],
      regions: [
        {
          name: 'ROMAN REPUBLIC / SENATE',
          lat: 41.902,
          lng: 12.496,
          radiusX: 25,
          radiusY: 25,
          color: 'rgba(180, 83, 9, 0.22)',
          hoverText:
            'Central Rome: Era of Julius Caesar, complex logistics, and marble transition.',
        },
        {
          name: 'ALEXANDRIAN SCHOLASTIC UNION',
          lat: 31.2,
          lng: 29.918,
          radiusX: 22,
          radiusY: 22,
          color: 'rgba(217, 119, 6, 0.2)',
          hoverText:
            'Egypt: Pharos lighthouse beacon, physics theorems, and deep papyrus archives.',
        },
        {
          name: 'MAURYA EMPIRE OF INDIA',
          lat: 25.611,
          lng: 85.144,
          radiusX: 26,
          radiusY: 26,
          color: 'rgba(185, 28, 28, 0.18)',
          hoverText:
            'South Asia: Reign of Ashoka the Great, rock inscriptions, and non-violence standard.',
        },
        {
          name: 'HAN DYNASTY EMPIRE',
          lat: 34.263,
          lng: 108.944,
          radiusX: 30,
          radiusY: 30,
          color: 'rgba(22, 101, 52, 0.18)',
          hoverText:
            "East Asia: Gate of Chang'an, Silk production, metal standards, and early paper.",
        },
      ],
      routes: [
        {
          from: { lat: 41.902, lng: 12.496 },
          to: { lat: 31.2, lng: 29.918 },
          color: 'rgba(217, 119, 6, 0.35)',
          dashed: true,
          animated: true,
        },
        {
          from: { lat: 31.2, lng: 29.918 },
          to: { lat: 34.263, lng: 108.944 },
          color: 'rgba(180, 83, 9, 0.3)',
          dashed: true,
          animated: true,
        },
      ],
    };
  } else if (year >= -100 && year < 1000) {
    // Pre-Medieval Transition
    return {
      id: 'pre-medieval',
      title: 'Pre-Medieval Transition',
      themeName: 'Constantinople Gold & Stone',
      colorTheme: {
        bg: '#080a0f',
        border: 'rgba(234, 179, 8, 0.35)',
        text: 'text-yellow-500',
        glow: 'rgba(234, 179, 8, 0.12)',
        accent: '#b45309',
        polygonFill: 'rgba(202, 138, 4, 0.08)',
      },
      gridOpacity: 0.08,
      mapStyles: [
        { elementType: 'geometry', stylers: [{ color: '#090a0f' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#090a0f' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
        {
          featureType: 'administrative.country',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#ca8a04', weight: 1.2 }],
        },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#040507' }] },
      ],
      regions: [
        {
          name: 'BYZANTINE SHIELD',
          lat: 41.008,
          lng: 28.978,
          radiusX: 32,
          radiusY: 32,
          color: 'rgba(202, 138, 4, 0.22)',
          hoverText:
            'Constantinople: Byzantine core, Hagia Sophia domes, Justinian Code, and naval chains.',
        },
        {
          name: 'ANGLO-SAXON REALMS',
          lat: 52.355,
          lng: -1.174,
          radiusX: 18,
          radiusY: 18,
          color: 'rgba(148, 163, 184, 0.15)',
          hoverText:
            'Midlands Focus: Runic carvings, wooden halls, metalwork shields, and Sutton Hoo burials.',
        },
        {
          name: 'MAYAN MATHEMATICAL HEARTH',
          lat: 17.222,
          lng: -89.623,
          radiusX: 20,
          radiusY: 20,
          color: 'rgba(239, 68, 68, 0.15)',
          hoverText:
            'Mesoamerica: Pyramids in Petén basin, cosmic tracking calendars, and pure zero math.',
        },
      ],
      routes: [
        {
          from: { lat: 41.008, lng: 28.978 },
          to: { lat: 52.355, lng: -1.174 },
          color: 'rgba(202, 138, 4, 0.25)',
          dashed: true,
          animated: false,
        },
      ],
    };
  } else if (year >= 1000 && year < 1500) {
    // Medieval Era Theme
    return {
      id: 'medieval',
      title: 'Middle Ages & Renaissance',
      themeName: 'Feudal Emerald Guilds',
      colorTheme: {
        bg: '#050c09',
        border: 'rgba(16, 185, 129, 0.35)',
        text: 'text-emerald-400',
        glow: 'rgba(16, 185, 129, 0.12)',
        accent: '#059669',
        polygonFill: 'rgba(16, 185, 129, 0.08)',
      },
      gridOpacity: 0.12,
      mapStyles: [
        { elementType: 'geometry', stylers: [{ color: '#070b09' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#070b09' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#789c8a' }] },
        {
          featureType: 'administrative.country',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#10b981', weight: 1.3 }],
        },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#030404' }] },
      ],
      regions: [
        {
          name: 'RUNNYMEDE ASSEMBLY COALITION',
          lat: 51.444,
          lng: -0.565,
          radiusX: 20,
          radiusY: 20,
          color: 'rgba(16, 185, 129, 0.22)',
          hoverText:
            "Runnymede Meadow: Barons force King John's seal on Magna Carta, constitutional milestone.",
        },
        {
          name: 'MALI CHRONO CORES',
          lat: 12.639,
          lng: -8.002,
          radiusX: 26,
          radiusY: 26,
          color: 'rgba(245, 158, 11, 0.25)',
          hoverText:
            'West Africa: Wealth of Mansa Musa, Islamic universities, trans-Saharan salt and gold hubs.',
        },
        {
          name: 'TUSCAN ARTISANS GUILDS',
          lat: 43.769,
          lng: 11.256,
          radiusX: 16,
          radiusY: 16,
          color: 'rgba(13, 148, 136, 0.18)',
          hoverText:
            "Florence: Renaissance mechanics, perspective arithmetic, and Leonardo's drafting workshop.",
        },
      ],
      routes: [
        {
          from: { lat: 12.639, lng: -8.002 },
          to: { lat: 30.044, lng: 31.235 },
          color: 'rgba(245, 158, 11, 0.3)',
          dashed: true,
          animated: true,
        },
        {
          from: { lat: 43.769, lng: 11.256 },
          to: { lat: 51.444, lng: -0.565 },
          color: 'rgba(16, 185, 129, 0.25)',
          dashed: true,
          animated: false,
        },
      ],
    };
  } else {
    // Modern / Space / Future Theme
    return {
      id: 'modern',
      title: 'Modern & Technological Era',
      themeName: 'Quantum Cobalt Grid',
      colorTheme: {
        bg: '#020617',
        border: 'rgba(14, 165, 233, 0.4)',
        text: 'text-sky-450',
        glow: 'rgba(14, 165, 233, 0.18)',
        accent: '#0ea5e9',
        polygonFill: 'rgba(14, 165, 233, 0.08)',
      },
      gridOpacity: 0.15,
      mapStyles: [
        { elementType: 'geometry', stylers: [{ color: '#030712' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#030712' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#38bdf8' }] },
        {
          featureType: 'administrative.country',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#0ea5e9', weight: 1.5 }],
        },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020205' }] },
      ],
      regions: [
        {
          name: 'CAPE CANAVERAL LAUNCH PAD',
          lat: 28.572,
          lng: -80.648,
          radiusX: 20,
          radiusY: 20,
          color: 'rgba(14, 165, 233, 0.25)',
          hoverText:
            'Apollo 11 Pad 39A: Saturn V hydrogen booster trajectory, launching lunar basalt explorers.',
        },
        {
          name: 'CERN PARTICLE RING',
          lat: 46.233,
          lng: 6.049,
          radiusX: 15,
          radiusY: 15,
          color: 'rgba(168, 85, 247, 0.2)',
          hoverText:
            'Geneva Border: High energy proton impacts, Higgs Boson captures, and World Wide Web genesis.',
        },
        {
          name: 'SILICON COAXIAL LABORATORIES',
          lat: 37.774,
          lng: -122.419,
          radiusX: 18,
          radiusY: 18,
          color: 'rgba(245, 158, 11, 0.2)',
          hoverText:
            'Bay Area Core: Chronocraft local server telemetry grid nodes, quantum transistors.',
        },
      ],
      routes: [
        {
          from: { lat: 28.572, lng: -80.648 },
          to: { lat: 37.774, lng: -122.419 },
          color: 'rgba(14, 165, 233, 0.35)',
          dashed: true,
          animated: true,
        },
        {
          from: { lat: 46.233, lng: 6.049 },
          to: { lat: 28.572, lng: -80.648 },
          color: 'rgba(168, 85, 247, 0.35)',
          dashed: true,
          animated: true,
        },
      ],
    };
  }
};

// Map center management component to smoothly pan when coords shift
function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat, lng });
    }
  }, [map, lat, lng]);
  return null;
}

// Zoom to fit all active markers on the map
function ZoomToFitController({ pins, trigger }: { pins: SavedPin[]; trigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !pins || pins.length === 0) return;
    if (typeof window === 'undefined' || !(window as any).google || !(window as any).google.maps)
      return;
    try {
      const bounds = new (window as any).google.maps.LatLngBounds();
      let ok = false;
      pins.forEach((pin) => {
        if (
          typeof pin.latitude === 'number' &&
          typeof pin.longitude === 'number' &&
          !isNaN(pin.latitude) &&
          !isNaN(pin.longitude)
        ) {
          bounds.extend({ lat: pin.latitude, lng: pin.longitude });
          ok = true;
        }
      });
      if (ok) {
        map.fitBounds(bounds, {
          top: 70,
          bottom: 90,
          left: 60,
          right: 60,
        });
      }
    } catch (e) {
      console.warn('Failed to zoom to fit bounds:', e);
    }
  }, [map, pins, trigger]);
  return null;
}

export default function InteractiveMap({
  year,
  selectedLat,
  selectedLng,
  onMapClick,
  pins,
  activePinIndex,
  onPinClick,
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [preferredView, setPreferredView] = useState<'google' | 'futuristic'>('google');
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [zoomTrigger, setZoomTrigger] = useState<number>(0);

  // Automatically trigger zoom-to-fit when active pins list changes (e.g., after an era change, new scan, or simulation search)
  useEffect(() => {
    if (pins && pins.length > 0) {
      const t = setTimeout(() => {
        setZoomTrigger((prev) => prev + 1);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [pins]);

  // Retrieve injected secret Key
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY !== '';

  // Get active era configuration for dynamic layout themes
  const eraCtx = getEraContext(year);

  // Convert GPS Coordinates (latitude/longitude) to 2D SVG position percent (for the customized fallback map)
  const getCoordinatesPos = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 100;
    const y = (1 - (lat + 90) / 180) * 100;
    return { x, y };
  };

  // Convert GPS Coordinates to absolute SVG coordinate pixels matching background grids mapping bounds (x scaled to approx 650, y to 350)
  const getSvgXY = (lat: number, lng: number) => {
    const pos = getCoordinatesPos(lat, lng);
    return {
      x: pos.x * 6.5,
      y: pos.y * 3.5,
    };
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pctX = clickX / rect.width;
    const pctY = clickY / rect.height;

    const lng = pctX * 360 - 180;
    const lat = (1 - pctY) * 180 - 90;

    const finalLat = Math.max(-80, Math.min(80, lat));
    const finalLng = Math.max(-180, Math.min(180, lng));

    onMapClick(finalLat, finalLng);
  };

  const selectedPos = getSvgXY(selectedLat, selectedLng);
  const isGoogleActive = hasValidKey && preferredView === 'google';

  const formatYear = (y: number) => {
    return y < 0 ? `${Math.abs(y)} BC` : `${y} AD`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[400px] md:h-[450px] bg-[#0c0c10] border border-white/5 rounded-2xl overflow-hidden group select-none flex flex-col justify-between"
      style={{
        borderColor: eraCtx.colorTheme.border,
        boxShadow: `0 4px 30px ${eraCtx.colorTheme.glow}`,
      }}
      id="interactive-time-map"
    >
      {/* HUD status line overlay */}
      <div className="absolute top-3 left-4 right-4 flex justify-between items-center z-20 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-[9px] font-mono uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          <span>
            Lock COORDs: {selectedLat.toFixed(3)}°N, {selectedLng.toFixed(3)}°E
          </span>
        </div>

        {/* Toggle switches between real Google and Futuristic view (only if key exists) */}
        {hasValidKey && (
          <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md px-1.5 py-1 rounded-full border border-white/5 pointer-events-auto">
            <button
              onClick={() => setPreferredView('google')}
              className={`px-2 py-0.5 rounded-full text-[8px] font-mono uppercase transition-all cursor-pointer ${
                preferredView === 'google'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Google Map
            </button>
            <button
              onClick={() => setPreferredView('futuristic')}
              className={`px-2 py-0.5 rounded-full text-[8px] font-mono uppercase transition-all cursor-pointer ${
                preferredView === 'futuristic'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Grid Fallback
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-[9px] font-mono uppercase tracking-wider">
          <span className="font-bold text-amber-500">{eraCtx.title}</span>
          <span className="text-zinc-500">•</span>
          <span>{formatYear(year)}</span>
        </div>
      </div>

      {/* Main Map Viewer Stage */}
      <div className="relative w-full h-full flex-grow">
        {isGoogleActive ? (
          /* LIVE GOOGLE MAP WITH DYNAMIC ERA STYLINGS */
          <APIProvider apiKey={API_KEY} version="weekly">
            <div className="w-full h-full" style={{ height: '100%', minHeight: '100%' }}>
              <Map
                center={{ lat: selectedLat, lng: selectedLng }}
                zoom={4}
                gestureHandling="interactive"
                mapId="DEMO_MAP_ID"
                style={{ width: '100%', height: '100%' }}
                styles={eraCtx.mapStyles}
                disableDefaultUI={true}
                onClick={(ev) => {
                  const rawLatLng = ev.detail.latLng as any;
                  if (rawLatLng) {
                    const lat =
                      typeof rawLatLng.lat === 'function' ? rawLatLng.lat() : rawLatLng.lat;
                    const lng =
                      typeof rawLatLng.lng === 'function' ? rawLatLng.lng() : rawLatLng.lng;
                    if (typeof lat === 'number' && typeof lng === 'number') {
                      onMapClick(lat, lng);
                    }
                  }
                }}
              >
                <MapController lat={selectedLat} lng={selectedLng} />
                <ZoomToFitController pins={pins} trigger={zoomTrigger} />

                {/* Selected target marker pin */}
                {selectedLat !== undefined && selectedLng !== undefined && (
                  <AdvancedMarker position={{ lat: selectedLat, lng: selectedLng }}>
                    <div className="w-10 h-10 bg-amber-500/25 rounded-full border-2 border-amber-500 flex items-center justify-center animate-pulse">
                      <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    </div>
                  </AdvancedMarker>
                )}

                {/* Highly engaging Era-specific clickable overlays regions */}
                {eraCtx.regions.map((reg, ri) => (
                  <AdvancedMarker key={`gmap-reg-${ri}`} position={{ lat: reg.lat, lng: reg.lng }}>
                    <div
                      className="cursor-pointer flex flex-col items-center group/reg"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMapClick(reg.lat, reg.lng);
                      }}
                      onMouseEnter={() => setHoveredRegion(reg.hoverText)}
                      onMouseLeave={() => setHoveredRegion(null)}
                    >
                      <div className="w-8 h-8 rounded-full border border-dashed border-amber-500 bg-amber-500/10 flex items-center justify-center animate-pulse shadow-lg transform group-hover/reg:scale-110 transition duration-300">
                        <Compass className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="bg-black/90 px-2 py-0.5 rounded border border-amber-500/30 text-[8.5px] font-mono text-white mt-1 whitespace-nowrap uppercase tracking-wider shadow">
                        🏯 {reg.name.split(' ')[0]}
                      </div>
                    </div>
                  </AdvancedMarker>
                ))}

                {/* Standard Historical Site Marker Pins */}
                {pins.map((pin, i) => {
                  const isActive = i === activePinIndex;
                  return (
                    <AdvancedMarker
                      key={`gmap-pin-${i}`}
                      position={{ lat: pin.latitude, lng: pin.longitude }}
                    >
                      <div
                        className="relative group/pin cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPinClick(i);
                        }}
                      >
                        <div
                          className={`p-1.5 rounded-full border shadow-xl transition-all ${
                            isActive
                              ? 'bg-amber-400 border-white text-black scale-125'
                              : 'bg-zinc-950 border-amber-500/50 text-amber-500 hover:scale-110'
                          }`}
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover/pin:block z-50 bg-black/95 border border-amber-500/40 text-[9px] font-mono font-bold text-white px-2 py-1 rounded shadow-lg whitespace-nowrap">
                          {formatYear(pin.year)}: {pin.title}
                        </div>
                      </div>
                    </AdvancedMarker>
                  );
                })}
              </Map>
            </div>
          </APIProvider>
        ) : (
          /* FUTURISTIC GRAPHICS GRID FALLBACK WITH ADAPTIVE HISTORICAL OVERLAYS */
          <div className="w-full h-full relative" style={{ backgroundColor: eraCtx.colorTheme.bg }}>
            <svg
              onClick={handleSvgClick}
              className="w-full h-full cursor-crosshair relative transition-all duration-500"
            >
              <defs>
                <pattern
                  id="grid-pattern-era animate"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.02)"
                    strokeWidth="0.5"
                  />
                </pattern>
                {/* Glowing line gradients */}
                <linearGradient id="gradient-antiquity" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#b45309" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="gradient-modern" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#d946ef" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern-era animate)" />

              {/* Eurasia & Africa continent polygons reflecting era boundary gradients */}
              <polygon
                points="80,20 120,10 160,15 200,25 210,40 230,50 250,55 240,70 180,90 145,100 130,85 110,60 90,40"
                transform="scale(2) translate(-20, -5)"
                className="stroke-white/5 stroke-[0.5] transition-all duration-500"
                style={{ fill: eraCtx.colorTheme.polygonFill }}
                pointerEvents="none"
              />
              {/* Americas continent polygon */}
              <polygon
                points="20,15 45,20 60,30 40,50 45,65 55,75 52,90 35,110 25,80 30,60 15,40"
                transform="scale(2) translate(-10, -5)"
                className="stroke-white/5 stroke-[0.5] transition-all duration-500"
                style={{ fill: eraCtx.colorTheme.polygonFill }}
                pointerEvents="none"
              />
              {/* Australia continent polygon */}
              <polygon
                points="210,100 230,105 240,120 220,130 200,115"
                transform="scale(2) translate(-10, -5)"
                className="stroke-white/5 stroke-[0.5] transition-all duration-500"
                style={{ fill: eraCtx.colorTheme.polygonFill }}
                pointerEvents="none"
              />

              <line
                x1="50%"
                y1="0"
                x2="50%"
                y2="100%"
                stroke="rgba(245, 158, 11, 0.05)"
                strokeDasharray="5,5"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="50%"
                x2="100%"
                y2="50%"
                stroke="rgba(245, 158, 11, 0.05)"
                strokeDasharray="5,5"
                strokeWidth="1"
              />

              {/* 1. HISTORICAL CORRIDORS (TRADE ROUTES & ORBITAL CORRIDORS) */}
              {eraCtx.routes.map((route, index) => {
                const start = getSvgXY(route.from.lat, route.from.lng);
                const end = getSvgXY(route.to.lat, route.to.lng);
                return (
                  <g key={`svg-route-${index}`} className="pointer-events-none">
                    <line
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      stroke={route.color}
                      strokeWidth={route.animated ? '2' : '1'}
                      strokeDasharray={route.dashed ? '4,4' : undefined}
                      className={route.animated ? 'animate-pulse' : undefined}
                    />
                    {/* Animated moving particle representing trade/transit */}
                    {route.animated && (
                      <circle r="2.5" fill="#f59e0b">
                        <animateMotion
                          path={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                          dur="6s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                  </g>
                );
              })}

              {/* 2. ERA-BOUND MULTI-SECTOR REGIONAL CYCLES (CLICKABLE) */}
              {eraCtx.regions.map((reg, index) => {
                const regPos = getSvgXY(reg.lat, reg.lng);
                const isHovered = hoveredRegion === reg.hoverText;
                return (
                  <g
                    key={`svg-reg-${index}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredRegion(reg.hoverText)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMapClick(reg.lat, reg.lng);
                    }}
                  >
                    {/* Pulse region overlay circle */}
                    <circle
                      cx={regPos.x}
                      cy={regPos.y}
                      r={reg.radiusX}
                      fill={reg.color}
                      stroke={isHovered ? '#f59e0b' : eraCtx.colorTheme.border}
                      strokeWidth={isHovered ? '1.5' : '0.5'}
                      strokeDasharray="4,4"
                      className="transition-all duration-300"
                    />

                    {/* Glowing outer core tag */}
                    <circle
                      cx={regPos.x}
                      cy={regPos.y}
                      r="4"
                      fill={isHovered ? '#f59e0b' : eraCtx.colorTheme.accent}
                      className="animate-ping"
                    />
                    <circle
                      cx={regPos.x}
                      cy={regPos.y}
                      r="2.5"
                      fill={isHovered ? '#ffedd5' : '#ffffff'}
                    />

                    {/* Floating capital label */}
                    <text
                      x={regPos.x}
                      y={regPos.y - 8}
                      textAnchor="middle"
                      fill="#f4f4f5"
                      fontSize="7"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="pointer-events-none drop-shadow-md brightness-110"
                    >
                      {reg.name}
                    </text>
                  </g>
                );
              })}

              {/* 3. COAXIAL LOCK CROSSHAIRS TARGET */}
              <g transform={`translate(${selectedPos.x}, ${selectedPos.y})`}>
                <circle r="12" fill="none" stroke={eraCtx.colorTheme.border} strokeWidth="1">
                  <animate attributeName="r" values="5;16;5" dur="3s" repeatCount="indefinite" />
                </circle>
                <line x1="-15" y1="0" x2="15" y2="0" stroke="#f59e0b" strokeWidth="1" />
                <line x1="0" y1="-15" x2="0" y2="15" stroke="#f59e0b" strokeWidth="1" />
                <circle r="3" fill="#f59e0b" className="animate-pulse" />
              </g>

              {/* 4. CHRONO CURATED EVENT PINS */}
              {pins.map((pin, index) => {
                const pinPos = getSvgXY(pin.latitude, pin.longitude);
                const isActive = index === activePinIndex;

                return (
                  <g
                    key={`svg-pin-${index}`}
                    transform={`translate(${pinPos.x}, ${pinPos.y})`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPinClick(index);
                    }}
                  >
                    <circle
                      r={isActive ? '9' : '5'}
                      fill={isActive ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.05)'}
                      stroke={isActive ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)'}
                      strokeWidth={isActive ? '1.5' : '0.5'}
                    />
                    <circle r="2.5" fill={isActive ? '#f59e0b' : '#e4e4e7'} />

                    {isActive && (
                      <g transform="translate(0, -16)" className="pointer-events-none">
                        <rect
                          x="-55"
                          y="-18"
                          width="110"
                          height="18"
                          rx="4"
                          fill="rgba(6, 6, 9, 0.95)"
                          stroke="#f59e0b"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="-6"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="8"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {pin.title.length > 12
                            ? pin.title.substring(0, 10).toUpperCase() + '..'
                            : pin.title.toUpperCase()}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Programmatic Zoom-to-Fit Floating Controls */}
      <div className="absolute right-4 top-14 flex flex-col gap-2 z-20 pointer-events-auto">
        <button
          onClick={() => setZoomTrigger((prev) => prev + 1)}
          className="flex h-8 items-center gap-2 text-[10px] text-amber-455 hover:text-amber-400 font-mono tracking-wider font-bold px-3 py-1 bg-[#0c0c10]/95 hover:bg-[#161622] border border-white/10 hover:border-amber-500/30 rounded-full shadow-lg cursor-pointer transition-all duration-150 backdrop-blur-md"
          title="Autoscan Zoom-to-Fit: frame all matching active landmarks inside view boundaries"
        >
          <Maximize className="w-3.5 h-3.5" />
          <span>ZOOM-TO-FIT ({pins ? pins.length : 0})</span>
        </button>
      </div>

      {/* Era Regional context information HUD overlay (Dynamically reflecting context) */}
      <div className="absolute bottom-11 left-4 right-4 bg-black/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/5 text-[10px] text-zinc-400 z-20 flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/10 ${eraCtx.colorTheme.text} bg-white/5`}
        >
          <Activity className="w-4 h-4 animate-pulse" />
        </div>
        <div className="text-left flex-grow">
          <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase block tracking-wider leading-none">
            {eraCtx.themeName} Grid Matrix Layer
          </span>
          <p className="text-[10px] text-zinc-350 font-sans line-clamp-1 mt-0.5">
            {hoveredRegion ||
              `Active Chronology: ${eraCtx.title}. Click landmasses or region hotspots to lock coordinates and load detailed popups.`}
          </p>
        </div>
      </div>

      {/* Map visual control instructions footer */}
      <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center pointer-events-none z-25 bg-black/20 p-1 rounded-md backdrop-blur-sm">
        <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-zinc-650" />
          Sub-Grid Lock System Active {isGoogleActive && '• CHRONO-GOOGLE RENDER'}
        </div>
        <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
          Spatio-Chrono Matrix Synchronized
        </div>
      </div>
    </div>
  );
}
