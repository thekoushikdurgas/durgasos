/** Road Rash game engine helpers — NPC AI, weather, audio profiles, performance tiers */

export type NpcArchetype = 'aggressive' | 'defensive' | 'erratic' | 'rule_follower';
export type WeatherType = 'sunny' | 'rainy' | 'foggy' | 'thunderstorm' | 'heatwave' | 'dust_storm';

export const LOOKAHEAD_SEGMENTS = 20;
export const SEGMENT_LENGTH = 200;

export const ENGINE_PROFILES: Record<
  string,
  { type: OscillatorType; baseFreq: number; maxFreq: number }
> = {
  Diablo: { type: 'sine', baseFreq: 35, maxFreq: 160 },
  'Pulsar 220': { type: 'sawtooth', baseFreq: 55, maxFreq: 240 },
  'Bullet 350': { type: 'square', baseFreq: 30, maxFreq: 130 },
  'Splendor Pro': { type: 'sawtooth', baseFreq: 65, maxFreq: 280 },
  Hayabusa: { type: 'sawtooth', baseFreq: 80, maxFreq: 320 },
};

export const QUALITY_TIERS = [
  { drawDistance: 80, canvasScale: 0.5, rainDrops: 10, particles: false },
  { drawDistance: 160, canvasScale: 0.75, rainDrops: 20, particles: true },
  { drawDistance: 300, canvasScale: 1, rainDrops: 40, particles: true },
] as const;

export const WEATHER_CYCLE: WeatherType[] = [
  'sunny',
  'rainy',
  'foggy',
  'thunderstorm',
  'heatwave',
  'dust_storm',
];

export function pickArchetype(rng: () => number): NpcArchetype {
  const r = rng();
  if (r < 0.35) return 'aggressive';
  if (r < 0.6) return 'defensive';
  if (r < 0.85) return 'erratic';
  return 'rule_follower';
}

export function overlap1d(x1: number, w1: number, x2: number, w2: number, percent = 0.8): boolean {
  const half1 = (w1 * percent) / 2;
  const half2 = (w2 * percent) / 2;
  return x1 + half1 > x2 - half2 && x1 - half1 < x2 + half2;
}

/** Lookahead steering away from faster entities ahead */
export function computeLookaheadSteer(
  entityOffset: number,
  entitySpeed: number,
  playerOffset: number,
  playerSpeed: number,
  maxSpeed: number,
  lookahead: number,
  checkAhead: (i: number) => { offset: number; speed: number } | null
): number {
  let steer = 0;
  for (let i = 1; i < lookahead; i++) {
    const ahead = checkAhead(i);
    if (!ahead) continue;
    if (ahead.speed > entitySpeed && overlap1d(entityOffset, 0.5, ahead.offset, 0.5)) {
      const dir = entityOffset < ahead.offset ? -1 : entityOffset > ahead.offset ? 1 : 0;
      steer += dir * (1 / i) * ((ahead.speed - entitySpeed) / maxSpeed);
    }
  }
  return steer;
}

export function isWetWeather(w: WeatherType): boolean {
  return w === 'rainy' || w === 'thunderstorm';
}

export function isLowVisibility(w: WeatherType): boolean {
  return w === 'foggy' || w === 'dust_storm';
}

export function lerpWeather(
  from: WeatherType,
  to: WeatherType,
  t: number
): { display: WeatherType; blend: number } {
  return { display: t >= 1 ? to : from, blend: Math.min(1, Math.max(0, t)) };
}

export function getSeasonWeek(): number {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const diff = now.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getUTCDay() + 1) / 7);
}

export function daysUntilSeasonReset(): number {
  const now = new Date();
  const day = now.getUTCDay();
  return day === 0 ? 1 : 8 - day;
}

export function medalEmoji(medal: string | null | undefined): string {
  if (medal === 'gold') return '🥇';
  if (medal === 'silver') return '🥈';
  if (medal === 'bronze') return '🥉';
  return '';
}

/** Seeded PRNG for game-loop use (avoids Math.random in React component bodies). */
export function createGameLoopRng(seed = 0x9e3779b9) {
  let state = seed | 0;
  return {
    reset(nextSeed?: number) {
      state = (nextSeed ?? seed) | 0;
    },
    next(): number {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
