'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  FlaskConical,
  Award,
  GraduationCap,
  Settings,
  Sparkles,
  User,
  RefreshCw,
} from 'lucide-react';
import { RemoteImage } from '@/components/ui/remote-image';
import { useStore } from './store';
import { ThemeName } from './types';
import { PokemonRoster } from './PokemonRoster';
import { PokemonBattleCanvas } from './PokemonBattleCanvas';
import { PokemonCoach } from './PokemonCoach';

// Theme styles configuration
const THEME_CLASSES: Record<
  ThemeName,
  { bg: string; text: string; primary: string; accent: string; border: string; card: string }
> = {
  Classic: {
    bg: 'bg-slate-950/90',
    text: 'text-slate-100',
    primary: 'bg-red-600 hover:bg-red-500 text-white',
    accent: 'text-red-400',
    border: 'border-slate-800',
    card: 'bg-slate-900/60 border border-slate-800',
  },
  'Neon Cyber': {
    bg: 'bg-gray-955/90',
    text: 'text-cyan-100',
    primary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950',
    accent: 'text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
    border: 'border-cyan-500/30',
    card: 'bg-slate-900/70 border border-cyan-500/20 backdrop-blur-md',
  },
  'Solar Dawn': {
    bg: 'bg-amber-950/85',
    text: 'text-amber-100',
    primary: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    accent: 'text-amber-400',
    border: 'border-amber-900/30',
    card: 'bg-amber-900/20 border border-amber-900/30',
  },
  'Deep Ocean': {
    bg: 'bg-blue-950/90',
    text: 'text-blue-100',
    primary: 'bg-sky-500 hover:bg-sky-400 text-slate-950',
    accent: 'text-sky-400',
    border: 'border-blue-900/40',
    card: 'bg-blue-950/40 border border-blue-900/30',
  },
  Tectonic: {
    bg: 'bg-stone-950/90',
    text: 'text-stone-100',
    primary: 'bg-stone-600 hover:bg-stone-500 text-white',
    accent: 'text-stone-400',
    border: 'border-stone-800',
    card: 'bg-stone-900/60 border border-stone-800',
  },
};

export function PokemonShell() {
  const [activeTab, setActiveTab] = useState<'battle' | 'roster' | 'leaderboard' | 'academy'>(
    'battle'
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const {
    nickname,
    avatar,
    setNickname,
    isConnected,
    profile,
    leaderboard,
    loadLeaderboard,
    theme,
    setTheme,
    battle,
  } = useStore();

  const currentTheme = THEME_CLASSES[theme];

  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-hidden font-sans ${currentTheme.bg} ${currentTheme.text}`}
    >
      {/* Top Navbar */}
      <header
        className={`flex items-center justify-between px-6 py-4 border-b ${currentTheme.border} bg-slate-900/20 backdrop-blur-sm z-10`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Swords className={`w-8 h-8 ${currentTheme.accent} animate-pulse`} />
            <div className="absolute -inset-1 rounded-full bg-red-500/20 blur opacity-70 animate-ping" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider flex items-center gap-2">
              PokeBattle AI
              <span
                className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${currentTheme.border} ${isConnected ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`}
              >
                {isConnected ? 'Sync Online' : 'Local'}
              </span>
            </h1>
            <p className="text-xs text-slate-400">DurgasOS AI Battle Simulator</p>
          </div>
        </div>

        {/* Profile Card Summary */}
        <div className="flex items-center gap-3 bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-800">
          <RemoteImage
            src={avatar}
            alt="avatar"
            width={32}
            height={32}
            className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 object-cover"
          />
          <div>
            {isEditingProfile ? (
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onBlur={() => setIsEditingProfile(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingProfile(false)}
                className="bg-slate-800 border border-slate-700 text-xs px-1.5 py-0.5 rounded text-white focus:outline-none w-24"
                autoFocus
              />
            ) : (
              <div
                className="flex items-center gap-1.5 cursor-pointer"
                onClick={() => setIsEditingProfile(true)}
              >
                <span className="text-xs font-semibold hover:underline">{nickname}</span>
                <User className="w-3 h-3 text-slate-500" />
              </div>
            )}
            <div className="text-[10px] text-slate-400">
              Streak:{' '}
              <span className={currentTheme.accent}>{profile?.stats?.currentStreak ?? 0}</span> |
              Won: {profile?.stats?.battlesWon ?? 0}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <nav
          className={`w-16 md:w-56 border-r ${currentTheme.border} bg-slate-900/10 flex flex-col py-6 gap-2 justify-between items-center md:items-stretch px-2 md:px-4 z-10`}
        >
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('battle')}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'battle'
                  ? `${currentTheme.accent} bg-slate-800/60 border ${currentTheme.border}`
                  : 'text-slate-400 hover:bg-slate-900/30 hover:text-slate-200'
              }`}
            >
              <Swords className="w-5 h-5 flex-shrink-0" />
              <span className="hidden md:inline">Battle Stadium</span>
            </button>

            <button
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'roster'
                  ? `${currentTheme.accent} bg-slate-800/60 border ${currentTheme.border}`
                  : 'text-slate-400 hover:bg-slate-900/30 hover:text-slate-200'
              }`}
            >
              <FlaskConical className="w-5 h-5 flex-shrink-0" />
              <span className="hidden md:inline">Roster Lab</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('leaderboard');
                void loadLeaderboard();
              }}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'leaderboard'
                  ? `${currentTheme.accent} bg-slate-800/60 border ${currentTheme.border}`
                  : 'text-slate-400 hover:bg-slate-900/30 hover:text-slate-200'
              }`}
            >
              <Award className="w-5 h-5 flex-shrink-0" />
              <span className="hidden md:inline">Hall of Fame</span>
            </button>

            <button
              onClick={() => setActiveTab('academy')}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'academy'
                  ? `${currentTheme.accent} bg-slate-800/60 border ${currentTheme.border}`
                  : 'text-slate-400 hover:bg-slate-900/30 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-5 h-5 flex-shrink-0" />
              <span className="hidden md:inline">AI Academy</span>
            </button>
          </div>

          {/* Theme Selector Widget */}
          <div className="w-full flex flex-col gap-3 p-2 bg-slate-900/30 rounded-xl border border-slate-800/50">
            <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <Settings className="w-3.5 h-3.5" />
              <span>Display Theme</span>
            </div>
            <div className="flex md:grid md:grid-cols-5 gap-1.5 justify-center">
              {(
                ['Classic', 'Neon Cyber', 'Solar Dawn', 'Deep Ocean', 'Tectonic'] as ThemeName[]
              ).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  title={t}
                  className={`w-6 h-6 rounded-full border transition-all ${
                    t === 'Classic'
                      ? 'bg-red-600 border-red-700'
                      : t === 'Neon Cyber'
                        ? 'bg-cyan-500 border-cyan-400'
                        : t === 'Solar Dawn'
                          ? 'bg-amber-500 border-amber-400'
                          : t === 'Deep Ocean'
                            ? 'bg-blue-600 border-blue-500'
                            : 'bg-stone-600 border-stone-500'
                  } ${theme === t ? 'ring-2 ring-white ring-offset-2 scale-110' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>
        </nav>

        {/* Dynamic Display Area */}
        <main className="flex-1 overflow-hidden relative bg-slate-950/40 p-4 md:p-6 z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'battle' && (
              <motion.div
                key="battle-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-full"
              >
                {battle.status === 'idle' || battle.status === 'roster_selection' ? (
                  <PokemonRoster />
                ) : (
                  <PokemonBattleCanvas />
                )}
              </motion.div>
            )}

            {activeTab === 'roster' && (
              <motion.div
                key="roster-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-full overflow-y-auto"
              >
                <div className="max-w-4xl mx-auto space-y-6">
                  <h2 className="text-2xl font-bold tracking-wider flex items-center gap-2">
                    <FlaskConical className={currentTheme.accent} /> Roster Lab
                  </h2>
                  <p className="text-sm text-slate-400">
                    Review premade classic Pokémon or request Gemini to generate custom species
                    matching a theme prompt. The generated species are automatically saved to your
                    cloud save profile.
                  </p>
                  <PokemonRoster labMode />
                </div>
              </motion.div>
            )}

            {activeTab === 'leaderboard' && (
              <motion.div
                key="leaderboard-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-full overflow-y-auto"
              >
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-wider flex items-center gap-2">
                      <Award className={currentTheme.accent} /> Hall of Fame
                    </h2>
                    <button
                      onClick={() => void loadLeaderboard()}
                      className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:bg-slate-800/80 transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={`rounded-xl p-4 ${currentTheme.card}`}>
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="py-2.5 px-4">Rank</th>
                          <th className="py-2.5 px-4">Player</th>
                          <th className="py-2.5 px-4">Difficulty</th>
                          <th className="py-2.5 px-4">Turns</th>
                          <th className="py-2.5 px-4">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              No scores submitted yet. Be the first to win!
                            </td>
                          </tr>
                        ) : (
                          leaderboard.map((entry, idx) => (
                            <tr
                              key={entry.id || idx}
                              className="border-b border-slate-900/50 hover:bg-slate-900/20 transition-all"
                            >
                              <td className="py-3 px-4 font-bold">
                                {idx === 0
                                  ? '🥇'
                                  : idx === 1
                                    ? '🥈'
                                    : idx === 2
                                      ? '🥉'
                                      : `#${idx + 1}`}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-200">
                                {entry.player_name}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                                    entry.difficulty === 'Hard'
                                      ? 'text-red-400 border-red-500/30 bg-red-500/10'
                                      : entry.difficulty === 'Easy'
                                        ? 'text-green-400 border-green-500/30 bg-green-500/10'
                                        : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
                                  }`}
                                >
                                  {entry.difficulty}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-400">{entry.turns_taken}</td>
                              <td className={`py-3 px-4 font-bold ${currentTheme.accent}`}>
                                {entry.score}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'academy' && (
              <motion.div
                key="academy-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-full overflow-y-auto"
              >
                <div className="max-w-4xl mx-auto space-y-6">
                  <h2 className="text-2xl font-bold tracking-wider flex items-center gap-2">
                    <GraduationCap className={currentTheme.accent} /> AI Strategy Academy
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* General Stats Card */}
                    <div
                      className={`p-5 rounded-xl ${currentTheme.card} flex flex-col justify-between`}
                    >
                      <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest mb-4">
                        Player Record
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between border-b border-slate-900/40 pb-2">
                          <span className="text-slate-400">Total Battles</span>
                          <span className="font-bold text-slate-200">
                            {profile?.stats?.battlesTotal ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-900/40 pb-2">
                          <span className="text-slate-400">Wins</span>
                          <span className="font-bold text-green-400">
                            {profile?.stats?.battlesWon ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-900/40 pb-2">
                          <span className="text-slate-400">Losses</span>
                          <span className="font-bold text-red-400">
                            {profile?.stats?.battlesLost ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Longest Streak</span>
                          <span className={`font-bold ${currentTheme.accent}`}>
                            {profile?.stats?.highestStreak ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Achievements List Card */}
                    <div className={`p-5 rounded-xl ${currentTheme.card} col-span-1 md:col-span-2`}>
                      <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest mb-4">
                        Unlocked Trophies
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(profile?.achievements || []).map((ach) => (
                          <div
                            key={ach.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/30 ${ach.unlockedAt ? 'opacity-100' : 'opacity-40'}`}
                          >
                            <div className="text-2xl">{ach.icon}</div>
                            <div>
                              <h4 className="font-semibold text-sm text-slate-200">{ach.title}</h4>
                              <p className="text-xs text-slate-400">{ach.description}</p>
                              {ach.unlockedAt && (
                                <span className="text-[10px] text-green-400 mt-1 block">
                                  ✓ Unlocked
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Coach Module */}
                  <div className={`p-5 rounded-xl ${currentTheme.card}`}>
                    <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-spin" /> Post-Battle Coach
                      Critiques
                    </h3>
                    <PokemonCoach />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Decorative OS Glow Border */}
      <div
        className={`pointer-events-none absolute bottom-0 z-[94] h-1 w-full bg-gradient-to-r from-red-500 via-transparent to-pink-500 opacity-40`}
      />
    </div>
  );
}
