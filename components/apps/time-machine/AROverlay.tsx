'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  RefreshCw,
  Layers,
  Radio,
  VideoOff,
  Maximize2,
  ShieldAlert,
  Eye,
  SlidersHorizontal,
  Info,
  Flame,
  Globe,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Power,
} from 'lucide-react';

interface AROverlayProps {
  eraName: string;
  locationName: string;
  year: number;
}

// 3D Point vector representation
interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Edge linking two vertices
interface Edge3D {
  a: number;
  b: number;
  color?: string;
  dashed?: boolean;
}

// Floating interactive hotspots
interface Hotspot3D {
  id: string;
  label: string;
  pos: Point3D;
  description: string;
  metric: string;
}

export default function AROverlay({ eraName, locationName, year }: AROverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera feed states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  // Gyroscopic movement simulation parameters
  const [yaw, setYaw] = useState<number>(0.35); // Horizontal rotation in radians
  const [pitch, setPitch] = useState<number>(-0.15); // Vertical tilt in radians
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Scanning overlay ticker
  const [scannerTick, setScannerTick] = useState<number>(0);

  // AR Chronosphere Animated Sequence variables
  const [activeSequencePhase, setActiveSequencePhase] = useState<number>(0);
  const [isPlayingSeq, setIsPlayingSeq] = useState<boolean>(false);
  const [seqProgress, setSeqProgress] = useState<number>(0);

  // Node info tooltip overlay
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot3D | null>(null);

  // Performance and battery saving state for AR visualization
  const [isArEnabled, setIsArEnabled] = useState<boolean>(true);

  const isBC = year < 0;
  const formattedYear = isBC ? `${Math.abs(year)} B.C.` : `${year} A.D.`;

  // Predefined sequential event milestones for the dynamic timeline player
  const sequenceMilestones = [
    {
      name: 'PHASE I: COAXIAL LOCKON',
      desc: 'Isolating geo-spatial coordinates & aligning temporal telemetry channels.',
    },
    {
      name: 'PHASE II: ELEMENTAL MANIFESTATION',
      desc: 'Constructing high-density wireframe structures and atomic coordinates.',
    },
    {
      name: 'PHASE III: ATMOSPHERIC HARMONIZATION',
      desc: 'Synchronizing thermal maps, ambient noise metrics, and localized chemical traces.',
    },
    {
      name: 'PHASE IV: SECURE OBSERVATION',
      desc: 'Optimal temporal stabilization locked. Safe space-time window is active.',
    },
  ];

  // Request camera stream safely
  const activateCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false,
      });
      setStream(mediaStream);
      setPermissionState('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera request was denied or is unavailable', err);
      setPermissionState('denied');
    }
  };

  const deactivateCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setPermissionState('prompt');
  };

  const shutDownArLens = () => {
    deactivateCamera();
    setIsPlayingSeq(false);
    setSelectedHotspot(null);
  };

  const handleToggleArEnabled = () => {
    if (isArEnabled) {
      shutDownArLens();
    }
    setIsArEnabled((prev) => !prev);
  };

  // Generate 3D geometries based on selected Era:
  // We'll generate a rich dataset of Vertices, Edges, and Hotspots
  const getEraGeometry = (): { vertices: Point3D[]; edges: Edge3D[]; hotspots: Hotspot3D[] } => {
    // Determine target era style
    const eraLower = eraName?.toLowerCase() || '';

    if (eraLower.includes('antiquity') || year < 0) {
      // 1. Classical Alexandria (Great Library and Pharos Lighthouse)
      const vertices: Point3D[] = [
        // Greek Temple Podium Base
        { x: -80, y: 40, z: -50 },
        { x: 80, y: 40, z: -50 },
        { x: 80, y: 40, z: 50 },
        { x: -80, y: 40, z: 50 },
        // Step 2
        { x: -75, y: 32, z: -45 },
        { x: 75, y: 32, z: -45 },
        { x: 75, y: 32, z: 45 },
        { x: -75, y: 32, z: 45 },
        // Temple Architrave / Ceiling Plate
        { x: -70, y: -30, z: -40 },
        { x: 70, y: -30, z: -40 },
        { x: 70, y: -30, z: 40 },
        { x: -70, y: -30, z: 40 },
        // Triangular Roof Ridge
        { x: 0, y: -65, z: -40 },
        { x: 0, y: -65, z: 40 },
        // Columns (8 Columns) - We represent top/bottom points to connect later
        // Column 1
        { x: -65, y: 32, z: -35 },
        { x: -65, y: -30, z: -35 },
        // Column 2
        { x: -22, y: 32, z: -35 },
        { x: -22, y: -30, z: -35 },
        // Column 3
        { x: 22, y: 32, z: -35 },
        { x: 22, y: -30, z: -35 },
        // Column 4
        { x: 65, y: 32, z: -35 },
        { x: 65, y: -30, z: -35 },
        // Column 5 (Back-row left)
        { x: -65, y: 32, z: 35 },
        { x: -65, y: -30, z: 35 },
        // Column 6 (Back-row right)
        { x: 65, y: 32, z: 35 },
        { x: 65, y: -30, z: 35 },
      ];

      const edges: Edge3D[] = [
        // Podium lines
        { a: 0, b: 1 },
        { a: 1, b: 2 },
        { a: 2, b: 3 },
        { a: 3, b: 0 },
        { a: 4, b: 5 },
        { a: 5, b: 6 },
        { a: 6, b: 7 },
        { a: 7, b: 4 },
        // Architrave roof outline
        { a: 8, b: 9 },
        { a: 9, b: 10 },
        { a: 10, b: 11 },
        { a: 11, b: 8 },
        // Roof pediment triangle (front & back)
        { a: 8, b: 12 },
        { a: 9, b: 12 },
        { a: 11, b: 13 },
        { a: 10, b: 13 },
        { a: 12, b: 13, color: '#f59e0b' }, // Ridge beam
        // Render Columns
        { a: 14, b: 15, color: '#f59e0b' },
        { a: 16, b: 17, color: '#d97706' },
        { a: 18, b: 19, color: '#d97706' },
        { a: 20, b: 21, color: '#f59e0b' },
        { a: 22, b: 23, color: 'rgba(245, 158, 11, 0.5)' },
        { a: 24, b: 25, color: 'rgba(245, 158, 11, 0.5)' },
      ];

      const hotspots: Hotspot3D[] = [
        {
          id: 'A-01',
          label: 'Front Scroll Scriptorium',
          pos: { x: 0, y: 20, z: -20 },
          description:
            'House of over 400,000 catalogued papyrus scrolls outlining mathematics, mechanics, and stellar orbits.',
          metric: '400k scrolls detected',
        },
        {
          id: 'A-02',
          label: 'Colonnade Foundation Pillar',
          pos: { x: -65, y: 0, z: -35 },
          description:
            'Fine Pentelic and Egyptian limestone beams supporting the grand portico ceiling structure.',
          metric: 'Limestone density: 2.7g/cm³',
        },
        {
          id: 'A-03',
          label: 'Royal Reading Chambers',
          pos: { x: 30, y: -10, z: 10 },
          description:
            'Where Euclid and Eratosthenes collaborated. Natural sun wells reflect light for study.',
          metric: 'Intellectual anchor locked',
        },
      ];

      return { vertices, edges, hotspots };
    } else if (
      eraLower.includes('middle') ||
      eraLower.includes('feudal') ||
      (year >= 1000 && year < 1300)
    ) {
      // 2. Middle Ages (Feudal Scriptorium, Magna Carta Sealing Pavilion & Scone Battlements)
      const vertices: Point3D[] = [
        // Stepped base
        { x: -60, y: 40, z: -60 },
        { x: 60, y: 40, z: -60 },
        { x: 60, y: 40, z: 60 },
        { x: -60, y: 40, z: 60 },
        // Pavilion Archway pillars
        { x: -50, y: 40, z: -40 },
        { x: -50, y: -25, z: -40 },
        { x: 50, y: 40, z: -40 },
        { x: 50, y: -25, z: -40 },
        { x: 50, y: 40, z: 40 },
        { x: 50, y: -25, z: 40 },
        { x: -50, y: 40, z: 40 },
        { x: -50, y: -25, z: 40 },
        // Gothic Pointy Roof Peak
        { x: 0, y: -65, z: 0 },
        // Central treaty desk
        { x: -20, y: 25, z: -20 },
        { x: 20, y: 25, z: -20 },
        { x: 20, y: 25, z: 20 },
        { x: -20, y: 25, z: 20 },
        { x: -20, y: 40, z: -20 },
        { x: 20, y: 40, z: -20 },
        { x: 20, y: 40, z: 20 },
        { x: -20, y: 40, z: 20 },
      ];

      const edges: Edge3D[] = [
        // Base plate
        { a: 0, b: 1 },
        { a: 1, b: 2 },
        { a: 2, b: 3 },
        { a: 3, b: 0 },
        // Pillars uprights
        { a: 4, b: 5 },
        { a: 6, b: 7 },
        { a: 8, b: 9 },
        { a: 10, b: 11 },
        // Girders top plate
        { a: 5, b: 7 },
        { a: 7, b: 9 },
        { a: 9, b: 11 },
        { a: 11, b: 5 },
        // Pointy tent peak roof arches
        { a: 5, b: 12, color: '#f59e0b' },
        { a: 7, b: 12, color: '#f59e0b' },
        { a: 9, b: 12, color: '#f59e0b' },
        { a: 11, b: 12, color: '#f59e0b' },
        // Treaty Desk lines
        { a: 13, b: 14 },
        { a: 14, b: 15 },
        { a: 15, b: 16 },
        { a: 16, b: 13 },
        { a: 13, b: 17, dashed: true },
        { a: 14, b: 18, dashed: true },
        { a: 15, b: 19, dashed: true },
        { a: 16, b: 20, dashed: true },
      ];

      const hotspots: Hotspot3D[] = [
        {
          id: 'M-01',
          label: 'The Magna Carta Seal',
          pos: { x: 0, y: 20, z: 0 },
          description:
            'Draft of the Great Charter sealed by King John, enforcing the foundational rule of law on the Crown.',
          metric: 'Coercion index: High',
        },
        {
          id: 'M-02',
          label: 'Baronial Pavilion Pillars',
          pos: { x: -50, y: -10, z: -40 },
          description:
            'High-density linen structures erected overnight to safeguard negotiations on neutral wetland soil.',
          metric: 'Atmospheric level stable',
        },
        {
          id: 'M-03',
          label: "Archbishop's Ledger Table",
          pos: { x: 0, y: 15, z: -15 },
          description:
            'Where ecclesiastical transcribers translate absolute royal mandates into civil liberties code.',
          metric: 'Parchment trace detected',
        },
      ];

      return { vertices, edges, hotspots };
    } else if (
      eraLower.includes('mali') ||
      eraLower.includes('gold') ||
      (year >= 1300 && year < 1500)
    ) {
      // 3. Mali Golden Age (Sankore Mud Mosque towers)
      const vertices: Point3D[] = [
        // Large Earthen Mosque base
        { x: -50, y: 40, z: -50 },
        { x: 50, y: 40, z: -50 },
        { x: 50, y: 40, z: 50 },
        { x: -50, y: 40, z: 50 },
        // Mid tier layer
        { x: -35, y: -5, z: -35 },
        { x: 35, y: -5, z: -35 },
        { x: 35, y: -5, z: 35 },
        { x: -35, y: -5, z: 35 },
        // High tower spire point
        { x: 0, y: -65, z: 0 },
        // Projecting timber beams (toron spikes) extending horizontally from sides
        { x: -45, y: 15, z: -35 },
        { x: -55, y: 15, z: -35 },
        { x: 45, y: 15, z: 35 },
        { x: 55, y: 15, z: 35 },
        { x: -30, y: -20, z: -25 },
        { x: -45, y: -20, z: -25 },
        { x: 30, y: -20, z: 25 },
        { x: 45, y: -20, z: 25 },
      ];

      const edges: Edge3D[] = [
        // Base block
        { a: 0, b: 1 },
        { a: 1, b: 2 },
        { a: 2, b: 3 },
        { a: 3, b: 0 },
        // Slanted walls to mid-layer
        { a: 0, b: 4 },
        { a: 1, b: 5 },
        { a: 2, b: 6 },
        { a: 3, b: 7 },
        // Mid tier layer boundary
        { a: 4, b: 5 },
        { a: 5, b: 6 },
        { a: 6, b: 7 },
        { a: 7, b: 4 },
        // Pyramid apex spire
        { a: 4, b: 8, color: '#f59e0b' },
        { a: 5, b: 8, color: '#f59e0b' },
        { a: 6, b: 8, color: '#f59e0b' },
        { a: 7, b: 8, color: '#f59e0b' },
        // Spikes (toron beams projecting out)
        { a: 9, b: 10, color: '#a16207' },
        { a: 11, b: 12, color: '#a16207' },
        { a: 13, b: 14, color: '#a16207' },
        { a: 15, b: 16, color: '#a16207' },
      ];

      const hotspots: Hotspot3D[] = [
        {
          id: 'S-01',
          label: 'Sankore Madrasa Library',
          pos: { x: 0, y: 10, z: 10 },
          description:
            'One of the absolute premier scholarly repositories on earth. House of historic Quranic, geological, and astrophysical manuscripts.',
          metric: '25k students enrolled',
        },
        {
          id: 'S-02',
          label: 'Toron Wooden Scaffolding',
          pos: { x: 45, y: 15, z: 35 },
          description:
            'Traditional architectural wooden spikes projecting from the earthen walls, serving as structural support and maintenance footholds.',
          metric: 'Earthen clay compound',
        },
        {
          id: 'S-03',
          label: 'Sovereign Gold Weighing Gate',
          pos: { x: 0, y: 35, z: -45 },
          description:
            'Central trade gates where global salt bars are meticulously weighed against Malian pure gold dust.',
          metric: 'Purity factor: 99.8%',
        },
      ];

      return { vertices, edges, hotspots };
    } else {
      // 4. Space Age & Modern Era (Apollo 11 Lunar Module & Lander)
      const vertices: Point3D[] = [
        // Octagonal descent stage body
        { x: -35, y: 15, z: -35 },
        { x: 35, y: 15, z: -35 },
        { x: 35, y: 15, z: 35 },
        { x: -35, y: 15, z: 35 },
        { x: -35, y: -10, z: -35 },
        { x: 35, y: -10, z: -35 },
        { x: 35, y: -10, z: 35 },
        { x: -35, y: -10, z: 35 },
        // Upper Cabin ascent stage
        { x: -20, y: -10, z: -20 },
        { x: 20, y: -10, z: -20 },
        { x: 20, y: -35, z: 20 },
        { x: -20, y: -35, z: 20 },
        { x: -20, y: -35, z: -20 },
        { x: 20, y: -35, z: -20 },
        // 4 Landing legs extending down
        { x: -55, y: 40, z: -55 }, // Pad 1
        { x: 55, y: 40, z: -55 }, // Pad 2
        { x: 55, y: 40, z: 55 }, // Pad 3
        { x: -55, y: 40, z: 55 }, // Pad 4
      ];

      const edges: Edge3D[] = [
        // Descent stage box
        { a: 0, b: 1 },
        { a: 1, b: 2 },
        { a: 2, b: 3 },
        { a: 3, b: 0 },
        { a: 4, b: 5 },
        { a: 5, b: 6 },
        { a: 6, b: 7 },
        { a: 7, b: 4 },
        { a: 0, b: 4 },
        { a: 1, b: 5 },
        { a: 2, b: 6 },
        { a: 3, b: 7 },
        // Cabin Ascent lines
        { a: 8, b: 9 },
        { a: 10, b: 11 },
        { a: 12, b: 13 },
        { a: 8, b: 12, color: '#f59e0b' },
        { a: 9, b: 13, color: '#f59e0b' },
        // Leg structures (descending out)
        { a: 0, b: 14, color: '#10b981' }, // Leg 1
        { a: 1, b: 15, color: '#10b981' }, // Leg 2
        { a: 2, b: 16, color: '#10b981' }, // Leg 3
        { a: 3, b: 17, color: '#10b981' }, // Leg 4
      ];

      const hotspots: Hotspot3D[] = [
        {
          id: 'P-01',
          label: 'Manned Ascent Engine',
          pos: { x: 0, y: -22, z: 0 },
          description:
            'Pressurised hypergolic rocket combustor generating 3,500 pounds of vacuum lift thrust.',
          metric: 'Thrust: 15.6 kN',
        },
        {
          id: 'P-02',
          label: 'Basalt Level Landing Gear',
          pos: { x: -55, y: 35, z: -55 },
          description:
            'Compressible aluminum honeycomb absorbing kinetic downward velocities on soft gray lunar layers.',
          metric: 'Velocity limit: 3.2 m/s',
        },
        {
          id: 'P-03',
          label: 'Coaxial S-Band Antenna',
          pos: { x: 20, y: -35, z: 20 },
          description:
            'Unified deep space radio uplink keeping the flight crew linked to the Houston coordinate grid.',
          metric: 'Signal lag: 1.28 seconds',
        },
      ];

      return { vertices, edges, hotspots };
    }
  };

  const { vertices, edges, hotspots } = getEraGeometry();

  // Handle Drag / Rotation
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    setIsDragging(true);
    setAutoRotate(false); // Stop auto-orbit on manual user inspection
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Convert drag increments to radian offsets
    setYaw((prev) => prev + dx * 0.007);
    setPitch((prev) => Math.max(-1.2, Math.min(1.2, prev + dy * 0.007)));

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Support responsive mobile touch interaction as well
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setAutoRotate(false);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;

    setYaw((prev) => prev + dx * 0.007);
    setPitch((prev) => Math.max(-1.2, Math.min(1.2, prev + dy * 0.007)));

    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  // Auto rotation tick
  useEffect(() => {
    if (!autoRotate || !isArEnabled) return;
    const timer = setInterval(() => {
      setYaw((prev) => prev + 0.007);
    }, 40);
    return () => clearInterval(timer);
  }, [autoRotate, isArEnabled]);

  // Periodic visual tick for generic scanner and telemetry grids
  useEffect(() => {
    if (!isArEnabled) return;
    const timer = setInterval(() => {
      setScannerTick((prev) => (prev + 1) % 100);
    }, 150);
    return () => clearInterval(timer);
  }, [isArEnabled]);

  // Chronosphere Sequential sequence progress loop
  useEffect(() => {
    if (!isPlayingSeq || !isArEnabled) return;
    const maxPhase = sequenceMilestones.length - 1;

    const timer = setInterval(() => {
      setSeqProgress((prev) => {
        if (prev >= 100) {
          // Increment phase or finish
          setActiveSequencePhase((curr) => {
            if (curr < maxPhase) {
              setSeqProgress(0);
              return curr + 1;
            } else {
              setIsPlayingSeq(false);
              return curr; // Keep at last phase
            }
          });
          return 100;
        }
        return prev + 6; // Increment scan velocity
      });
    }, 120);

    return () => clearInterval(timer);
  }, [isPlayingSeq, activeSequencePhase, isArEnabled, sequenceMilestones.length]);

  // Redraw the canvas containing the 3D projection, floating markers, and HUD scanners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset size responsively
    canvas.width = canvas.parentElement?.clientWidth || 640;
    canvas.height = canvas.parentElement?.clientHeight || 420;

    const w = canvas.width;
    const h = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    if (!isArEnabled) return;

    // Coordinate math: Project 3D points to 2D screen coordinate pixels
    // Using simple yaw-pitch matrix multipliers
    const project = (pt: Point3D) => {
      // 1. Yaw rotation (Left-right look)
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const x1 = pt.x * cosY - pt.z * sinY;
      const z1 = pt.x * sinY + pt.z * cosY;

      // 2. Pitch rotation (Up-down tilting angles)
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const y2 = pt.y * cosP - z1 * sinP;
      const z2 = pt.y * sinP + z1 * cosP;

      // 3. Focal length and Perspective scalar coefficients coordinates
      const fov = 320;
      const cameraDist = 210; // Zoom factor
      // Prevent division by zero close bounds
      const zFactor = Math.max(10, cameraDist + z2);
      const scale = fov / zFactor;

      // Center-offset screen alignment
      const screenX = w / 2 + x1 * scale;
      const screenY = h / 2 + y2 * scale;
      return { x: screenX, y: screenY, depth: zFactor };
    };

    // --- Phase 1: Draw ambient background tech reference coordinate lines ---
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.04)';
    ctx.lineWidth = 0.5;
    for (let index = 0; index <= w; index += 40) {
      ctx.beginPath();
      ctx.moveTo(index, 0);
      ctx.lineTo(index, h);
      ctx.stroke();
    }
    for (let index = 0; index <= h; index += 40) {
      ctx.beginPath();
      ctx.moveTo(0, index);
      ctx.lineTo(w, index);
      ctx.stroke();
    }

    // --- Phase 2: Speculative laser height locator scan bars ---
    if (isPlayingSeq) {
      const activeLaserY = (seqProgress / 100) * h;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, activeLaserY);
      ctx.lineTo(w, activeLaserY);
      ctx.stroke();

      ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.fillRect(0, activeLaserY - 5, w, 5);
    }

    // --- Phase 3: Draw 3D Model Wireframes (Edges) ---
    edges.forEach((edge) => {
      const vA = vertices[edge.a];
      const vB = vertices[edge.b];
      if (!vA || !vB) return;

      const pA = project(vA);
      const pB = project(vB);

      // Simple screen bound safety
      if (
        pA.x < -100 ||
        pA.x > w + 100 ||
        pA.y < -100 ||
        pA.y > h + 100 ||
        pB.x < -100 ||
        pB.x > w + 100 ||
        pB.y < -100 ||
        pB.y > h + 100
      )
        return;

      ctx.strokeStyle = edge.color || 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = edge.dashed ? 1 : 1.5;

      ctx.beginPath();
      if (edge.dashed) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    });
    ctx.setLineDash([]); // Reset line dashes

    // --- Phase 4: Draw Interactive 3D Nodes / Hotspots ---
    hotspots.forEach((hs) => {
      const p = project(hs.pos);
      const btn = document.getElementById(`hotspot-btn-${hs.id}`);
      if (btn && ctx.drawElementImage && ctx.canvas.hasAttribute('layoutsubtree')) {
        const transform = ctx.drawElementImage(btn, p.x, p.y);
        btn.style.transform = transform.toString();
      } else {
        // Fallback for browsers without HTML-in-Canvas support
        // Outer glowing target circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.fill();

        // Glowing border ring
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Core point
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Display short identifier tags floating directly beside node coordinates
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText(`[${hs.id}]`, p.x + 12, p.y + 3);
      }
    });

    // --- Phase 5: Dynamic Ambient Scanner Sweeper ---
    const radY = (scannerTick / 100) * (h - 20) + 10;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(20, radY);
    ctx.lineTo(w - 20, radY);
    ctx.stroke();

    const lGrd = ctx.createLinearGradient(0, radY - 12, 0, radY);
    lGrd.addColorStop(0, 'rgba(245, 158, 11, 0)');
    lGrd.addColorStop(1, 'rgba(245, 158, 11, 0.08)');
    ctx.fillStyle = lGrd;
    ctx.fillRect(20, radY - 12, w - 40, 12);
  }, [
    yaw,
    pitch,
    scannerTick,
    isPlayingSeq,
    seqProgress,
    eraName,
    year,
    edges,
    vertices,
    hotspots,
    isArEnabled,
  ]);

  // Click handler on canvas to detect hotspots hits
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx && ctx.drawElementImage) {
      // Browsers supporting HTML-in-Canvas handle button clicks directly.
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Projection mathematics alignment check
    const project = (pt: Point3D) => {
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const x1 = pt.x * cosY - pt.z * sinY;
      const z1 = pt.x * sinY + pt.z * cosY;

      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const y2 = pt.y * cosP - z1 * sinP;
      const z2 = pt.y * sinP + z1 * cosP;

      const fov = 320;
      const cameraDist = 210;
      const zFactor = Math.max(10, cameraDist + z2);
      const scale = fov / zFactor;

      const screenX = canvas.width / 2 + x1 * scale;
      const screenY = canvas.height / 2 + y2 * scale;
      return { x: screenX, y: screenY };
    };

    // Find the closest clicked hotspot
    let clicked: Hotspot3D | null = null;
    let minDistance = 25; // Click radius box bounds

    hotspots.forEach((hs) => {
      const p = project(hs.pos);
      const dist = Math.sqrt((p.x - clickX) ** 2 + (p.y - clickY) ** 2);
      if (dist < minDistance) {
        minDistance = dist;
        clicked = hs;
      }
    });

    if (clicked) {
      setSelectedHotspot(clicked);
    } else {
      setSelectedHotspot(null);
    }
  };

  // Reset sequential walkthrough
  const startSequenceSimulation = () => {
    setActiveSequencePhase(0);
    setSeqProgress(0);
    setIsPlayingSeq(true);
  };

  return (
    <div
      className="relative w-full h-auto bg-[#07070a] border border-white/5 rounded-2xl overflow-hidden group select-none flex flex-col justify-between"
      id="time-ar-lens"
    >
      {/* HUD status line overlay */}
      <div className="absolute top-3 left-4 right-4 flex justify-between items-center z-20 pointer-events-none gap-2">
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-[9px] font-mono uppercase tracking-wider">
          <Globe className={`w-3.5 h-3.5 text-amber-500 ${isArEnabled ? 'animate-spin' : ''}`} />
          <span>LOCKED: {locationName.slice(0, 15)}</span>
        </div>

        {/* Toggle Button for AR Lens Power Control */}
        <button
          onClick={handleToggleArEnabled}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border transition pointer-events-auto cursor-pointer shadow-lg backdrop-blur-md ${isArEnabled
              ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/30 text-emerald-400 hover:text-emerald-300'
              : 'bg-zinc-900/90 hover:bg-zinc-800 border-white/10 text-zinc-400 hover:text-zinc-350'
            }`}
          title={isArEnabled ? 'Enable power saving standby mode' : 'Turn on AR Hologram engine'}
        >
          <Power
            className={`w-3 h-3 ${isArEnabled ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`}
          />
          <span>{isArEnabled ? 'AR: ACTIVE' : 'AR: STANDBY'}</span>
        </button>

        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-[9px] font-mono uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>MODEL: {eraName?.toUpperCase()}</span>
        </div>
      </div>

      {/* Primary viewport screen wrapper */}
      <div className="relative w-full h-[320px] sm:h-[380px] md:h-[400px]">
        {/* 1. Camera output background */}
        {permissionState === 'granted' && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover z-0 filter saturate-50 contrast-125 opacity-35"
          />
        ) : (
          /* Starry deep-space background simulation for AR view */
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#020205] to-[#0d0a15] opacity-90" />
        )}

        {/* 2. Interactive SVG backdrop containing radar vectors */}
        <svg
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUpOrLeave}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-10"
        >
          {/* Circular radar concentric meshes */}
          <circle
            cx="50%"
            cy="50%"
            r="60"
            fill="none"
            stroke="rgba(245, 158, 11, 0.03)"
            strokeWidth="1"
          />
          <circle
            cx="50%"
            cy="50%"
            r="130"
            fill="none"
            stroke="rgba(245, 158, 11, 0.02)"
            strokeWidth="1"
          />
          <circle
            cx="50%"
            cy="50%"
            r="200"
            fill="none"
            stroke="rgba(245, 158, 11, 0.01)"
            strokeWidth="0.5"
            strokeDasharray="5,5"
          />

          {/* Fine horizontal & vertical crosshairs */}
          <line
            x1="10%"
            y1="50%"
            x2="90%"
            y2="50%"
            stroke="rgba(245, 158, 11, 0.03)"
            strokeWidth="0.5"
          />
          <line
            x1="50%"
            y1="10%"
            x2="50%"
            y2="90%"
            stroke="rgba(245, 158, 11, 0.03)"
            strokeWidth="0.5"
          />
        </svg>

        {/* 3. Primary 3D Wireframe projection canvas */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          layoutsubtree=""
          className="absolute inset-0 pointer-events-auto z-20"
        >
          {hotspots.map((hs) => (
            <button
              key={hs.id}
              id={`hotspot-btn-${hs.id}`}
              className="absolute left-0 top-0 pointer-events-auto cursor-pointer focus:outline-none bg-transparent border-none p-0 m-0"
              style={{
                width: '32px',
                height: '32px',
              }}
              onClick={() => setSelectedHotspot(hs)}
            >
              <div className="w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center relative">
                {/* Glowing ring */}
                <div className="absolute w-4 h-4 rounded-full border border-amber-500 bg-amber-500/20 hover:scale-125 transition-transform" />
                {/* Core point */}
                <div className="absolute w-1.5 h-1.5 rounded-full bg-white" />
                {/* Label text */}
                <span className="absolute left-6 text-white text-[8.5px] font-mono font-bold whitespace-nowrap bg-black/75 px-1 py-0.5 rounded border border-white/10 pointer-events-none">
                  [{hs.id}]
                </span>
              </div>
            </button>
          ))}
        </canvas>

        {/* 4. Standby Overlay Screen (Power Saving) */}
        {!isArEnabled && (
          <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center select-text">
            <div className="relative mb-4 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border border-zinc-700 flex items-center justify-center bg-zinc-900/50 relative">
                <Power className="w-7 h-7 text-zinc-500 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>

            <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-1">
              Hologram Engine Standby
            </h3>
            <p className="text-[10px] font-sans text-zinc-500 max-w-[280px] leading-relaxed mb-5">
              Live AR spatial projections and sensor telemetry tracking are paused to save battery
              and boost client performance.
            </p>

            <button
              onClick={() => setIsArEnabled(true)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-lg transition-all duration-150 cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Resume AR Overlay Link</span>
            </button>

            <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[8px] font-mono text-zinc-650 uppercase">
              <span>Sensor Feed: SUSPENDED</span>
              <span>Power Mode: ECO_BATTERY</span>
            </div>
          </div>
        )}

        {/* Dynamic Context 3D Hotspot overlay card */}
        {selectedHotspot && (
          <div className="absolute bottom-4 left-4 right-4 z-30 bg-black/95 backdrop-blur-xl p-4 rounded-xl border-2 border-amber-500/50 flex flex-col gap-1 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest">
              <span>Holographic Element Details [ID: {selectedHotspot.id}]</span>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="text-zinc-500 hover:text-white transition uppercase text-[8.5px] border border-white/5 px-2 py-0.5 rounded cursor-pointer"
              >
                DISMISS
              </button>
            </div>
            <h4 className="text-sm font-serif font-extrabold text-white py-0.5 italic">
              {selectedHotspot.label}
            </h4>
            <p className="text-xs text-zinc-350 leading-relaxed font-sans">
              {selectedHotspot.description}
            </p>
            <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-between items-center text-[9.5px] font-mono text-zinc-400">
              <span>
                Telemetry: <span className="text-emerald-400">{selectedHotspot.metric}</span>
              </span>
              <span>Coordinates Sync: LOCKED</span>
            </div>
          </div>
        )}
      </div>

      {/* Manual Gyro navigation sliders & sequence playback dashboard */}
      <div
        className={`p-4 bg-zinc-950 border-t border-white/5 space-y-4 z-30 text-left transition-all duration-300 ${isArEnabled
            ? 'opacity-100'
            : 'opacity-40 pointer-events-none select-none filter grayscale-[30%]'
          }`}
      >
        {/* Dynamic Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Orbit Navigation coordinates controls */}
          <div className="bg-[#0e0e12]/80 p-3.5 rounded-xl border border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                Spatio-Coaxial Manual Panning
              </span>
              <button
                onClick={() => {
                  setAutoRotate((prev) => !prev);
                  setSelectedHotspot(null);
                }}
                className={`px-2.5 py-1 rounded text-[8.5px] font-mono uppercase cursor-pointer transition ${autoRotate
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                    : 'bg-zinc-900 text-zinc-400 border border-white/5'
                  }`}
              >
                {autoRotate ? 'Auto-Orbit: ON' : 'Auto-Orbit: OFF'}
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-[9px] text-zinc-450 uppercase">
                <span>Yaw (Hz Coordinate Angle)</span>
                <span>{(yaw * (180 / Math.PI)).toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="-3.14"
                max="3.14"
                step="0.05"
                value={yaw}
                onChange={(e) => {
                  setYaw(Number(e.target.value));
                  setAutoRotate(false);
                }}
                className="w-full accent-amber-500 h-1 bg-zinc-850 rounded-lg cursor-ew-resize appearance-none"
              />

              <div className="flex justify-between items-center text-[9px] text-zinc-450 uppercase pt-1">
                <span>Pitch (Vertical Lens tilt)</span>
                <span>{(pitch * (180 / Math.PI)).toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="-1.2"
                max="1.2"
                step="0.05"
                value={pitch}
                onChange={(e) => {
                  setPitch(Number(e.target.value));
                  setAutoRotate(false);
                }}
                className="w-full accent-amber-500 h-1 bg-zinc-850 rounded-lg cursor-ew-resize appearance-none"
              />
            </div>
          </div>

          {/* Interactive animated sequences engine timeline player */}
          <div className="bg-[#0e0e12]/80 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-500/20" />
                Animated Chronosphere Sequence Player
              </span>
              <p className="text-[10.5px] text-zinc-500 leading-snug">
                Animate chronological steps mapping the historic coordinates and structural elements
                of {eraName}.
              </p>
            </div>

            <div className="space-y-2 pt-2.5">
              {/* Play buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={startSequenceSimulation}
                  disabled={isPlayingSeq}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-400/40 rounded-lg text-[9px] font-mono uppercase tracking-widest transition flex items-center gap-1 cursor-pointer disabled:opacity-35"
                >
                  <Play className="w-3 h-3 fill-amber-400" />
                  Trigger Sequential Simulation
                </button>

                {isPlayingSeq && (
                  <button
                    onClick={() => setIsPlayingSeq(false)}
                    className="px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[9px] font-mono uppercase transition flex items-center gap-1 cursor-pointer"
                  >
                    <Pause className="w-3 h-3" />
                    PAUSE
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsPlayingSeq(false);
                    setSeqProgress(0);
                    setActiveSequencePhase(0);
                  }}
                  className="p-1 px-2.5 bg-zinc-900 border border-white/5 rounded-lg text-[9px] text-zinc-450 hover:text-white transition cursor-pointer font-mono"
                  title="Reset sequencer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* Progress player feedback indicators */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-mono text-zinc-400 uppercase">
                  <span>Progress Index</span>
                  <span>{isPlayingSeq ? `${seqProgress}%` : 'IDLE'}</span>
                </div>
                <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-150"
                    style={{ width: `${isPlayingSeq ? seqProgress : activeSequencePhase * 33.3}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width Sequential Event narrative walkthrough display */}
        <div className="bg-[#0d0d12] p-4 rounded-xl border border-[#f59e0b]/20 flex items-start gap-4">
          <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1 select-text">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-wider text-amber-500">
              <span>{sequenceMilestones[activeSequencePhase].name}</span>
              <span className="text-zinc-650">•</span>
              <span className="text-zinc-400 text-[9px] font-normal lowercase italic bg-zinc-950 px-2 py-0.5 rounded">
                locked offset {formattedYear}
              </span>
            </div>
            <p className="text-[11px] text-zinc-350 leading-relaxed font-sans mt-1">
              {sequenceMilestones[activeSequencePhase].desc}
            </p>
          </div>
        </div>

        {/* Bottom controls: Cam status and authorisation buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-white/5">
          <span className="text-[9px] text-zinc-450 uppercase font-mono tracking-widest leading-none flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Active viewport calibrated: {vertices.length} coordinates, {edges.length} links synced.
          </span>

          <div className="flex gap-2">
            {permissionState === 'granted' ? (
              <button
                onClick={deactivateCamera}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[9px] font-mono uppercase tracking-widest transition cursor-pointer active:scale-95"
              >
                Disable Real Cam Feed
              </button>
            ) : (
              <button
                onClick={activateCamera}
                className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-[9px] font-mono uppercase tracking-widest transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
                Authorize Real Camera
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
