export interface Move {
  name: string;
  power: number;
  type: string;
  category: 'Physical' | 'Special' | 'Status';
  description: string;
}

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export interface Pokemon {
  id?: string;
  name: string;
  types: string[];
  stats: Stats;
  moves: Move[];
  description: string;
  // Battle runtime stats
  hp?: number;
  maxHp?: number;
  level?: number;
}

export interface DamageBreakdown {
  baseDamage: number;
  stab: number;
  typeEffectiveness: number;
  weatherMod: number;
  terrainMod: number;
  randomRoll: number;
  finalDamage: number;
}

export interface BattleLogEntry {
  id: string;
  type: 'attack' | 'swap' | 'weather' | 'terrain' | 'defeat' | 'system' | 'commentary';
  text: string;
  timestamp: number;
  breakdown?: DamageBreakdown;
}

export type BattleStatus = 'idle' | 'roster_selection' | 'battling' | 'won' | 'lost' | 'coaching';

export interface BattleState {
  status: BattleStatus;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  playerTeam: Pokemon[];
  aiTeam: Pokemon[];
  playerActiveIdx: number;
  aiActiveIdx: number;
  weather: 'None' | 'Sunny' | 'Rain' | 'Sandstorm' | 'Hail';
  terrain: 'None' | 'Grassy' | 'Electric' | 'Psychic' | 'Misty';
  weatherTurns: number;
  terrainTurns: number;
  logs: BattleLogEntry[];
  turnNumber: number;
  turnOwner: 'player' | 'ai' | 'animating';
  selectedAction: 'move' | 'switch' | 'none';
  coachAnalysis?: string;
  isGeneratingTeam: boolean;
}

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  turns_taken: number;
  remaining_hp: number;
  difficulty: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
}

export interface ProfileStats {
  battlesTotal: number;
  battlesWon: number;
  battlesLost: number;
  currentStreak: number;
  highestStreak: number;
}

export interface PokemonProfile {
  id: string;
  owner_id: string;
  player_name: string;
  stats: ProfileStats;
  customPokemon: Pokemon[];
  achievements: Achievement[];
}

export type ThemeName = 'Classic' | 'Neon Cyber' | 'Solar Dawn' | 'Deep Ocean' | 'Tectonic';
