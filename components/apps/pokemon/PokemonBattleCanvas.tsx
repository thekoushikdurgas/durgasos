'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  RefreshCw,
  Flame,
  Droplet,
  Sun,
  Wind,
  CloudRain,
  Snowflake,
  ShieldAlert,
  BookOpen,
  AlertCircle,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';
import { RemoteImage } from '@/components/ui/remote-image';
import { useStore, getTypeEffectiveness } from './store';
import { Move, Pokemon } from './types';

export function PokemonBattleCanvas() {
  const [activeSubMenu, setActiveSubMenu] = useState<'move' | 'switch' | 'field' | 'none'>('none');
  const [showCalcDetailsIdx, setShowCalcDetailsIdx] = useState<number | null>(null);

  const { battle, executeTurnAction, resetBattle, theme, avatar } = useStore();

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [battle.logs]);

  const pActive = battle.playerTeam[battle.playerActiveIdx];
  const aActive = battle.aiTeam[battle.aiActiveIdx];

  if (!pActive || !aActive) return null;

  const handleSelectMove = async (move: Move) => {
    setActiveSubMenu('none');
    await executeTurnAction('move', { moveName: move.name });
  };

  const handleSelectSwitch = async (idx: number) => {
    if (idx === battle.playerActiveIdx || battle.playerTeam[idx].hp === 0) return;
    setActiveSubMenu('none');
    await executeTurnAction('switch', { switchIdx: idx });
  };

  // Helper to color HP bar based on percent
  const getHpBarColor = (hp: number, max: number) => {
    const pct = hp / max;
    if (pct > 0.5) return 'bg-emerald-500';
    if (pct > 0.2) return 'bg-amber-500';
    return 'bg-rose-500 animate-pulse';
  };

  // Styles for Weather conditions
  const getWeatherOverlay = () => {
    switch (battle.weather) {
      case 'Sunny':
        return 'absolute inset-0 bg-amber-500/10 pointer-events-none ring-2 ring-amber-500/40 ring-inset';
      case 'Rain':
        return 'absolute inset-0 bg-blue-500/10 pointer-events-none ring-2 ring-blue-500/40 ring-inset border-b border-blue-500/20';
      case 'Sandstorm':
        return 'absolute inset-0 bg-yellow-700/10 pointer-events-none ring-2 ring-yellow-600/30 ring-inset';
      case 'Hail':
        return 'absolute inset-0 bg-sky-200/10 pointer-events-none ring-2 ring-sky-300/40 ring-inset';
      default:
        return '';
    }
  };

  // Styles for Terrains
  const getTerrainOverlay = () => {
    switch (battle.terrain) {
      case 'Grassy':
        return 'border-b-4 border-green-500/50 shadow-[0_4px_20px_rgba(34,197,94,0.15)]';
      case 'Electric':
        return 'border-b-4 border-yellow-500/50 shadow-[0_4px_20px_rgba(234,179,8,0.15)]';
      case 'Psychic':
        return 'border-b-4 border-purple-500/50 shadow-[0_4px_20px_rgba(168,85,247,0.15)]';
      case 'Misty':
        return 'border-b-4 border-pink-500/50 shadow-[0_4px_20px_rgba(244,63,94,0.15)]';
      default:
        return 'border-b border-slate-800';
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between select-none">
      {/* Battle Stadium Area */}
      <div
        className={`relative flex-1 rounded-2xl overflow-hidden bg-slate-950/80 p-6 flex flex-col justify-between transition-all ${getTerrainOverlay()}`}
      >
        {/* Weather/Terrain Indicators */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {battle.weather !== 'None' && (
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">
              {battle.weather === 'Sunny' && <Sun className="w-3.5 h-3.5" />}
              {battle.weather === 'Rain' && <CloudRain className="w-3.5 h-3.5" />}
              {battle.weather === 'Sandstorm' && <Wind className="w-3.5 h-3.5" />}
              {battle.weather === 'Hail' && <Snowflake className="w-3.5 h-3.5" />}
              <span>
                {battle.weather} ({battle.weatherTurns}T)
              </span>
            </div>
          )}
          {battle.terrain !== 'None' && (
            <div className="flex items-center gap-1 bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {battle.terrain} Terrain ({battle.terrainTurns}T)
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Weather overlay visuals */}
        <div className={getWeatherOverlay()} />

        {/* Opponent AI Card (Top-Right) */}
        <div className="flex justify-end items-start w-full">
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full max-w-sm bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-lg backdrop-blur-sm"
          >
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="font-bold text-slate-100 flex items-center gap-2">
                {aActive.name}
                <span className="text-[10px] text-slate-400">Lv.50</span>
              </h4>
              <div className="flex gap-1">
                {aActive.types.map((t) => (
                  <span
                    key={t}
                    className="text-[8px] font-bold uppercase px-1 py-0.25 rounded bg-slate-800 text-slate-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            {/* HP Bar */}
            <div className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden mb-1 border border-slate-800/50">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: `${(aActive.hp! / aActive.maxHp!) * 100}%` }}
                className={`h-full ${getHpBarColor(aActive.hp!, aActive.maxHp!)}`}
              />
            </div>
            <div className="text-[10px] text-right font-semibold text-slate-400">
              HP:{' '}
              <span className="text-slate-200">
                {aActive.hp}/{aActive.maxHp}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Player Trainer Card (Bottom-Left) */}
        <div className="flex justify-start items-end w-full mt-8">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full max-w-sm bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-lg backdrop-blur-sm"
          >
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="font-bold text-slate-100 flex items-center gap-2">
                {pActive.name}
                <span className="text-[10px] text-slate-400">Lv.50</span>
              </h4>
              <div className="flex gap-1">
                {pActive.types.map((t) => (
                  <span
                    key={t}
                    className="text-[8px] font-bold uppercase px-1 py-0.25 rounded bg-slate-800 text-slate-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            {/* HP Bar */}
            <div className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden mb-1 border border-slate-800/50">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: `${(pActive.hp! / pActive.maxHp!) * 100}%` }}
                className={`h-full ${getHpBarColor(pActive.hp!, pActive.maxHp!)}`}
              />
            </div>
            <div className="text-[10px] text-right font-semibold text-slate-400">
              HP:{' '}
              <span className="text-slate-200">
                {pActive.hp}/{pActive.maxHp}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Middle Log Panel */}
      <div className="h-44 border-x border-slate-800/80 bg-slate-950/40 p-4 overflow-y-auto flex flex-col gap-2.5">
        {battle.logs.map((log, idx) => {
          const showCalc = showCalcDetailsIdx === idx;
          const hasBreakdown = log.breakdown !== undefined;

          return (
            <div key={log.id || idx} className="space-y-2">
              <div
                className={`text-xs flex items-start gap-2 ${
                  log.type === 'commentary'
                    ? 'text-amber-400 italic bg-amber-500/5 p-2 rounded-lg border border-amber-500/10'
                    : log.type === 'defeat'
                      ? 'text-rose-400 font-bold'
                      : log.type === 'swap'
                        ? 'text-cyan-400'
                        : 'text-slate-300'
                }`}
              >
                <span className="text-[10px] text-slate-600 font-mono mt-0.5">[{idx + 1}]</span>
                <div className="flex-1">
                  <span>{log.text}</span>
                  {hasBreakdown && (
                    <button
                      onClick={() => setShowCalcDetailsIdx(showCalc ? null : idx)}
                      className="ml-2 text-[10px] text-rose-400 hover:underline flex inline-items items-center gap-1 font-semibold"
                    >
                      <BookOpen className="w-3 h-3" />{' '}
                      {showCalc ? 'Hide Calculation' : 'Show Math Details'}
                    </button>
                  )}
                </div>
              </div>

              {/* Educational Damage Calculator Math Detail drawer */}
              <AnimatePresence>
                {showCalc && log.breakdown && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 font-mono space-y-2"
                  >
                    <div className="font-bold text-[10px] uppercase text-rose-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5 mb-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Pokémon Damage Engine (Gen V Rules)
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        Attacker Level: <span className="text-slate-200">50</span>
                      </div>
                      <div>
                        Base Formula Output:{' '}
                        <span className="text-slate-200">{log.breakdown.baseDamage} HP</span>
                      </div>
                      <div>
                        STAB Multiplier:{' '}
                        <span className="text-slate-200">{log.breakdown.stab}x</span>
                      </div>
                      <div>
                        Type Effectiveness:{' '}
                        <span className="text-slate-200">{log.breakdown.typeEffectiveness}x</span>
                      </div>
                      {battle.weather !== 'None' && (
                        <div>
                          Weather Modifier:{' '}
                          <span className="text-slate-200">{log.breakdown.weatherMod}x</span>
                        </div>
                      )}
                      {battle.terrain !== 'None' && (
                        <div>
                          Terrain Modifier:{' '}
                          <span className="text-slate-200">{log.breakdown.terrainMod}x</span>
                        </div>
                      )}
                      <div>
                        Random Roll Multiplier:{' '}
                        <span className="text-slate-200">{log.breakdown.randomRoll}x</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-900 pt-2 flex justify-between items-center font-bold text-slate-200 text-xs">
                      <span>Stacking Math:</span>
                      <span className="text-rose-400">
                        {log.breakdown.baseDamage} * {log.breakdown.stab} *{' '}
                        {log.breakdown.typeEffectiveness}
                        {battle.weather !== 'None' ? ` * ${log.breakdown.weatherMod}` : ''}
                        {battle.terrain !== 'None' ? ` * ${log.breakdown.terrainMod}` : ''}*{' '}
                        {log.breakdown.randomRoll} = {log.breakdown.finalDamage} HP!
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Bottom Actions Bar */}
      <div className="border border-slate-800 bg-slate-900/60 p-4 rounded-b-2xl z-10 flex flex-col md:flex-row justify-between gap-4">
        {/* Core HUD status */}
        <div className="flex items-center gap-3">
          <RemoteImage
            src={avatar || `https://picsum.photos/40/40?seed=hud`}
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-800"
            alt="HUD player"
          />
          <div>
            <div className="text-xs font-bold text-slate-300">Active Pokémon: {pActive.name}</div>
            <div className="text-[10px] text-slate-400">
              Choose a tactical move to direct the fight.
            </div>
          </div>
        </div>

        {/* Action Options Panels */}
        <div className="flex-1 max-w-md flex flex-col gap-2 justify-end self-end">
          {activeSubMenu === 'none' ? (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => setActiveSubMenu('move')}
                disabled={battle.turnOwner !== 'player'}
                className="py-2.5 bg-red-700 hover:bg-red-600 rounded-xl font-bold text-white transition-all disabled:opacity-50"
              >
                Attack
              </button>
              <button
                onClick={() => setActiveSubMenu('switch')}
                disabled={battle.turnOwner !== 'player'}
                className="py-2.5 bg-cyan-700 hover:bg-cyan-600 rounded-xl font-bold text-white transition-all disabled:opacity-50"
              >
                Switch
              </button>
              <button
                onClick={resetBattle}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300 border border-slate-700 transition-all"
              >
                Flee
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {activeSubMenu === 'move' ? 'Select Attack Move' : 'Switch Active Pokemon'}
                </span>
                <button
                  onClick={() => setActiveSubMenu('none')}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Back
                </button>
              </div>

              {/* Submenu grids */}
              {activeSubMenu === 'move' && (
                <div className="grid grid-cols-2 gap-2">
                  {pActive.moves.map((move) => (
                    <button
                      key={move.name}
                      onClick={() => handleSelectMove(move)}
                      className="flex flex-col text-left p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 hover:border-slate-700 transition-all"
                    >
                      <span className="text-xs font-bold text-slate-200">{move.name}</span>
                      <div className="flex justify-between items-center w-full text-[9px] text-slate-500 mt-1">
                        <span>
                          {move.type} | {move.category}
                        </span>
                        <span className="font-bold text-slate-400">BP: {move.power}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeSubMenu === 'switch' && (
                <div className="flex flex-col gap-2">
                  {battle.playerTeam.map((p, idx) => {
                    const active = idx === battle.playerActiveIdx;
                    const fainted = p.hp === 0;

                    return (
                      <button
                        key={p.name + idx}
                        disabled={active || fainted}
                        onClick={() => handleSelectSwitch(idx)}
                        className={`flex items-center justify-between p-2 rounded border text-left transition-all ${
                          active
                            ? 'bg-slate-800/40 border-slate-800 cursor-not-allowed opacity-50'
                            : fainted
                              ? 'bg-slate-950 border-slate-900 cursor-not-allowed opacity-30'
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{p.name}</span>
                          {active && (
                            <span className="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.25 rounded border border-slate-700">
                              Active
                            </span>
                          )}
                          {fainted && (
                            <span className="text-[8px] bg-red-950 text-red-400 px-1 py-0.25 rounded border border-red-900">
                              Fainted
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          HP: {p.hp}/{p.maxHp}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Win/Loss Full-Screen Overlay Modal */}
      <AnimatePresence>
        {(battle.status === 'won' || battle.status === 'lost') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-6 text-center rounded-2xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl"
            >
              <div className="text-6xl mb-4">{battle.status === 'won' ? '🏆' : '💀'}</div>
              <h2 className="text-2xl font-bold tracking-wider mb-2">
                {battle.status === 'won' ? 'Victory Achieved!' : 'Defeat Enured'}
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                {battle.status === 'won'
                  ? 'You fainted all opposing AI Gym Leader Pokémon. Your battle records are recorded in the Hall of Fame!'
                  : 'All of your active roster Pokémon have fainted. Keep training and refining your type-matchups!'}
              </p>

              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800/60 text-center mb-6">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Turns Played
                  </div>
                  <div className="text-lg font-bold text-slate-200">{battle.turnNumber}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Leader Score
                  </div>
                  <div className="text-lg font-bold text-rose-500">
                    {battle.status === 'won' ? Math.max(100, 5000 - battle.turnNumber * 120) : 0}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={resetBattle}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <RefreshCcw className="w-4 h-4" /> Try Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
