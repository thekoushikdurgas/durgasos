import { create } from 'zustand';
import {
  Pokemon,
  Move,
  BattleState,
  BattleLogEntry,
  LeaderboardEntry,
  PokemonProfile,
  ThemeName,
  DamageBreakdown,
} from './types';

// --- TYPE MATCHUPS TABLE ---
const TYPE_CHART: Record<string, Record<string, number>> = {
  Normal: { Ghost: 0 },
  Fire: {
    Fire: 0.5,
    Water: 0.5,
    Grass: 2.0,
    Ice: 2.0,
    Bug: 2.0,
    Rock: 0.5,
    Dragon: 0.5,
    Steel: 2.0,
  },
  Water: { Fire: 2.0, Water: 0.5, Grass: 0.5, Ground: 2.0, Rock: 2.0, Dragon: 0.5 },
  Electric: { Water: 2.0, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2.0, Dragon: 0.5 },
  Grass: {
    Fire: 0.5,
    Water: 2.0,
    Grass: 0.5,
    Poison: 0.5,
    Ground: 2.0,
    Flying: 0.5,
    Bug: 0.5,
    Rock: 2.0,
    Dragon: 0.5,
    Steel: 0.5,
  },
  Ice: {
    Fire: 0.5,
    Water: 0.5,
    Grass: 2.0,
    Ice: 0.5,
    Ground: 2.0,
    Flying: 2.0,
    Dragon: 2.0,
    Steel: 0.5,
  },
  Fighting: {
    Normal: 2.0,
    Ice: 2.0,
    Poison: 0.5,
    Flying: 0.5,
    Psychic: 0.5,
    Bug: 0.5,
    Rock: 2.0,
    Ghost: 0,
    Dark: 2.0,
    Steel: 2.0,
    Fairy: 0.5,
  },
  Poison: { Grass: 2.0, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2.0 },
  Ground: {
    Fire: 2.0,
    Electric: 2.0,
    Grass: 0.5,
    Poison: 2.0,
    Flying: 0,
    Bug: 0.5,
    Rock: 2.0,
    Steel: 2.0,
  },
  Flying: { Electric: 0.5, Grass: 2.0, Fighting: 2.0, Bug: 2.0, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2.0, Poison: 2.0, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: {
    Fire: 0.5,
    Fighting: 0.5,
    Poison: 0.5,
    Flying: 0.5,
    Psychic: 2.0,
    Ghost: 0.5,
    Dark: 2.0,
    Steel: 0.5,
    Fairy: 0.5,
  },
  Rock: { Fire: 2.0, Ice: 2.0, Fighting: 0.5, Ground: 0.5, Flying: 2.0, Bug: 2.0, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2.0, Ghost: 2.0, Dark: 0.5 },
  Dragon: { Dragon: 2.0, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2.0, Ghost: 2.0, Dark: 0.5, Fairy: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2.0, Rock: 2.0, Steel: 0.5, Fairy: 2.0 },
  Fairy: { Fire: 0.5, Fighting: 2.0, Poison: 0.5, Dragon: 2.0, Dark: 2.0, Steel: 0.5 },
};

export function getTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
  let mult = 1.0;
  for (const defType of defenderTypes) {
    if (TYPE_CHART[moveType] && TYPE_CHART[moveType][defType] !== undefined) {
      mult *= TYPE_CHART[moveType][defType];
    }
  }
  return mult;
}

// --- STANDARD DAMAGE CALCULATION (Gen 5+ Rules) ---
export function calculateDamage(
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  weather: string,
  terrain: string
): { damage: number; breakdown: DamageBreakdown } {
  const level = attacker.level || 50;
  const isSpecial = move.category === 'Special';
  const atkStat = isSpecial ? attacker.stats.spAtk : attacker.stats.atk;
  const defStat = isSpecial ? defender.stats.spDef : defender.stats.def;

  // Base Damage Formula: (((2 * level / 5 + 2) * power * Attack / Defense) / 50) + 2
  const baseDamage = Math.floor(
    (((2 * level) / 5 + 2) * move.power * (atkStat / defStat)) / 50 + 2
  );

  // Same-Type Attack Bonus (STAB)
  const isStab = attacker.types.includes(move.type);
  const stab = isStab ? 1.5 : 1.0;

  // Type Effectiveness
  const typeEffectiveness = getTypeEffectiveness(move.type, defender.types);

  // Weather Modifiers
  let weatherMod = 1.0;
  if (weather === 'Sunny') {
    if (move.type === 'Fire') weatherMod = 1.5;
    else if (move.type === 'Water') weatherMod = 0.5;
  } else if (weather === 'Rain') {
    if (move.type === 'Water') weatherMod = 1.5;
    else if (move.type === 'Fire') weatherMod = 0.5;
  }

  // Terrain Modifiers
  let terrainMod = 1.0;
  if (terrain === 'Electric' && move.type === 'Electric') terrainMod = 1.5;
  else if (terrain === 'Grassy' && move.type === 'Grass') terrainMod = 1.5;
  else if (terrain === 'Psychic' && move.type === 'Psychic') terrainMod = 1.5;
  else if (terrain === 'Misty' && move.type === 'Fairy') terrainMod = 0.5;

  // Random Roll: 85% to 100% of damage
  const randomRoll = parseFloat((0.85 + Math.random() * 0.15).toFixed(2));

  // Final Output
  const finalDamage = Math.max(
    1,
    Math.floor(baseDamage * stab * typeEffectiveness * weatherMod * terrainMod * randomRoll)
  );

  return {
    damage: finalDamage,
    breakdown: {
      baseDamage,
      stab,
      typeEffectiveness,
      weatherMod,
      terrainMod,
      randomRoll,
      finalDamage,
    },
  };
}

// --- CLASSIC PREMADE POKEMON ROSTER ---
export const PREMADE_ROSTER: Pokemon[] = [
  {
    name: 'Charizard',
    types: ['Fire', 'Flying'],
    stats: { hp: 178, atk: 104, def: 98, spAtk: 159, spDef: 105, speed: 120 },
    moves: [
      {
        name: 'Flamethrower',
        power: 90,
        type: 'Fire',
        category: 'Special',
        description: 'Blasts fire at the foe.',
      },
      {
        name: 'Air Slash',
        power: 75,
        type: 'Flying',
        category: 'Special',
        description: 'Slashes with air blades.',
      },
      {
        name: 'Dragon Claw',
        power: 80,
        type: 'Dragon',
        category: 'Physical',
        description: 'Claws with dragon energy.',
      },
      {
        name: 'Fire Spin',
        power: 35,
        type: 'Fire',
        category: 'Special',
        description: 'Traps opponent in fire.',
      },
    ],
    description: 'A fiery dragon-like Pokémon. It spits fire that is hot enough to melt boulders.',
  },
  {
    name: 'Blastoise',
    types: ['Water'],
    stats: { hp: 184, atk: 103, def: 120, spAtk: 105, spDef: 125, speed: 98 },
    moves: [
      {
        name: 'Hydro Pump',
        power: 110,
        type: 'Water',
        category: 'Special',
        description: 'Blasts high-pressure water.',
      },
      {
        name: 'Surf',
        power: 90,
        type: 'Water',
        category: 'Special',
        description: 'Rides a massive wave.',
      },
      {
        name: 'Ice Beam',
        power: 90,
        type: 'Ice',
        category: 'Special',
        description: 'Freezes with an icy beam.',
      },
      {
        name: 'Skull Bash',
        power: 130,
        type: 'Normal',
        category: 'Physical',
        description: 'Tackles with a hard skull.',
      },
    ],
    description:
      'A turtle armor-clad Pokémon. The rocket cannons on its shell shoot pressurized water.',
  },
  {
    name: 'Venusaur',
    types: ['Grass', 'Poison'],
    stats: { hp: 185, atk: 102, def: 103, spAtk: 120, spDef: 120, speed: 100 },
    moves: [
      {
        name: 'Solar Beam',
        power: 120,
        type: 'Grass',
        category: 'Special',
        description: 'Absorbs light then fires.',
      },
      {
        name: 'Sludge Bomb',
        power: 90,
        type: 'Poison',
        category: 'Special',
        description: 'Hurls poisonous sludge.',
      },
      {
        name: 'Earthquake',
        power: 100,
        type: 'Ground',
        category: 'Physical',
        description: 'Shakes the ground.',
      },
      {
        name: 'Razor Leaf',
        power: 55,
        type: 'Grass',
        category: 'Physical',
        description: 'Launches sharp leaves.',
      },
    ],
    description:
      'A flower-carrying dinosaur. The flower on its back captures energy from sunlight.',
  },
  {
    name: 'Pikachu',
    types: ['Electric'],
    stats: { hp: 140, atk: 115, def: 60, spAtk: 90, spDef: 70, speed: 140 },
    moves: [
      {
        name: 'Thunderbolt',
        power: 90,
        type: 'Electric',
        category: 'Special',
        description: 'Strikes with standard electricity.',
      },
      {
        name: 'Iron Tail',
        power: 100,
        type: 'Steel',
        category: 'Physical',
        description: 'Slams with a steel tail.',
      },
      {
        name: 'Quick Attack',
        power: 40,
        type: 'Normal',
        category: 'Physical',
        description: 'Strikes first with speed.',
      },
      {
        name: 'Electro Ball',
        power: 80,
        type: 'Electric',
        category: 'Special',
        description: 'Hurls an electric sphere.',
      },
    ],
    description:
      'An electric rodent. It stores electricity in its red cheeks and discharges it when angry.',
  },
  {
    name: 'Garchomp',
    types: ['Ground', 'Dragon'],
    stats: { hp: 208, atk: 170, def: 115, spAtk: 80, spDef: 105, speed: 122 },
    moves: [
      {
        name: 'Earthquake',
        power: 100,
        type: 'Ground',
        category: 'Physical',
        description: 'Triggers a massive quake.',
      },
      {
        name: 'Dragon Claw',
        power: 80,
        type: 'Dragon',
        category: 'Physical',
        description: 'Slashes with claws.',
      },
      {
        name: 'Rock Slide',
        power: 75,
        type: 'Rock',
        category: 'Physical',
        description: 'Hurls heavy boulders.',
      },
      {
        name: 'Slash',
        power: 70,
        type: 'Normal',
        category: 'Physical',
        description: 'Slashes with sharp claws.',
      },
    ],
    description: 'A cave-dwelling dragon. It runs at the speed of a jet fighter.',
  },
  {
    name: 'Tyranitar',
    types: ['Rock', 'Dark'],
    stats: { hp: 205, atk: 164, def: 130, spAtk: 95, spDef: 120, speed: 81 },
    moves: [
      {
        name: 'Stone Edge',
        power: 100,
        type: 'Rock',
        category: 'Physical',
        description: 'Stabs with sharp stones.',
      },
      {
        name: 'Crunch',
        power: 80,
        type: 'Dark',
        category: 'Physical',
        description: 'Crunches with dark energy.',
      },
      {
        name: 'Earthquake',
        power: 100,
        type: 'Ground',
        category: 'Physical',
        description: 'Causes ground-shaking shockwaves.',
      },
      {
        name: 'Rock Tomb',
        power: 60,
        type: 'Rock',
        category: 'Physical',
        description: 'Traps opponent, reducing Speed.',
      },
    ],
    description:
      'An armored beast. Its body cannot be harmed by any attack, making it highly defensive.',
  },
];

interface StoreState {
  // Connection
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
  callRpc: ((method: string, params: Record<string, any>) => Promise<any>) | null;
  setCallRpc: (callRpc: (method: string, params: Record<string, any>) => Promise<any>) => void;

  // Roster and Profiles
  nickname: string;
  avatar: string;
  setNickname: (nickname: string) => void;
  profile: PokemonProfile | null;
  loadProfile: () => Promise<void>;
  saveProfile: (next: PokemonProfile) => Promise<void>;
  unlockAchievement: (id: string) => void;
  customRoster: Pokemon[];
  setCustomRoster: (team: Pokemon[]) => void;
  generateCustomTeam: (theme: string) => Promise<void>;

  // Battle State
  battle: BattleState;
  setDifficulty: (difficulty: 'Easy' | 'Medium' | 'Hard') => void;
  selectRosterTeam: (team: Pokemon[]) => void;
  startNewBattle: () => void;
  executeTurnAction: (
    actionType: 'move' | 'switch',
    details: { moveName?: string; switchIdx?: number }
  ) => Promise<void>;
  resetBattle: () => void;

  // Leaderboard
  leaderboard: LeaderboardEntry[];
  loadLeaderboard: () => Promise<void>;
  submitLeaderboardScore: (score: number, turns: number, hpLeft: number) => Promise<void>;

  // UI styling theme
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const INITIAL_BATTLE: BattleState = {
  status: 'idle',
  difficulty: 'Medium',
  playerTeam: [],
  aiTeam: [],
  playerActiveIdx: 0,
  aiActiveIdx: 0,
  weather: 'None',
  terrain: 'None',
  weatherTurns: 0,
  terrainTurns: 0,
  logs: [],
  turnNumber: 0,
  turnOwner: 'player',
  selectedAction: 'none',
  isGeneratingTeam: false,
};

export const useStore = create<StoreState>((set, get) => ({
  // Connection
  isConnected: false,
  setConnected: (isConnected) => set({ isConnected }),
  callRpc: null,
  setCallRpc: (callRpc) => set({ callRpc }),

  // Roster and Profiles
  nickname:
    (typeof window !== 'undefined' ? localStorage.getItem('durgasos_pokemon_nickname') : '') ||
    'Trainer',
  avatar:
    (typeof window !== 'undefined' ? localStorage.getItem('durgasos_pokemon_avatar') : '') ||
    `https://picsum.photos/40/40?seed=pokemon-${Math.random()}`,
  setNickname: (nickname) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('durgasos_pokemon_nickname', nickname);
    }
    set({ nickname });
  },
  profile: null,
  customRoster: [],
  setCustomRoster: (customRoster) => set({ customRoster }),

  loadProfile: async () => {
    const { callRpc } = get();
    if (!callRpc) return;
    try {
      const profile = await callRpc('pokemon.profile.get', {});
      if (profile) {
        set({ profile, customRoster: profile.customPokemon || [] });
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  },

  saveProfile: async (next) => {
    set({ profile: next, customRoster: next.customPokemon });
    const { callRpc } = get();
    if (callRpc) {
      try {
        await callRpc('pokemon.profile.save', next);
      } catch (err) {
        console.error('Failed to save profile:', err);
      }
    }
  },

  unlockAchievement: (id) => {
    const { profile } = get();
    if (!profile) return;
    const achievements = profile.achievements.map((ach) => {
      if (ach.id === id && !ach.unlockedAt) {
        return { ...ach, unlockedAt: Date.now() };
      }
      return ach;
    });
    void get().saveProfile({ ...profile, achievements });
  },

  generateCustomTeam: async (theme) => {
    const { callRpc, profile } = get();
    if (!callRpc) return;
    set((state) => ({ battle: { ...state.battle, isGeneratingTeam: true } }));
    try {
      const res = await callRpc('pokemon.game.generate_team', { theme });
      if (res?.team) {
        const team = res.team.map((p: any) => ({
          ...p,
          id: `ai-gen-${Date.now()}-${Math.random().toString(36).substring(5)}`,
          level: 50,
        }));
        set({ customRoster: team });
        if (profile) {
          void get().saveProfile({ ...profile, customPokemon: team });
        }
        get().unlockAchievement('p3'); // Geneticist achievement
      }
    } catch (err) {
      console.error('Failed to generate team:', err);
    } finally {
      set((state) => ({ battle: { ...state.battle, isGeneratingTeam: false } }));
    }
  },

  // Battle State
  battle: INITIAL_BATTLE,
  setDifficulty: (difficulty) => set((state) => ({ battle: { ...state.battle, difficulty } })),

  selectRosterTeam: (team) => {
    set((state) => ({
      battle: {
        ...state.battle,
        playerTeam: team.map((p) => ({ ...p, hp: p.stats.hp, maxHp: p.stats.hp, level: 50 })),
        status: 'idle',
      },
    }));
  },

  startNewBattle: () => {
    const { playerTeam, difficulty } = get().battle;
    if (playerTeam.length !== 3) return;

    // Pick 3 random AI Pokemon from the Premade Roster (but not repeating player choices if possible)
    let availableAi = [...PREMADE_ROSTER].filter(
      (p) => !playerTeam.some((pt) => pt.name === p.name)
    );
    if (availableAi.length < 3) {
      availableAi = [...PREMADE_ROSTER];
    }
    const aiTeam: Pokemon[] = [];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * availableAi.length);
      aiTeam.push({
        ...availableAi[idx],
        hp: availableAi[idx].stats.hp,
        maxHp: availableAi[idx].stats.hp,
        level: 50,
      });
      availableAi.splice(idx, 1);
    }

    const startLog: BattleLogEntry = {
      id: crypto.randomUUID(),
      type: 'system',
      text: `Battle Started! Challenger vs AI Gym Leader (${difficulty} Mode).`,
      timestamp: Date.now(),
    };

    set((state) => ({
      battle: {
        ...state.battle,
        status: 'battling',
        aiTeam,
        playerActiveIdx: 0,
        aiActiveIdx: 0,
        weather: 'None',
        terrain: 'None',
        weatherTurns: 0,
        terrainTurns: 0,
        logs: [startLog],
        turnNumber: 1,
        turnOwner: 'player',
        selectedAction: 'none',
        coachAnalysis: undefined,
      },
    }));
  },

  executeTurnAction: async (actionType, details) => {
    const { battle, callRpc } = get();
    if (battle.status !== 'battling' || battle.turnOwner !== 'player') return;

    let pTeam = [...battle.playerTeam];
    let aTeam = [...battle.aiTeam];
    let pIdx = battle.playerActiveIdx;
    let aIdx = battle.aiActiveIdx;
    let turnLogs: BattleLogEntry[] = [];
    let pPokemon = pTeam[pIdx];
    let aPokemon = aTeam[aIdx];

    set((state) => ({ battle: { ...state.battle, turnOwner: 'animating' } }));

    // 1. Resolve Player Action (Swap or Attack)
    if (actionType === 'switch') {
      const switchIdx = details.switchIdx!;
      pIdx = switchIdx;
      pPokemon = pTeam[pIdx];
      turnLogs.push({
        id: crypto.randomUUID(),
        type: 'swap',
        text: `Trainer withdrew ${battle.playerTeam[battle.playerActiveIdx].name} and sent out ${pPokemon.name}!`,
        timestamp: Date.now(),
      });
    } else {
      // Attack
      const moveName = details.moveName!;
      const move = pPokemon.moves.find((m) => m.name === moveName)!;
      const calc = calculateDamage(pPokemon, aPokemon, move, battle.weather, battle.terrain);

      aPokemon.hp = Math.max(0, (aPokemon.hp || 0) - calc.damage);
      turnLogs.push({
        id: crypto.randomUUID(),
        type: 'attack',
        text: `${pPokemon.name} used ${move.name}! It dealt ${calc.damage} damage to ${aPokemon.name}!`,
        timestamp: Date.now(),
        breakdown: calc.breakdown,
      });

      if (aPokemon.hp === 0) {
        turnLogs.push({
          id: crypto.randomUUID(),
          type: 'defeat',
          text: `AI's ${aPokemon.name} fainted!`,
          timestamp: Date.now(),
        });
      }
    }

    // Check if AI is fully defeated
    const aiDefeated = aTeam.every((p) => p.hp === 0);
    if (aiDefeated) {
      const finalLog: BattleLogEntry = {
        id: crypto.randomUUID(),
        type: 'system',
        text: `🏆 VICTORY! All AI Pokémon have fainted.`,
        timestamp: Date.now(),
      };
      const totalRemainingHp = pTeam.reduce((acc, p) => acc + (p.hp || 0), 0);
      const turns = battle.turnNumber + 1;
      const score = Math.max(100, 5000 - turns * 120 + totalRemainingHp * 2);

      set((state) => ({
        battle: {
          ...state.battle,
          playerTeam: pTeam,
          aiTeam: aTeam,
          playerActiveIdx: pIdx,
          aiActiveIdx: aIdx,
          logs: [...state.battle.logs, ...turnLogs, finalLog],
          status: 'won',
          turnOwner: 'player',
        },
      }));

      // Submit to leaderboard
      void get().submitLeaderboardScore(score, turns, totalRemainingHp);

      // Save Profile stats
      const { profile } = get();
      if (profile) {
        const nextWon = profile.stats.battlesWon + 1;
        const nextStreak = profile.stats.currentStreak + 1;
        const nextHighest = Math.max(profile.stats.highestStreak, nextStreak);
        const updatedProfile = {
          ...profile,
          stats: {
            ...profile.stats,
            battlesTotal: profile.stats.battlesTotal + 1,
            battlesWon: nextWon,
            currentStreak: nextStreak,
            highestStreak: nextHighest,
          },
        };
        void get().saveProfile(updatedProfile);

        // Achievements check
        get().unlockAchievement('p1'); // First Encounter
        if (nextStreak >= 3) get().unlockAchievement('p2'); // Gym Leader
        if (battle.difficulty === 'Hard') get().unlockAchievement('p4'); // Champion
      }
      return;
    }

    // 2. Switch AI Active Pokemon if fainted
    if (aPokemon.hp === 0) {
      aIdx = aTeam.findIndex((p) => p.hp! > 0);
      aPokemon = aTeam[aIdx];
      turnLogs.push({
        id: crypto.randomUUID(),
        type: 'swap',
        text: `AI Gym Leader sent out ${aPokemon.name}!`,
        timestamp: Date.now(),
      });

      // Show state update first
      set((state) => ({
        battle: {
          ...state.battle,
          playerTeam: pTeam,
          aiTeam: aTeam,
          playerActiveIdx: pIdx,
          aiActiveIdx: aIdx,
          logs: [...state.battle.logs, ...turnLogs],
          turnNumber: state.battle.turnNumber + 1,
          turnOwner: 'player',
        },
      }));
      return;
    }

    // 3. Resolve AI Turn using Gemini Agent Websocket Method
    if (callRpc) {
      try {
        const aiResponse = await callRpc('pokemon.ai.select_move', {
          playerActive: {
            name: pPokemon.name,
            hp: pPokemon.hp,
            maxHp: pPokemon.maxHp,
            types: pPokemon.types,
          },
          aiActive: {
            name: aPokemon.name,
            hp: aPokemon.hp,
            maxHp: aPokemon.maxHp,
            types: aPokemon.types,
            moves: aPokemon.moves,
          },
          aiTeam: aTeam.map((p) => p.name),
          weather: battle.weather,
          terrain: battle.terrain,
          battleLog: [...battle.logs, ...turnLogs].map((l) => l.text),
          difficulty: battle.difficulty,
        });

        if (aiResponse?.moveName) {
          const aiMove = aPokemon.moves.find((m) => m.name === aiResponse.moveName)!;
          const aiCalc = calculateDamage(
            aPokemon,
            pPokemon,
            aiMove,
            battle.weather,
            battle.terrain
          );
          pPokemon.hp = Math.max(0, (pPokemon.hp || 0) - aiCalc.damage);

          turnLogs.push({
            id: crypto.randomUUID(),
            type: 'commentary',
            text: `🎙️ AI Coach: "${aiResponse.commentary}"`,
            timestamp: Date.now(),
          });

          turnLogs.push({
            id: crypto.randomUUID(),
            type: 'attack',
            text: `AI's ${aPokemon.name} used ${aiMove.name}! It dealt ${aiCalc.damage} damage to ${pPokemon.name}!`,
            timestamp: Date.now(),
            breakdown: aiCalc.breakdown,
          });

          if (pPokemon.hp === 0) {
            turnLogs.push({
              id: crypto.randomUUID(),
              type: 'defeat',
              text: `Your ${pPokemon.name} fainted!`,
              timestamp: Date.now(),
            });
          }
        }
      } catch (err) {
        console.error('Gemini AI move selection failed, falling back:', err);
        // Fallback random attack
        const randomMove = aPokemon.moves[Math.floor(Math.random() * aPokemon.moves.length)];
        const aiCalc = calculateDamage(
          aPokemon,
          pPokemon,
          randomMove,
          battle.weather,
          battle.terrain
        );
        pPokemon.hp = Math.max(0, (pPokemon.hp || 0) - aiCalc.damage);
        turnLogs.push({
          id: crypto.randomUUID(),
          type: 'attack',
          text: `AI's ${aPokemon.name} used ${randomMove.name} in a panic! It dealt ${aiCalc.damage} damage to ${pPokemon.name}!`,
          timestamp: Date.now(),
          breakdown: aiCalc.breakdown,
        });

        if (pPokemon.hp === 0) {
          turnLogs.push({
            id: crypto.randomUUID(),
            type: 'defeat',
            text: `Your ${pPokemon.name} fainted!`,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Check if player is defeated
    const playerDefeated = pTeam.every((p) => p.hp === 0);
    if (playerDefeated) {
      const finalLog: BattleLogEntry = {
        id: crypto.randomUUID(),
        type: 'system',
        text: `💀 DEFEAT! All your Pokémon have fainted.`,
        timestamp: Date.now(),
      };

      set((state) => ({
        battle: {
          ...state.battle,
          playerTeam: pTeam,
          aiTeam: aTeam,
          playerActiveIdx: pIdx,
          aiActiveIdx: aIdx,
          logs: [...state.battle.logs, ...turnLogs, finalLog],
          status: 'lost',
          turnOwner: 'player',
        },
      }));

      // Update Profile stats
      const { profile } = get();
      if (profile) {
        const updatedProfile = {
          ...profile,
          stats: {
            ...profile.stats,
            battlesTotal: profile.stats.battlesTotal + 1,
            battlesLost: profile.stats.battlesLost + 1,
            currentStreak: 0,
          },
        };
        void get().saveProfile(updatedProfile);
        get().unlockAchievement('p1'); // First Encounter
      }
      return;
    }

    // Handle Player Active Switch if fainted
    if (pPokemon.hp === 0) {
      const nextIdx = pTeam.findIndex((p) => p.hp! > 0);
      pIdx = nextIdx;
      pPokemon = pTeam[pIdx];
      turnLogs.push({
        id: crypto.randomUUID(),
        type: 'swap',
        text: `Trainer sent out ${pPokemon.name}!`,
        timestamp: Date.now(),
      });
    }

    // Update Weather & Terrain turns
    let currentWeather = battle.weather;
    let weatherTurns = battle.weatherTurns;
    if (currentWeather !== 'None') {
      weatherTurns -= 1;
      if (weatherTurns === 0) {
        currentWeather = 'None';
        turnLogs.push({
          id: crypto.randomUUID(),
          type: 'weather',
          text: 'The weather condition returned to normal.',
          timestamp: Date.now(),
        });
      }
    }

    let currentTerrain = battle.terrain;
    let terrainTurns = battle.terrainTurns;
    if (currentTerrain !== 'None') {
      terrainTurns -= 1;
      if (terrainTurns === 0) {
        currentTerrain = 'None';
        turnLogs.push({
          id: crypto.randomUUID(),
          type: 'terrain',
          text: 'The terrain returned to normal.',
          timestamp: Date.now(),
        });
      }
    }

    set((state) => ({
      battle: {
        ...state.battle,
        playerTeam: pTeam,
        aiTeam: aTeam,
        playerActiveIdx: pIdx,
        aiActiveIdx: aIdx,
        logs: [...state.battle.logs, ...turnLogs],
        weather: currentWeather,
        weatherTurns,
        terrain: currentTerrain,
        terrainTurns,
        turnNumber: state.battle.turnNumber + 1,
        turnOwner: 'player',
      },
    }));
  },

  resetBattle: () => set({ battle: INITIAL_BATTLE }),

  // Leaderboard
  leaderboard: [],
  loadLeaderboard: async () => {
    const { callRpc } = get();
    if (!callRpc) return;
    try {
      const res = await callRpc('pokemon.leaderboard.get', {});
      if (res?.scores) {
        set({ leaderboard: res.scores });
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  },

  submitLeaderboardScore: async (score, turns, hpLeft) => {
    const { callRpc, nickname, battle } = get();
    if (!callRpc) return;
    try {
      await callRpc('pokemon.leaderboard.submit', {
        player_name: nickname,
        score,
        turns_taken: turns,
        remaining_hp: hpLeft,
        difficulty: battle.difficulty,
      });
      void get().loadLeaderboard();
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
  },

  // Themes
  theme: 'Classic',
  setTheme: (theme) => set({ theme }),
}));
