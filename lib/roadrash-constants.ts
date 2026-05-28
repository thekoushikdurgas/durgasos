/** Road Rash game constants, registries, and tab types */

export const SECRET_KEY = 'roadrash_durgasos_secret_salt_2026';
export const FPS = 60;
export const STEP = 1 / FPS;
export const TRACK_LENGTH_SEGMENTS = 1000;
export const SEGMENT_LENGTH = 200;
export const ROAD_WIDTH = 2000;
export const CAMERA_HEIGHT = 1000;
export const INITIAL_MONEY = 1000;

export type RoadRashTab = 'menu' | 'garage' | 'multiplayer' | 'leaderboard' | 'settings' | 'social';

export interface BikeDefinition {
  name: string;
  price: number;
  maxSpeed: number;
  accel: number;
  handling: number;
  durability: number;
  desc: string;
}

export const BIKES_REGISTRY: Record<string, BikeDefinition> = {
  Diablo: {
    name: 'Diablo (Classic)',
    price: 0,
    maxSpeed: 180,
    accel: 15,
    handling: 70,
    durability: 80,
    desc: 'Standard entry-level scooter. Reliable but slow.',
  },
  'Pulsar 220': {
    name: 'Pulsar 220',
    price: 800,
    maxSpeed: 230,
    accel: 25,
    handling: 80,
    durability: 85,
    desc: 'A street favorite in India. Responsive acceleration.',
  },
  'Bullet 350': {
    name: 'Bullet 350',
    price: 1500,
    maxSpeed: 210,
    accel: 20,
    handling: 60,
    durability: 150,
    desc: 'Heavy thump, indestructible chassis. Slow steering but tanks damage.',
  },
  'Splendor Pro': {
    name: 'Splendor Pro (Meme Edition)',
    price: 2500,
    maxSpeed: 260,
    accel: 35,
    handling: 95,
    durability: 50,
    desc: 'Lightweight commuter modified with nitromethane. Fast but extremely fragile.',
  },
  Hayabusa: {
    name: 'Hayabusa',
    price: 5000,
    maxSpeed: 320,
    accel: 45,
    handling: 85,
    durability: 100,
    desc: 'The ultimate hyperbike. Extreme speed, needs expert handling.',
  },
};

export interface TrackDefinition {
  id: string;
  name: string;
  distance: number;
  difficulty: string;
  theme: string;
  baseReward: number;
  /** CSS gradient for card preview when image missing */
  previewGradient: string;
}

export const TRACKS: TrackDefinition[] = [
  {
    id: 'mumbai',
    name: 'Mumbai Marine Drive',
    distance: 5000,
    difficulty: 'Easy',
    theme: 'Coastal highway, cows, occasional rickshaws',
    baseReward: 300,
    previewGradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 50%, #0f172a 100%)',
  },
  {
    id: 'delhi',
    name: 'Delhi Connaught Place',
    distance: 7500,
    difficulty: 'Medium',
    theme: 'Foggy/smoggy circles, dense traffic, aggressive drivers',
    baseReward: 600,
    previewGradient: 'linear-gradient(135deg, #64748b 0%, #334155 50%, #1e293b 100%)',
  },
  {
    id: 'goa',
    name: 'Goa NH-17 Highway',
    distance: 10000,
    difficulty: 'Hard',
    theme: 'Hilly curves, beach sunset, high speed lanes',
    baseReward: 1000,
    previewGradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 40%, #7c2d12 100%)',
  },
];

export const TAB_LABELS: Record<RoadRashTab, string> = {
  menu: 'Career',
  garage: 'Garage & Bikes',
  multiplayer: 'Competitive Lobby',
  leaderboard: 'Leaderboards',
  social: 'Social',
  settings: 'Preferences',
};

export function createSeededRandom(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function generateHmac(message: string, secret: string = SECRET_KEY): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
