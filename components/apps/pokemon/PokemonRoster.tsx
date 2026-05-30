'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, Trash2, Swords, ShieldAlert, Cpu } from 'lucide-react';
import { useStore, PREMADE_ROSTER } from './store';
import { Pokemon } from './types';

interface RosterProps {
  labMode?: boolean;
}

export function PokemonRoster({ labMode = false }: RosterProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [customThemePrompt, setCustomThemePrompt] = useState('');

  const {
    customRoster,
    generateCustomTeam,
    setCustomRoster,
    selectRosterTeam,
    startNewBattle,
    battle,
    setDifficulty,
    theme,
  } = useStore();

  const allAvailable = [...PREMADE_ROSTER, ...customRoster];

  const handleSelect = (idx: number) => {
    if (labMode) return; // Lab mode is read-only inspection

    if (selectedIndices.includes(idx)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== idx));
    } else {
      if (selectedIndices.length >= 3) return; // Cap at 3
      setSelectedIndices([...selectedIndices, idx]);
    }
  };

  const handleClearSelected = () => {
    setSelectedIndices([]);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customThemePrompt.trim()) return;
    await generateCustomTeam(customThemePrompt);
    setCustomThemePrompt('');
  };

  const handleConfirmTeam = () => {
    if (selectedIndices.length !== 3) return;
    const chosen = selectedIndices.map((i) => allAvailable[i]);
    selectRosterTeam(chosen);
    startNewBattle();
  };

  const isSelected = (idx: number) => selectedIndices.indexOf(idx);

  return (
    <div className="space-y-6">
      {/* AI Custom Team Generator */}
      <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
        <h3 className="text-md font-bold mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          AI Team Synthesizer (Gemini Powered)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Type a thematic prompt (e.g. &lsquo;Steampunk Clockwork&rsquo;, &lsquo;Vaporwave
          Neon&rsquo;, &lsquo;Deep-sea Bio-luminescent&rsquo;) to synthesize a completely custom
          3-Pokémon team with custom moves, stats, and origins!
        </p>
        <form onSubmit={handleGenerate} className="flex gap-2">
          <input
            type="text"
            value={customThemePrompt}
            onChange={(e) => setCustomThemePrompt(e.target.value)}
            disabled={battle.isGeneratingTeam}
            placeholder="Describe your team theme..."
            className="flex-1 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-sm focus:outline-none focus:border-rose-500/50 transition-all text-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={battle.isGeneratingTeam || !customThemePrompt.trim()}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {battle.isGeneratingTeam ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {battle.isGeneratingTeam ? 'Synthesizing...' : 'Synthesize Team'}
          </button>
        </form>
      </div>

      {/* Selected Header for Arena Entry */}
      {!labMode && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900/30 border border-slate-800 p-4 rounded-xl gap-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-rose-400" />
            <div>
              <h4 className="font-bold text-sm">Select Your Roster (3 Required)</h4>
              <p className="text-xs text-slate-400">
                Selected:{' '}
                <span className="text-slate-200 font-bold">{selectedIndices.length}/3</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Difficulty Selector */}
            <div className="flex bg-slate-950 border border-slate-800 p-0.5 rounded-lg text-xs">
              {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                    battle.difficulty === diff
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirmTeam}
              disabled={selectedIndices.length !== 3}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Swords className="w-4 h-4" />
              Enter Arena
            </button>
          </div>
        </div>
      )}

      {/* Pokémon Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">
            Roster Catalog
          </h3>
          {selectedIndices.length > 0 && (
            <button
              onClick={handleClearSelected}
              className="text-xs text-rose-400 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Selection
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {allAvailable.map((pokemon, idx) => {
            const selectPos = isSelected(idx);
            const chosen = selectPos !== -1;
            const isCustom = pokemon.id && pokemon.id.startsWith('ai-gen');

            return (
              <motion.div
                key={pokemon.id || pokemon.name + idx}
                whileHover={{ scale: 1.01 }}
                onClick={() => handleSelect(idx)}
                className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all cursor-pointer select-none ${
                  chosen
                    ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                {/* Visual badges */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {pokemon.types.map((type) => (
                      <span
                        key={type}
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          type === 'Fire'
                            ? 'bg-orange-500/20 text-orange-400'
                            : type === 'Water'
                              ? 'bg-blue-500/20 text-blue-400'
                              : type === 'Grass'
                                ? 'bg-green-500/20 text-green-400'
                                : type === 'Electric'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : type === 'Dragon'
                                    ? 'bg-indigo-500/20 text-indigo-400'
                                    : type === 'Rock'
                                      ? 'bg-amber-600/20 text-amber-400'
                                      : type === 'Ground'
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : type === 'Dark'
                                          ? 'bg-purple-950/40 text-purple-400'
                                          : 'bg-slate-700/20 text-slate-300'
                        }`}
                      >
                        {type}
                      </span>
                    ))}
                    {isCustom && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-400 flex items-center gap-1 border border-fuchsia-500/30">
                        <Sparkles className="w-2.5 h-2.5" /> Synthesized
                      </span>
                    )}
                  </div>

                  {/* Selection counter bubble */}
                  {chosen && (
                    <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      {selectPos + 1}
                    </div>
                  )}
                </div>

                {/* Pokemon Name and stats */}
                <div>
                  <h4 className="text-lg font-bold text-slate-100 mb-1">{pokemon.name}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed h-8">
                    {pokemon.description}
                  </p>

                  {/* Stats columns */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40 text-center mb-4">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                        HP
                      </div>
                      <div className="text-xs font-bold text-slate-300">{pokemon.stats.hp}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                        ATK
                      </div>
                      <div className="text-xs font-bold text-slate-300">{pokemon.stats.atk}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                        DEF
                      </div>
                      <div className="text-xs font-bold text-slate-300">{pokemon.stats.def}</div>
                    </div>
                  </div>

                  {/* Move quick lists */}
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
                      Move Pool
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {pokemon.moves.slice(0, 4).map((move) => (
                        <div
                          key={move.name}
                          className="flex flex-col bg-slate-900/80 px-2 py-1 rounded border border-slate-800 text-[10px]"
                        >
                          <span className="font-semibold text-slate-300 truncate">{move.name}</span>
                          <span className="text-[8px] text-slate-500">Power: {move.power}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
