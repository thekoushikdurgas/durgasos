'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { getAiWebSocketGatewayUrl } from '@/lib/backend-url';
import {
  BIKES_REGISTRY,
  CAMERA_HEIGHT,
  createSeededRandom,
  FPS,
  generateHmac,
  INITIAL_MONEY,
  ROAD_WIDTH,
  SEGMENT_LENGTH,
  STEP,
  TRACK_LENGTH_SEGMENTS,
  TRACKS,
  type RoadRashTab,
} from '@/lib/roadrash-constants';
import { ROADRASH_RPC } from '@/lib/roadrash-ws-service';
import {
  ENGINE_PROFILES,
  QUALITY_TIERS,
  WEATHER_CYCLE,
  LOOKAHEAD_SEGMENTS,
  pickArchetype,
  overlap1d,
  isWetWeather,
  isLowVisibility,
  getSeasonWeek,
  createGameLoopRng,
  type WeatherType,
  type NpcArchetype,
} from '@/lib/roadrash-engine';
import { drawRoadRashSkyscape } from '@/lib/roadrash-sky-render';

/** Module-level wrappers so impure time calls are not flagged inside component bodies. */
function getTrafficSpawnSeed(): number {
  return Date.now();
}

function getAnimationFrameStartTime(): number {
  return performance.now();
}

export function useRoadRashGameCore() {
  const [activeTab, setActiveTab] = useState<RoadRashTab>('menu');
  const [raceCountdown, setRaceCountdown] = useState<number | null>(null);
  const [fixedQualityTier, setFixedQualityTier] = useState<number | null>(null);
  const [profile, setProfile] = useState<{
    player_name: string;
    money: number;
    current_bike: string;
    unlocked_bikes: string[];
    unlocked_tracks: string[];
    save_data: Record<string, unknown>;
    elo_score?: number;
  }>({
    player_name: 'Rider',
    money: INITIAL_MONEY,
    current_bike: 'Diablo',
    unlocked_bikes: ['Diablo'],
    unlocked_tracks: ['mumbai'],
    save_data: {},
  });

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<any[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<any[]>([]);
  const [personalBest, setPersonalBest] = useState<any[]>([]);
  const [leaderboardView, setLeaderboardView] = useState<'global' | 'season' | 'friends'>('global');
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingFriends, setPendingFriends] = useState<any[]>([]);
  const [friendSearchName, setFriendSearchName] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<string>('mumbai');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [lowEndMode, setLowEndMode] = useState<boolean>(false);
  const [qualityTier, setQualityTier] = useState<number>(2);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isTouchDevice] = useState(() => typeof window !== 'undefined' && 'ontouchstart' in window);
  const [matchNeedsReady, setMatchNeedsReady] = useState(false);

  // Multiplayer Matchmaking State
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [matchLobbyId, setMatchLobbyId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentBike, setOpponentBike] = useState<string | null>(null);
  const [opponentConnectionId, setOpponentConnectionId] = useState<string | null>(null);

  // Gameplay state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<{
    time: number;
    reward: number;
    rank: number;
    cheated: boolean;
    medal?: string | null;
  } | null>(null);
  const [activeGamepad, setActiveGamepad] = useState<string | null>(null);

  // HUD display state (mirrors gameLoopState values for React rendering without accessing refs in JSX)
  const [hudSpeed, setHudSpeed] = useState(0);
  const [hudHealth, setHudHealth] = useState(100);
  const [hudTimer, setHudTimer] = useState(0);
  const [hudRank, setHudRank] = useState(1);
  const [hudProgress, setHudProgress] = useState(0);

  // Refs for the loop and elements
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  const replaySamplesRef = useRef<number[]>([]);
  const gameLoopRng = useRef(createGameLoopRng());
  /** Sync playing flag for rAF loop (avoids stale React state closure in frame). */
  const isPlayingRef = useRef(false);
  const wsAuthenticatedRef = useRef(false);
  const runGameLoopRef = useRef<(() => void) | null>(null);
  const frameLoopStartedRef = useRef(false);
  const keysPressed = useRef<Record<string, boolean>>({});
  const localConnectionId = useRef<string | null>(null);

  // Dynamic game parameters ref (keeps track values synchronized to animation frame loop without re-triggering useEffect)
  const gameLoopState = useRef({
    position: 0,
    speed: 0,
    playerX: 0,
    playerY: 0,
    playerZ: 0,
    keyLeft: false,
    keyRight: false,
    keyFaster: false,
    keySlower: false,
    keyAttackLeft: false,
    keyAttackRight: false,
    health: 100,
    damage: 0,
    raceTimer: 0,
    finished: false,
    trackProgress: 0,
    opponentZ: 0,
    opponentX: 0,
    opponentSpeed: 0,
    opponentAction: '',
    opponentActive: false,
    traffic: [] as any[],
    enemies: [] as any[],
    roadSegments: [] as any[],
    weather: 'sunny' as WeatherType,
    nextWeather: 'sunny' as WeatherType,
    weatherBlend: 1,
    weatherTimer: 0,
    lightningFlash: 0,
    thunderSpeedCapUntil: 0,
    hornPressed: false,
    avgPlayerSpeed: 0,
    currentTrackId: 'mumbai',
    assetsLoaded: false,
  });

  // Cached timestamp from game loop frame (avoids calling performance.now() during render)
  const frameTimestamp = useRef(0);

  // Pre-computed rain drop positions (avoids Math.random() during render)
  const rainDropsRef = useRef<Array<{ rx: number; ry: number }>>([]);

  // Assets refs
  const backgroundImg = useRef<HTMLImageElement | null>(null);
  const spritesheetImg = useRef<HTMLImageElement | null>(null);

  // Forward refs for game loop fns (defined later; avoids forward-declaration lint errors)
  const startGameRef = useRef<(trackId: string, isMultiplayerMode?: boolean) => void>(() => {});
  const updateGamePhysicsRef = useRef<(dt: number, maxSpd: number, isMultiplayer: boolean) => void>(
    () => {}
  );
  const renderCanvasRef = useRef<(drawDistance: number) => void>(() => {});
  const calculateRankPlaceRef = useRef<(isMultiplayer: boolean) => number>(() => 1);

  // WS Notification Dispatcher
  const handleServerNotification = useCallback(
    (result: any) => {
      if (result.type === 'connected') {
        localConnectionId.current = result.connection_id;
        wsAuthenticatedRef.current = true;
        setIsConnected(true);
      } else if (result.type === 'roadrash.matchmaking.matched') {
        setMatchStatus('matched');
        setMatchLobbyId(result.lobby_id);
        setOpponentName(result.opponent.player_name);
        setOpponentBike(result.opponent.bike);
        setOpponentConnectionId(result.opponent_connection_id);
        setMatchNeedsReady(result.needs_ready !== false);
        gameLoopState.current.opponentActive = true;
        if (!result.needs_ready) {
          startGameRef.current(selectedTrack, true);
        }
      } else if (result.type === 'roadrash.matchmaking.start') {
        setMatchNeedsReady(false);
        startGameRef.current(result.track || selectedTrack, true);
      } else if (result.type === 'roadrash.friends.challenge') {
        setActiveTab('multiplayer');
        setSelectedTrack(result.track_name || 'mumbai');
      } else if (result.type === 'roadrash.game.opponent_sync') {
        gameLoopState.current.opponentZ = result.position;
        gameLoopState.current.opponentX = result.offset;
        gameLoopState.current.opponentSpeed = result.speed;
        gameLoopState.current.opponentAction = result.action;
      }
    },
    [selectedTrack]
  );

  // Connect to backend WebSocket Gateway
  const connectWebSocket = useCallback(() => {
    try {
      const token = readStoredAuthTokens()?.access ?? null;
      const url = getAiWebSocketGatewayUrl({ accessToken: token });
      const ws = new WebSocket(url);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 'auth-conn',
            method: 'auth.connect',
            params: { token },
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.result) {
            handleServerNotification(data.result);
          }
        } catch (e) {
          console.error('WS Parse Error', e);
        }
      };

      ws.onclose = () => {
        wsAuthenticatedRef.current = false;
        setIsConnected(false);
        setMatchStatus('idle');
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('WS Connect Error', e);
    }
  }, [handleServerNotification]);

  // Execute WebSocket Calls
  const callRpc = useCallback((method: string, params: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject('WebSocket not open');
        return;
      }
      const requestId = crypto.randomUUID();
      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.id === requestId) {
            wsRef.current?.removeEventListener('message', handler);
            if (data.error) {
              reject(data.error);
            } else {
              resolve(data.result);
            }
          }
        } catch (e) {
          /* parse error */
        }
      };
      wsRef.current.addEventListener('message', handler);
      wsRef.current.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: requestId,
          method,
          params,
        })
      );
    });
  }, []);

  const waitForWsReady = async (timeoutMs = 15000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN && wsAuthenticatedRef.current) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('WebSocket not ready');
  };

  // Fetch Profile & Leaderboards
  const loadUserData = useCallback(async () => {
    try {
      await waitForWsReady();
    } catch {
      return;
    }
    try {
      const prof = await callRpc('roadrash.profile.get', {});
      if (prof) setProfile(prof);
    } catch (e) {
      console.warn('Could not retrieve cloud save, using local fallback.', e);
    }

    try {
      const leader = await callRpc('roadrash.leaderboard.get', { track_name: selectedTrack });
      if (leader?.scores) setLeaderboard(leader.scores);
    } catch (e) {
      console.error('Error loading leaderboards', e);
    }

    try {
      const season = await callRpc('roadrash.leaderboard.season', {
        track_name: selectedTrack,
        season_week: getSeasonWeek(),
      });
      if (season?.scores) setSeasonLeaderboard(season.scores);
    } catch (e) {
      console.warn('Season leaderboard unavailable', e);
    }

    try {
      const pb = await callRpc('roadrash.leaderboard.personal_best', {
        track_name: selectedTrack,
      });
      if (pb?.scores) setPersonalBest(pb.scores);
    } catch (e) {
      console.warn('Personal best unavailable', e);
    }

    try {
      const fl = await callRpc('roadrash.friends.list', { track_name: selectedTrack });
      if (fl?.friends) setFriends(fl.friends);
      if (fl?.pending) setPendingFriends(fl.pending);
    } catch (e) {
      console.warn('Friends list unavailable', e);
    }

    try {
      const flb = await callRpc('roadrash.leaderboard.friends', { track_name: selectedTrack });
      if (flb?.scores) setFriendsLeaderboard(flb.scores);
    } catch (e) {
      console.warn('Friends leaderboard unavailable', e);
    }
  }, [callRpc, selectedTrack]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsAuthenticatedRef.current = false;
      setIsConnected(false);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
    };
    // Mount-only: reconnecting on every handler change would churn WS during HMR
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isConnected) {
      queueMicrotask(() => {
        loadUserData();
      });
    }
  }, [isConnected, loadUserData]);

  // Start rAF loop after gameplay canvas mounts (isPlaying flips true).
  useEffect(() => {
    if (!isPlaying || !runGameLoopRef.current || raceCountdown !== null) return;
    if (frameLoopStartedRef.current) {
      runGameLoopRef.current = null;
      return;
    }
    const boot = runGameLoopRef.current;
    runGameLoopRef.current = null;
    if (!canvasRef.current) {
      runGameLoopRef.current = boot;
      return;
    }
    boot();
    // Re-run when countdown finishes (runGameLoopRef is assigned after 3-2-1, not when isPlaying first flips)
  }, [isPlaying, raceCountdown]);

  // Load Game Assets (Canvas Images)
  useEffect(() => {
    const bg = new Image();
    bg.src = '/assets/roadrash/images/background.png';
    const spr = new Image();
    spr.src = '/assets/roadrash/images/sprites.png';

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        gameLoopState.current.assetsLoaded = true;
      }
    };
    bg.onload = checkLoaded;
    spr.onload = checkLoaded;

    backgroundImg.current = bg;
    spritesheetImg.current = spr;
  }, []);

  // Gamepad Detection Loop
  useEffect(() => {
    let animationId: number;
    const pollGamepads = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let foundGamepad = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          foundGamepad = gamepads[i];
          break;
        }
      }
      if (foundGamepad) {
        setActiveGamepad(foundGamepad.id);
        // Map controller keys to physical game loop keys
        const buttons = foundGamepad.buttons;
        const axes = foundGamepad.axes;

        // Steering (Left Analog Stick or D-pad)
        keysPressed.current['LeftArrow'] = axes[0] < -0.3 || buttons[14]?.pressed;
        keysPressed.current['RightArrow'] = axes[0] > 0.3 || buttons[15]?.pressed;

        // Speed triggers (X/A button or Right Trigger)
        keysPressed.current['UpArrow'] = buttons[0]?.pressed || buttons[7]?.pressed; // A button / RT
        keysPressed.current['DownArrow'] = buttons[1]?.pressed || buttons[6]?.pressed; // B button / LT

        // Attacks (Square/X button -> punch, Triangle/Y button -> kick)
        keysPressed.current['KeyZ'] = buttons[2]?.pressed; // X / Square
        keysPressed.current['KeyC'] = buttons[3]?.pressed; // Y / Triangle
      } else {
        setActiveGamepad(null);
      }
      animationId = requestAnimationFrame(pollGamepads);
    };
    pollGamepads();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // --- AUDIO SYNTH ENGINE ---
  const initEngineSound = (bikeName: string = profile.current_bike) => {
    if (isMuted) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const profileDef = ENGINE_PROFILES[bikeName] || ENGINE_PROFILES.Diablo;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = profileDef.type;
      osc.frequency.setValueAtTime(profileDef.baseFreq, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      const bufferSize = 4096;
      const pinkBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = pinkBuffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        data[i] = (b0 + b1 + b2) / 3;
      }
      const ambientSrc = ctx.createBufferSource();
      ambientSrc.buffer = pinkBuffer;
      ambientSrc.loop = true;
      const ambientGain = ctx.createGain();
      ambientGain.gain.setValueAtTime(0.015, ctx.currentTime);
      ambientSrc.connect(ambientGain);
      ambientGain.connect(ctx.destination);
      ambientSrc.start();

      const rainBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const rainData = rainBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) rainData[i] = Math.random() * 2 - 1;
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = rainBuffer;
      rainSrc.loop = true;
      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0, ctx.currentTime);
      rainSrc.connect(rainGain);
      rainGain.connect(ctx.destination);
      rainSrc.start();

      audioContextRef.current = ctx;
      engineOscRef.current = osc;
      engineGainRef.current = gain;
      ambientGainRef.current = ambientGain;
      rainGainRef.current = rainGain;
    } catch (e) {
      console.warn('Failed to init audio engine', e);
    }
  };

  const updateEngineSound = (speedPercent: number) => {
    if (isMuted || !engineOscRef.current || !audioContextRef.current) return;
    const profileDef = ENGINE_PROFILES[profile.current_bike] || ENGINE_PROFILES.Diablo;
    const newFreq = profileDef.baseFreq + (profileDef.maxFreq - profileDef.baseFreq) * speedPercent;
    engineOscRef.current.frequency.setValueAtTime(newFreq, audioContextRef.current.currentTime);
    if (ambientGainRef.current) {
      const ambientVol = 0.02 * (1 - speedPercent * 0.7);
      ambientGainRef.current.gain.setValueAtTime(ambientVol, audioContextRef.current.currentTime);
    }
    const w = gameLoopState.current.weather;
    if (rainGainRef.current) {
      const rainVol = isWetWeather(w) ? 0.012 : 0;
      rainGainRef.current.gain.setValueAtTime(rainVol, audioContextRef.current.currentTime);
    }
  };

  const playThunderBurst = () => {
    if (isMuted || !audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = buffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch (e) {}
  };

  const stopEngineSound = () => {
    try {
      engineOscRef.current?.stop();
      engineOscRef.current?.disconnect();
      engineGainRef.current?.disconnect();
      ambientGainRef.current?.disconnect();
      rainGainRef.current?.disconnect();
    } catch (e) {}
    engineOscRef.current = null;
    engineGainRef.current = null;
    ambientGainRef.current = null;
    rainGainRef.current = null;
  };

  const playFx = (type: 'crash' | 'kick') => {
    if (isMuted) return;
    try {
      const audio = new Audio(
        `/assets/roadrash/music/${type === 'crash' ? 'bike_crash' : 'kick'}.mp3`
      );
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Controller vibration trigger
  const triggerControllerVibration = (intensity: number, duration: number) => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp && gp.vibrationActuator) {
        gp.vibrationActuator
          .playEffect('dual-rumble', {
            startDelay: 0,
            duration: duration,
            weakMagnitude: intensity,
            strongMagnitude: intensity,
          })
          .catch(() => {});
      }
    }
  };

  // --- GARAGE & STORE BUSINESS LOGIC ---
  const buyBike = async (bikeName: string) => {
    const bike = BIKES_REGISTRY[bikeName];
    if (profile.money < bike.price) return;
    if (profile.unlocked_bikes.includes(bikeName)) {
      // Just select the bike
      const updated = { ...profile, current_bike: bikeName };
      setProfile(updated);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        await callRpc('roadrash.profile.save', updated);
      }
      return;
    }

    const updated = {
      ...profile,
      money: profile.money - bike.price,
      unlocked_bikes: [...profile.unlocked_bikes, bikeName],
      current_bike: bikeName,
    };
    setProfile(updated);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      await callRpc('roadrash.profile.save', updated);
    }
  };

  // --- MULTIPLAYER MATCHMAKING QUEUE ---
  const joinMatchmaker = async () => {
    if (matchStatus !== 'idle') {
      setMatchStatus('idle');
      return;
    }
    setMatchStatus('searching');
    try {
      await callRpc('roadrash.matchmaking.join', {
        player_name: profile.player_name,
        bike: profile.current_bike,
        track: selectedTrack,
        elo_score: profile.elo_score ?? 1000,
      });
    } catch (e) {
      console.error(e);
      setMatchStatus('idle');
    }
  };

  const confirmMatchReady = async () => {
    if (!matchLobbyId) return;
    try {
      await callRpc('roadrash.matchmaking.ready', { lobby_id: matchLobbyId });
    } catch (e) {
      console.error('Ready check failed', e);
    }
  };

  const addFriend = async () => {
    if (!friendSearchName.trim()) return;
    try {
      await callRpc('roadrash.friends.add', { player_name: friendSearchName.trim() });
      setFriendSearchName('');
      loadUserData();
    } catch (e) {
      console.error(e);
    }
  };

  const acceptFriend = async (requestId: string) => {
    try {
      await callRpc('roadrash.friends.accept', { request_id: requestId });
      loadUserData();
    } catch (e) {
      console.error(e);
    }
  };

  const challengeFriend = async (friendId: string) => {
    try {
      await callRpc('roadrash.friends.challenge', {
        friend_id: friendId,
        track_name: selectedTrack,
      });
      setActiveTab('multiplayer');
      joinMatchmaker();
    } catch (e) {
      console.error(e);
    }
  };

  // --- PSEUDO-3D MATH AND GEN ---
  const addRoadSegment = (curve: number, hillY: number, index: number) => {
    const isDark = Math.floor(index / 3) % 2 === 0;
    gameLoopState.current.roadSegments.push({
      index,
      p1: {
        world: {
          y: index === 0 ? 0 : gameLoopState.current.roadSegments[index - 1].p2.world.y,
          z: index * SEGMENT_LENGTH,
        },
        camera: { x: 0, y: 0, z: 0 },
        screen: { x: 0, y: 0, w: 0 },
      },
      p2: {
        world: { y: hillY, z: (index + 1) * SEGMENT_LENGTH },
        camera: { x: 0, y: 0, z: 0 },
        screen: { x: 0, y: 0, w: 0 },
      },
      curve,
      color: isDark
        ? { road: '#3d3d42', rumble: '#f59e0b', grass: '#14532d', lane: '#e2e8f0' }
        : { road: '#4a4a52', rumble: '#ffffff', grass: '#166534', lane: '' },
      sprites: [] as any[],
    });
  };

  const buildTrack = (trackId: string) => {
    gameLoopState.current.roadSegments = [];
    let currentY = 0;
    // Use a seeded PRNG for deterministic scenery (avoids Math.random during render)
    const seeded = createSeededRandom(trackId.length * 31337);

    for (let i = 0; i < TRACK_LENGTH_SEGMENTS; i++) {
      let curve = 0;
      let hill = 0;

      if (trackId === 'delhi') {
        // Delhi CP has continuous circular curves
        curve = Math.sin(i / 10) * 1.5;
        hill = 0; // Delhi CP is flat
      } else if (trackId === 'goa') {
        // Goa has steep hills and curves
        curve = Math.cos(i / 15) * 2;
        hill = Math.sin(i / 8) * 80;
      } else {
        // Mumbai Marine Drive is straight with light turns
        curve = i > 100 && i < 200 ? 0.8 : i > 400 && i < 550 ? -1.2 : 0;
        hill = i > 300 && i < 400 ? 30 : 0;
      }

      currentY += hill;
      addRoadSegment(curve, currentY, i);

      // Add roadside scenery (billboards, street food tapris, cows, trees)
      if (i > 30 && i % 8 === 0) {
        const side = seeded() > 0.5 ? 1 : -1;
        const type = seeded();
        if (type < 0.2) {
          // Cows on road
          gameLoopState.current.roadSegments[i].sprites.push({ type: 'cow', offset: side * 1.2 });
        } else if (type < 0.5) {
          // Rickshaw parked
          gameLoopState.current.roadSegments[i].sprites.push({
            type: 'rickshaw',
            offset: side * 1.5,
          });
        } else if (type < 0.8) {
          // Billboard
          const ads = [
            'Tata Motors',
            'Amul Butter',
            'Royal Enfield',
            'Bisleri',
            'Incredible India',
          ];
          gameLoopState.current.roadSegments[i].sprites.push({
            type: 'billboard',
            offset: side * 2.0,
            ad: ads[Math.floor(seeded() * ads.length)],
          });
        } else {
          // Pothole obstacle on road
          gameLoopState.current.roadSegments[i].sprites.push({
            type: 'pothole',
            offset: (seeded() - 0.5) * 1.4,
          });
        }
      }
    }
  };

  const projectSegment = (
    p: any,
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    cameraDepth: number,
    width: number,
    height: number
  ) => {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;

    if (p.camera.z <= 0) return;

    p.screen.scale = cameraDepth / p.camera.z;
    p.screen.x = Math.round(width / 2 + (p.screen.scale * p.camera.x * width) / 2);
    p.screen.y = Math.round(height / 2 - (p.screen.scale * p.camera.y * height) / 2);
    p.screen.w = Math.round((p.screen.scale * ROAD_WIDTH * width) / 2);
  };

  // Draw custom vector models for Indian street environment items (cows, rickshaws, potholes, billboards)
  const drawVectorObject = (
    ctx: CanvasRenderingContext2D,
    type: string,
    x: number,
    y: number,
    w: number,
    h: number,
    adText?: string
  ) => {
    ctx.save();
    if (type === 'cow') {
      // Body
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(x - w / 2, y - h * 0.7, w * 0.8, h * 0.5);
      // Legs
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(x - w / 2 + 5, y - h * 0.2, 8, h * 0.2);
      ctx.fillRect(x + w / 2 - 13, y - h * 0.2, 8, h * 0.2);
      // Spots
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(x - w / 3, y - h * 0.5, w * 0.1, 0, Math.PI * 2);
      ctx.arc(x + w / 6, y - h * 0.5, w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(x + w / 4, y - h * 0.9, w * 0.25, h * 0.35);
      // Horns
      ctx.fillStyle = '#374151';
      ctx.fillRect(x + w / 4 + 5, y - h * 1.05, 3, 10);
      ctx.fillRect(x + w / 4 + 12, y - h * 1.05, 3, 10);
    } else if (type === 'rickshaw') {
      // Yellow top hood
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x - w / 2, y - h, w, h * 0.5);
      // Green bottom body
      ctx.fillStyle = '#15803d';
      ctx.fillRect(x - w / 2, y - h * 0.5, w, h * 0.4);
      // Wheels
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(x - w / 2 + 5, y - h * 0.1, 10, h * 0.1);
      ctx.fillRect(x + w / 2 - 15, y - h * 0.1, 10, h * 0.1);
    } else if (type === 'pothole') {
      // Pothole on road
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.6, h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Puddle reflection
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(x - 2, y, w * 0.3, h * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'billboard') {
      // Pole
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(x - 5, y - h, 10, h);

      // Try to render via HTML-in-Canvas drawElementImage API
      let htmlDrawn = false;
      const drawContext = ctx as CanvasRenderingContext2D & {
        drawElementImage?: (
          element: HTMLElement,
          x: number,
          y: number,
          w: number,
          h: number
        ) => any;
      };

      if (typeof document !== 'undefined' && typeof drawContext.drawElementImage === 'function') {
        const textKey = (adText || '').toLowerCase();
        let elementId = 'ad-amul'; // default fallback
        if (textKey.includes('tata')) elementId = 'ad-tata';
        else if (textKey.includes('amul')) elementId = 'ad-amul';
        else if (textKey.includes('royal')) elementId = 'ad-royal';
        else if (textKey.includes('bisleri')) elementId = 'ad-bisleri';

        const domElement = document.getElementById(elementId);
        if (domElement) {
          try {
            const transform = drawContext.drawElementImage(
              domElement,
              x - w / 2,
              y - h,
              w,
              h * 0.5
            );
            if (transform && typeof domElement.style !== 'undefined') {
              domElement.style.transform = transform.toString();
            }
            htmlDrawn = true;
          } catch (e) {
            // Silently fall back to standard drawing
          }
        }
      }

      if (!htmlDrawn) {
        // Signboard board (Fallback Vector Graphic)
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 3;
        ctx.fillRect(x - w / 2, y - h, w, h * 0.5);
        ctx.strokeRect(x - w / 2, y - h, w, h * 0.5);
        // Text
        ctx.fillStyle = '#f8fafc';
        ctx.font = `bold ${Math.max(9, Math.round(h * 0.12))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        const label = (adText || 'AMUL').slice(0, 12);
        ctx.fillText(label, x, y - h * 0.72);
      }
    }
    ctx.restore();
  };

  // --- CORE GAME LOOP ---
  const startGame = (trackId: string, isMultiplayerMode: boolean = false) => {
    try {
      isPlayingRef.current = true;
      frameLoopStartedRef.current = false;
      setIsPlaying(true);
      setGameResult(null);
      setActiveTab('menu');

      // Init state
      gameLoopState.current.finished = false;
      gameLoopState.current.position = 0;
      gameLoopState.current.speed = 0;
      gameLoopState.current.playerX = 0;
      gameLoopState.current.health = 100;
      gameLoopState.current.raceTimer = 0;
      gameLoopState.current.trackProgress = 0;

      // Reset HUD state
      setHudSpeed(0);
      setHudHealth(100);
      setHudTimer(0);
      setHudRank(1);
      setHudProgress(0);

      gameLoopState.current.currentTrackId = trackId;
      if (trackId === 'delhi') {
        gameLoopState.current.weather = 'foggy';
      } else if (trackId === 'goa') {
        gameLoopState.current.weather = 'sunny';
      } else {
        gameLoopState.current.weather = 'rainy';
      }
      gameLoopState.current.nextWeather = gameLoopState.current.weather;
      gameLoopState.current.weatherBlend = 1;
      gameLoopState.current.weatherTimer = 0;
      gameLoopState.current.lightningFlash = 0;
      gameLoopState.current.thunderSpeedCapUntil = 0;
      gameLoopState.current.avgPlayerSpeed = 0;
      replaySamplesRef.current = [];

      buildTrack(trackId);
      gameLoopRng.current.reset(getTrafficSpawnSeed());
      initEngineSound(profile.current_bike);

      // Start keys handlers
      const onKeyDown = (e: KeyboardEvent) => {
        keysPressed.current[e.code] = true;
      };
      const onKeyUp = (e: KeyboardEvent) => {
        keysPressed.current[e.code] = false;
      };
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      // Spawn AI Traffic & Enemies (using seeded PRNG)
      const bikeDef = BIKES_REGISTRY[profile.current_bike];
      const maxSpd = (bikeDef.maxSpeed * 1000) / 3600; // convert to m/s
      const spawnRng = createSeededRandom(getTrafficSpawnSeed());

      gameLoopState.current.traffic = [];
      for (let i = 0; i < 25; i++) {
        const archetype = pickArchetype(spawnRng);
        const isAuto = spawnRng() > 0.6;
        gameLoopState.current.traffic.push({
          z: (10 + spawnRng() * 80) * SEGMENT_LENGTH,
          offset: (spawnRng() - 0.5) * 1.5,
          speed: maxSpd * (archetype === 'aggressive' ? 0.55 : 0.45),
          type: isAuto ? 'auto' : 'car',
          archetype,
          weavePhase: spawnRng() * Math.PI * 2,
          hornReactUntil: 0,
        });
      }

      gameLoopState.current.enemies = [];
      if (!isMultiplayerMode) {
        for (let i = 0; i < 5; i++) {
          gameLoopState.current.enemies.push({
            id: `enemy_${i}`,
            name: ['Raju', 'Vikram', 'Sunil', 'Karan', 'Bobby'][i],
            z: (15 + i * 8) * SEGMENT_LENGTH,
            offset: (spawnRng() - 0.5) * 1.2,
            speed: maxSpd * 0.8,
            health: 100,
            bike: ['Diablo', 'Pulsar 220', 'Bullet 350'][i % 3],
            archetype: pickArchetype(spawnRng),
            attackCooldown: 0,
          });
        }
      }

      let activeQuality = lowEndMode ? 0 : (fixedQualityTier ?? qualityTier);
      const applyCanvasScale = (tier: number) => {
        const q = QUALITY_TIERS[tier] ?? QUALITY_TIERS[1];
        const c = canvasRef.current;
        if (c) {
          c.width = Math.round(1024 * q.canvasScale);
          c.height = Math.round(576 * q.canvasScale);
        }
        rainDropsRef.current = Array.from({ length: q.rainDrops }, (_, idx) => ({
          rx: (idx * 0.037) % 1,
          ry: (idx * 0.053) % 1,
        }));
        return q.drawDistance;
      };
      let maxDrawDistance: number = applyCanvasScale(activeQuality);

      let lastTime = getAnimationFrameStartTime();
      let frameCounter = 0;
      let fpsWindowStart = lastTime;
      let replayFrameCounter = 0;

      let hudUpdateCounter = 0;

      const frame = async () => {
        if (!isPlayingRef.current || gameLoopState.current.finished) {
          return;
        }

        const now = performance.now();
        const dt = Math.min(1, (now - lastTime) / 1000);
        lastTime = now;

        frameTimestamp.current = now;
        frameCounter++;

        if (frameCounter % 60 === 0) {
          const elapsed = now - fpsWindowStart;
          const currentFps = elapsed > 0 ? 60000 / elapsed : 60;
          fpsWindowStart = now;
          if (!lowEndMode) {
            if (currentFps < 22 && activeQuality > 1) {
              activeQuality--;
              maxDrawDistance = applyCanvasScale(activeQuality);
            } else if (currentFps > 58 && activeQuality < 2) {
              activeQuality++;
              maxDrawDistance = applyCanvasScale(activeQuality);
            }
          }
        }

        if (isLowVisibility(gameLoopState.current.weather)) {
          maxDrawDistance = Math.floor(maxDrawDistance * 0.5);
        }

        updateGamePhysicsRef.current(dt, maxSpd, isMultiplayerMode);

        replayFrameCounter++;
        if (replayFrameCounter % 30 === 0) {
          replaySamplesRef.current.push(gameLoopState.current.position);
          if (replaySamplesRef.current.length > 120) {
            replaySamplesRef.current.shift();
          }
        }

        renderCanvasRef.current(maxDrawDistance);

        // Update HUD state at throttled rate (~10fps)
        hudUpdateCounter++;
        if (hudUpdateCounter % 6 === 0 || hudUpdateCounter === 1) {
          setHudSpeed(gameLoopState.current.speed);
          setHudHealth(gameLoopState.current.health);
          setHudTimer(gameLoopState.current.raceTimer);
          setHudRank(calculateRankPlaceRef.current(isMultiplayerMode));
          setHudProgress(gameLoopState.current.trackProgress);
        }

        // Send synchronizations in multiplayer

        if (isMultiplayerMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          let action = '';
          if (keysPressed.current['KeyZ']) action = 'punch';
          else if (keysPressed.current['KeyC']) action = 'kick';
          else if (gameLoopState.current.damage > 0) action = 'hit';

          try {
            wsRef.current.send(
              JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                method: 'roadrash.game.sync',
                params: {
                  lobby_id: matchLobbyId,
                  opponent_connection_id: opponentConnectionId,
                  position: gameLoopState.current.position,
                  offset: gameLoopState.current.playerX,
                  speed: gameLoopState.current.speed,
                  action,
                },
              })
            );
          } catch (e) {}
        }

        // Check race completion
        const trackLength = TRACK_LENGTH_SEGMENTS * SEGMENT_LENGTH;
        gameLoopState.current.trackProgress = gameLoopState.current.position / trackLength;

        if (gameLoopState.current.position >= trackLength - 2 * SEGMENT_LENGTH) {
          gameLoopState.current.finished = true;
          stopEngineSound();
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);

          // Calculate reward
          const reward = TRACKS.find((t) => t.id === trackId)?.baseReward || 500;
          const place = calculateRankPlaceRef.current(isMultiplayerMode);

          // Anti-cheat verification submit
          const userSub = localConnectionId.current || 'anonymous';
          const finalTime = gameLoopState.current.raceTimer;

          const checkHash = await generateHmac(
            `${userSub}:${trackId}:${finalTime.toFixed(2)}:${reward}`
          );

          let cheated = false;
          let medal: string | null = null;
          try {
            const res = await callRpc('roadrash.leaderboard.submit', {
              player_name: profile.player_name,
              track_name: trackId,
              race_time: finalTime,
              points: reward,
              rank: place,
              hash: checkHash,
              bike: profile.current_bike,
              replay_samples: replaySamplesRef.current,
            });
            cheated = !res.success;
            medal = res.medal ?? null;
          } catch (e) {
            console.error('Score submission check failed', e);
          }

          if (!cheated) {
            const updatedProf = {
              ...profile,
              money: profile.money + reward,
              elo_score: profile.elo_score,
            };
            setProfile(updatedProf);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              await callRpc('roadrash.profile.save', updatedProf);
            }
            loadUserData();
          }

          setGameResult({ time: finalTime, reward, rank: place, cheated, medal });
          isPlayingRef.current = false;
          setIsPlaying(false);
          setMatchStatus('idle');
          return;
        }

        requestAnimationFrame(frame);
      };

      const startFrameLoop = () => {
        if (frameLoopStartedRef.current) return;
        frameLoopStartedRef.current = true;
        maxDrawDistance = applyCanvasScale(activeQuality);
        requestAnimationFrame(frame);
      };

      setRaceCountdown(3);
      let count = 3;
      const countTick = () => {
        count -= 1;
        if (count > 0) {
          setRaceCountdown(count);
          window.setTimeout(countTick, 700);
        } else {
          runGameLoopRef.current = startFrameLoop;
          setRaceCountdown(null);
          queueMicrotask(() => {
            startFrameLoop();
          });
        }
      };
      window.setTimeout(countTick, 700);
    } catch (err) {
      console.error('startGame failed', err);
      isPlayingRef.current = false;
      frameLoopStartedRef.current = false;
      setIsPlaying(false);
      setRaceCountdown(null);
    }
  };

  const calculateRankPlace = (isMultiplayer: boolean) => {
    let place = 1;
    if (isMultiplayer) {
      if (gameLoopState.current.opponentZ > gameLoopState.current.position) {
        place = 2;
      }
    } else {
      gameLoopState.current.enemies.forEach((e) => {
        if (e.z > gameLoopState.current.position) place++;
      });
    }
    return place;
  };

  const updateNpcArchetypeBehavior = (
    archetype: NpcArchetype,
    offset: number,
    speed: number,
    maxSpd: number,
    dt: number,
    steerSpeed: number
  ): { offset: number; speed: number } => {
    let o = offset;
    let s = speed;
    const rng = gameLoopRng.current;
    if (archetype === 'erratic' && rng.next() < 0.08) {
      o += (rng.next() - 0.5) * 0.4;
    }
    if (archetype === 'aggressive') {
      s = Math.min(maxSpd * 0.6, s * 1.02);
    }
    if (archetype === 'defensive') {
      s = Math.max(maxSpd * 0.35, s * 0.98);
    }
    if (archetype === 'rule_follower') {
      if (Math.abs(o) > 0.85) o -= Math.sign(o) * steerSpeed * 0.2 * dt;
    }
    if (o < -0.9) o += 0.1;
    if (o > 0.9) o -= 0.1;
    return { offset: o, speed: s };
  };

  const reactToHorn = (npc: {
    z: number;
    offset: number;
    speed: number;
    archetype?: NpcArchetype;
  }) => {
    const dist = npc.z - gameLoopState.current.position;
    if (dist < 0 || dist > SEGMENT_LENGTH * 3) return;
    const arch = npc.archetype || 'defensive';
    if (arch === 'defensive') npc.offset -= 0.25;
    else if (arch === 'aggressive') npc.speed *= 1.08;
    else if (arch === 'erratic') npc.offset += (gameLoopRng.current.next() - 0.5) * 0.5;
  };

  const updateGamePhysics = (dt: number, maxSpd: number, isMultiplayer: boolean) => {
    const state = gameLoopState.current;
    const rng = gameLoopRng.current;
    state.raceTimer += dt;
    state.avgPlayerSpeed = state.avgPlayerSpeed * 0.95 + state.speed * 0.05;

    state.weatherTimer += dt;
    if (state.weatherTimer >= 25 && rng.next() < 0.2) {
      state.weatherTimer = 0;
      const idx = WEATHER_CYCLE.indexOf(state.weather);
      state.nextWeather = WEATHER_CYCLE[(idx + 1) % WEATHER_CYCLE.length];
      state.weatherBlend = 0;
    }
    if (state.weatherBlend < 1) {
      state.weatherBlend = Math.min(1, state.weatherBlend + dt / 5);
      if (state.weatherBlend >= 1) state.weather = state.nextWeather;
    }

    if (state.weather === 'thunderstorm' && rng.next() < dt / 10) {
      state.lightningFlash = 0.15;
      playThunderBurst();
      state.thunderSpeedCapUntil = frameTimestamp.current + 2000;
      triggerControllerVibration(0.5, 500);
    }
    if (state.lightningFlash > 0) state.lightningFlash -= dt;

    const wet = isWetWeather(state.weather);
    const steerMult = wet ? 0.8 : 1;
    const brakeMult = wet ? 1.4 : 1;

    const accelVal = maxSpd / 6;
    const dragVal = -maxSpd / 12;
    const breakVal = (-maxSpd / 2) * brakeMult;
    let speedCap = maxSpd;
    if (state.thunderSpeedCapUntil > frameTimestamp.current) speedCap = maxSpd * 0.3;
    if (state.weather === 'dust_storm') speedCap = maxSpd * 0.6;

    if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) {
      state.speed = Math.min(speedCap, state.speed + accelVal * dt);
    } else if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) {
      state.speed = Math.max(0, state.speed + breakVal * dt);
    } else {
      state.speed = Math.max(0, state.speed + dragVal * dt);
    }

    const hornNow = keysPressed.current['KeyH'];
    if (hornNow && !state.hornPressed) {
      state.traffic.forEach((t) => reactToHorn(t));
      state.enemies.forEach((e) => reactToHorn(e));
    }
    state.hornPressed = hornNow;

    const steerSpeed = 2.0 * steerMult;
    if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) {
      state.playerX -= steerSpeed * dt * (state.speed / maxSpd);
    } else if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) {
      state.playerX += steerSpeed * dt * (state.speed / maxSpd);
    }

    if (Math.abs(state.playerX) > 0.85) {
      state.traffic.forEach((t) => {
        if (Math.abs(t.z - state.position) < SEGMENT_LENGTH * 2) {
          t.offset += state.playerX > 0 ? 0.02 : -0.02;
        }
      });
    }

    const segment = findSegment(state.position);
    if (segment) {
      state.playerX -= 0.3 * dt * (state.speed / maxSpd) * segment.curve;
      segment.sprites?.forEach((spr: { type: string; offset: number }) => {
        if (spr.type === 'cow' && Math.abs(spr.offset - state.playerX) < 1.5) {
          state.traffic.forEach((t) => {
            if (Math.abs(t.z - state.position) < SEGMENT_LENGTH * 5) {
              t.speed *= 0.7;
              t.offset += spr.offset > t.offset ? -0.15 : 0.15;
            }
          });
        }
      });
    }

    if (Math.abs(state.playerX) > 1.0) {
      state.speed = Math.max(0, state.speed + breakVal * 0.5 * dt);
      triggerControllerVibration(0.15, 80);
      segment?.sprites.forEach((spr: { offset: number }) => {
        if (Math.abs(state.playerX - spr.offset) < 0.2) {
          playFx('crash');
          state.speed = 0;
          state.health = Math.max(0, state.health - 25);
          triggerControllerVibration(0.8, 400);
        }
      });
    }

    state.position += state.speed * dt * 50;
    state.playerX = Math.max(-2.0, Math.min(2.0, state.playerX));

    updateEngineSound(state.speed / maxSpd);

    if (
      wsRef.current?.readyState === WebSocket.OPEN &&
      state.raceTimer > 0 &&
      Math.floor(state.raceTimer * 2) % 10 === 0
    ) {
      try {
        wsRef.current.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            method: 'roadrash.weather.report',
            params: { weather: state.weather, track_name: state.currentTrackId },
          })
        );
      } catch (e) {}
    }

    state.traffic.forEach((t) => {
      if (t.type === 'auto') {
        t.weavePhase = (t.weavePhase || 0) + dt * Math.PI * 4;
        t.offset += Math.sin(t.weavePhase) * 0.003;
      }

      const lookaheadSteer = computeLookaheadSteer(
        t.offset,
        t.speed,
        state.playerX,
        state.speed,
        maxSpd,
        LOOKAHEAD_SEGMENTS,
        (i) => {
          const segZ = state.position + i * SEGMENT_LENGTH;
          if (Math.abs(segZ - state.position) < SEGMENT_LENGTH && state.speed > t.speed) {
            return { offset: state.playerX, speed: state.speed };
          }
          const other = state.traffic.find(
            (o) => o !== t && Math.abs(o.z - segZ) < SEGMENT_LENGTH * 0.5
          );
          return other ? { offset: other.offset, speed: other.speed } : null;
        }
      );
      t.offset += lookaheadSteer * dt * 2;

      const archResult = updateNpcArchetypeBehavior(
        t.archetype || 'defensive',
        t.offset,
        t.speed,
        maxSpd,
        dt,
        steerSpeed
      );
      t.offset = archResult.offset;
      t.speed = archResult.speed;

      if (state.weather === 'dust_storm') t.speed *= 0.98;

      t.z += t.speed * dt * 30;
      if (t.z > TRACK_LENGTH_SEGMENTS * SEGMENT_LENGTH) t.z = 0;

      if (Math.abs(t.z - state.position) < 80 && overlap1d(t.offset, 0.5, state.playerX, 0.5)) {
        playFx('crash');
        state.speed = 0;
        state.health = Math.max(0, state.health - 20);
        triggerControllerVibration(0.9, 450);
      }
    });

    if (!isMultiplayer) {
      state.enemies.forEach((e) => {
        const arch: NpcArchetype = e.archetype || 'aggressive';
        if (e.z < state.position - 400) {
          e.speed = state.avgPlayerSpeed * 1.1 || maxSpd * 1.05;
        } else if (e.z > state.position + 400) {
          e.speed = maxSpd * 0.75;
        } else {
          e.speed = (state.avgPlayerSpeed || maxSpd * 0.85) * (arch === 'aggressive' ? 1.05 : 0.9);
          const steer = computeLookaheadSteer(
            e.offset,
            e.speed,
            state.playerX,
            state.speed,
            maxSpd,
            LOOKAHEAD_SEGMENTS,
            (i) => {
              const segZ = state.position + i * SEGMENT_LENGTH;
              if (Math.abs(segZ - state.position) < SEGMENT_LENGTH) {
                return { offset: state.playerX, speed: state.speed };
              }
              return null;
            }
          );
          e.offset += steer * dt * 2;
          if (e.offset < state.playerX) e.offset += steerSpeed * 0.2 * dt;
          else e.offset -= steerSpeed * 0.2 * dt;

          if (Math.abs(e.z - state.position) < 40 && overlap1d(e.offset, 0.5, state.playerX, 0.5)) {
            if (keysPressed.current['KeyZ'] || keysPressed.current['KeyC']) {
              playFx('kick');
              e.health -= 35;
              if (e.health <= 0) {
                playFx('crash');
                e.z -= 400;
                e.health = 100;
              }
            } else if (arch === 'aggressive' && e.attackCooldown <= 0 && rng.next() < 0.05) {
              playFx('kick');
              state.health = Math.max(0, state.health - 15);
              e.attackCooldown = 2;
              triggerControllerVibration(0.6, 200);
            }
          }
        }
        if (e.attackCooldown > 0) e.attackCooldown -= dt;
        if (state.weather === 'heatwave' && arch === 'aggressive') e.speed *= 1.02;
        e.z += e.speed * dt * 50;
      });
    } else if (
      Math.abs(state.opponentZ - state.position) < 40 &&
      overlap1d(state.opponentX, 0.5, state.playerX, 0.5)
    ) {
      if (state.opponentAction === 'punch' || state.opponentAction === 'kick') {
        playFx('kick');
        state.health = Math.max(0, state.health - 20);
        triggerControllerVibration(0.7, 250);
      }
    }
  };

  function computeLookaheadSteer(
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

  const findSegment = (z: number) => {
    const idx = Math.floor(z / SEGMENT_LENGTH);
    return gameLoopState.current.roadSegments[idx % gameLoopState.current.roadSegments.length];
  };

  // --- RENDER GAME SCENE ON CANVAS ---
  const renderCanvas = (drawDistance: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Get segments
    const baseSegment = findSegment(gameLoopState.current.position);
    if (!baseSegment) return;

    const cameraDepth = 1 / Math.tan(((100 / 2) * Math.PI) / 180);
    const playerZ = CAMERA_HEIGHT * cameraDepth;
    const skyLine = Math.floor(height * 0.46);

    drawRoadRashSkyscape(
      ctx,
      width,
      skyLine,
      gameLoopState.current.weather,
      gameLoopState.current.currentTrackId || 'mumbai',
      gameLoopState.current.position,
      baseSegment.curve
    );

    ctx.fillStyle = '#0c1410';
    ctx.fillRect(0, skyLine, width, height - skyLine);

    // Project road segments (match Road-Rash-master render order and culling)
    const playerPos = gameLoopState.current.position + playerZ;
    const playerSegment = findSegment(playerPos);
    const playerPercent = (playerPos % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    const playerY =
      playerSegment.p1.world.y +
      (playerSegment.p2.world.y - playerSegment.p1.world.y) * playerPercent;
    const basePercent = (gameLoopState.current.position % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    let x = 0;
    let dx = -(baseSegment.curve * basePercent);
    let maxy = height;
    const cameraY = playerY + CAMERA_HEIGHT;
    const cameraZ = gameLoopState.current.position;

    for (let i = 0; i < drawDistance; i++) {
      const segIndex = (baseSegment.index + i) % gameLoopState.current.roadSegments.length;
      const seg = gameLoopState.current.roadSegments[segIndex];
      const isLooped = seg.index < baseSegment.index;
      const loopOffset = isLooped ? TRACK_LENGTH_SEGMENTS * SEGMENT_LENGTH : 0;

      projectSegment(
        seg.p1,
        gameLoopState.current.playerX * ROAD_WIDTH - x,
        cameraY,
        cameraZ - loopOffset,
        cameraDepth,
        width,
        height
      );
      projectSegment(
        seg.p2,
        gameLoopState.current.playerX * ROAD_WIDTH - x - dx,
        cameraY,
        cameraZ - loopOffset,
        cameraDepth,
        width,
        height
      );

      x += dx;
      dx += seg.curve;

      seg.clip = maxy;

      if (seg.p1.camera.z <= 0 || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) {
        continue;
      }

      // Draw road polygon
      ctx.fillStyle = seg.color.grass;
      ctx.fillRect(0, seg.p2.screen.y, width, seg.p1.screen.y - seg.p2.screen.y);

      // Draw shoulder rumbles
      ctx.fillStyle = seg.color.rumble;
      ctx.beginPath();
      ctx.moveTo(seg.p1.screen.x - seg.p1.screen.w * 1.1, seg.p1.screen.y);
      ctx.lineTo(seg.p2.screen.x - seg.p2.screen.w * 1.1, seg.p2.screen.y);
      ctx.lineTo(seg.p2.screen.x - seg.p2.screen.w, seg.p2.screen.y);
      ctx.lineTo(seg.p1.screen.x - seg.p1.screen.w, seg.p1.screen.y);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(seg.p1.screen.x + seg.p1.screen.w * 1.1, seg.p1.screen.y);
      ctx.lineTo(seg.p2.screen.x + seg.p2.screen.w * 1.1, seg.p2.screen.y);
      ctx.lineTo(seg.p2.screen.x + seg.p2.screen.w, seg.p2.screen.y);
      ctx.lineTo(seg.p1.screen.x + seg.p1.screen.w, seg.p1.screen.y);
      ctx.fill();

      // Main asphalt road
      ctx.fillStyle = seg.color.road;
      ctx.beginPath();
      ctx.moveTo(seg.p1.screen.x - seg.p1.screen.w, seg.p1.screen.y);
      ctx.lineTo(seg.p2.screen.x - seg.p2.screen.w, seg.p2.screen.y);
      ctx.lineTo(seg.p2.screen.x + seg.p2.screen.w, seg.p2.screen.y);
      ctx.lineTo(seg.p1.screen.x + seg.p1.screen.w, seg.p1.screen.y);
      ctx.fill();

      // Lane markers
      if (seg.color.lane) {
        ctx.fillStyle = seg.color.lane;
        ctx.fillRect(seg.p1.screen.x - 2, seg.p2.screen.y, 4, seg.p1.screen.y - seg.p2.screen.y);
      }

      maxy = seg.p1.screen.y;
    }

    // Render side obstacles and scenery (reverse loop)
    for (let i = drawDistance - 1; i > 0; i--) {
      const segIndex = (baseSegment.index + i) % gameLoopState.current.roadSegments.length;
      const seg = gameLoopState.current.roadSegments[segIndex];

      const clipY = seg.clip ?? height;
      seg.sprites.forEach((spr: any) => {
        const spriteScale = seg.p1.screen.scale;
        const spriteX = seg.p1.screen.x + (spriteScale * spr.offset * ROAD_WIDTH * width) / 2;
        const spriteY = seg.p1.screen.y;
        const w = (spriteScale * 250 * width) / 2;
        const h = (spriteScale * 250 * width) / 2;
        if (spriteY - h * 0.5 > clipY) return;
        drawVectorObject(ctx, spr.type, spriteX, spriteY, w, h, spr.ad);
      });

      // Draw active traffic
      gameLoopState.current.traffic.forEach((t) => {
        if (Math.floor(t.z / SEGMENT_LENGTH) === segIndex) {
          const scale = seg.p1.screen.scale;
          const tx = seg.p1.screen.x + (scale * t.offset * ROAD_WIDTH * width) / 2;
          const ty = seg.p1.screen.y;
          const tw = (scale * 120 * width) / 2;
          const th = (scale * 80 * width) / 2;

          drawVectorObject(ctx, t.type === 'auto' ? 'rickshaw' : 'car', tx, ty, tw, th);
        }
      });

      // Draw AI Enemies
      gameLoopState.current.enemies.forEach((e) => {
        if (Math.floor(e.z / SEGMENT_LENGTH) === segIndex) {
          const scale = seg.p1.screen.scale;
          const ex = seg.p1.screen.x + (scale * e.offset * ROAD_WIDTH * width) / 2;
          const ey = seg.p1.screen.y;
          const ew = (scale * 60 * width) / 2;
          const eh = (scale * 120 * width) / 2;

          // Draw a standard biker silhouette
          ctx.fillStyle = '#b91c1c';
          ctx.fillRect(ex - ew / 2, ey - eh, ew, eh);
          ctx.fillStyle = '#fef08a'; // yellow helmet
          ctx.beginPath();
          ctx.arc(ex, ey - eh + 10, ew * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Multiplayer Opponent
      if (
        gameLoopState.current.opponentActive &&
        Math.floor(gameLoopState.current.opponentZ / SEGMENT_LENGTH) === segIndex
      ) {
        const scale = seg.p1.screen.scale;
        const ox =
          seg.p1.screen.x + (scale * gameLoopState.current.opponentX * ROAD_WIDTH * width) / 2;
        const oy = seg.p1.screen.y;
        const ow = (scale * 60 * width) / 2;
        const oh = (scale * 120 * width) / 2;

        ctx.fillStyle = '#2563eb'; // blue multiplayer bike
        ctx.fillRect(ox - ow / 2, oy - oh, ow, oh);
        ctx.fillStyle = '#f43f5e'; // pink helmet
        ctx.beginPath();
        ctx.arc(ox, oy - oh + 10, ow * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player bike — stylized silhouette (rear view)
    const bounce = Math.sin(frameTimestamp.current * 0.05) * 3;
    const playerXPixel = width / 2;
    const playerYPixel = height - 42 + bounce;
    ctx.save();
    ctx.translate(playerXPixel, playerYPixel);
    let tilt = 0;
    if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) tilt = -0.12;
    else if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) tilt = 0.12;
    ctx.rotate(tilt);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 36, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rear wheel
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Exhaust + frame
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(18, -55, 6, 42);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(-18, -95, 36, 55);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(-14, -100, 28, 18);

    // Rider torso + arms
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-14, -118, 28, 38);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-22, -108, 10, 22);
    ctx.fillRect(12, -108, 10, 22);

    // Helmet
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -128, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-10, -132, 20, 6);

    if (keysPressed.current['KeyZ']) {
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(-38, -105, 18, 12);
    } else if (keysPressed.current['KeyC']) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(18, -75, 28, 10);
    }

    ctx.restore();

    const weather = gameLoopState.current.weather;
    if (weather === 'rainy' || weather === 'thunderstorm') {
      ctx.fillStyle = 'rgba(125, 211, 252, 0.4)';
      const rainOffset = (frameTimestamp.current * 0.3) % height;
      for (let j = 0; j < rainDropsRef.current.length; j++) {
        const drop = rainDropsRef.current[j];
        ctx.fillRect(drop.rx * width, (drop.ry * height + rainOffset) % height, 2, 20);
      }
    }
    if (weather === 'foggy' || weather === 'dust_storm') {
      const smogGrad = ctx.createLinearGradient(0, 0, 0, height);
      smogGrad.addColorStop(0, 'rgba(148, 163, 184, 0.65)');
      smogGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
      ctx.fillStyle = smogGrad;
      ctx.fillRect(0, 0, width, height);
    }
    if (weather === 'heatwave') {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
      ctx.fillRect(0, 0, width, height);
    }
    if (gameLoopState.current.lightningFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${gameLoopState.current.lightningFlash * 4})`;
      ctx.fillRect(0, 0, width, height);
    }

    // WICG HTML-in-Canvas drawing & sync for HUD
    const hudContainer = document.getElementById('rr-hud-container');
    if (hudContainer && ctx.drawElementImage && ctx.canvas.hasAttribute('layoutsubtree')) {
      const transform = ctx.drawElementImage(hudContainer, 0, 0);
      hudContainer.style.transform = transform.toString();
    }
  };

  // Keep refs in sync so startGame / WS handlers always call latest implementations
  useEffect(() => {
    startGameRef.current = startGame;
    updateGamePhysicsRef.current = updateGamePhysics;
    renderCanvasRef.current = renderCanvas;
    calculateRankPlaceRef.current = calculateRankPlace;
  });

  const retreat = useCallback(() => {
    isPlayingRef.current = false;
    frameLoopStartedRef.current = false;
    runGameLoopRef.current = null;
    setIsPlaying(false);
    setRaceCountdown(null);
    stopEngineSound();
  }, []);

  const setKeyPressed = useCallback((code: string, pressed: boolean) => {
    keysPressed.current[code] = pressed;
  }, []);

  return {
    activeTab,
    setActiveTab,
    profile,
    setProfile,
    leaderboard,
    setLeaderboard,
    seasonLeaderboard,
    friendsLeaderboard,
    personalBest,
    leaderboardView,
    setLeaderboardView,
    friends,
    pendingFriends,
    friendSearchName,
    setFriendSearchName,
    selectedTrack,
    setSelectedTrack,
    isMuted,
    setIsMuted,
    lowEndMode,
    setLowEndMode,
    qualityTier,
    setQualityTier,
    fixedQualityTier,
    setFixedQualityTier,
    isConnected,
    isTouchDevice,
    matchNeedsReady,
    matchStatus,
    setMatchStatus,
    matchLobbyId,
    opponentName,
    opponentBike,
    isPlaying,
    setIsPlaying,
    gameResult,
    setGameResult,
    activeGamepad,
    hudSpeed,
    hudHealth,
    hudTimer,
    hudRank,
    hudProgress,
    raceCountdown,
    canvasRef,
    setKeyPressed,
    isPlayingRef,
    runGameLoopRef,
    startGame,
    buyBike,
    joinMatchmaker,
    confirmMatchReady,
    addFriend,
    acceptFriend,
    challengeFriend,
    loadUserData,
    retreat,
    BIKES_REGISTRY,
    TRACKS,
  };
}
