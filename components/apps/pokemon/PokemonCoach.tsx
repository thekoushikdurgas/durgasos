'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Award, AlertCircle, Play } from 'lucide-react';
import { useStore } from './store';

export function PokemonCoach() {
  const [isLoading, setIsLoading] = useState(false);
  const [critique, setCritique] = useState<string | null>(null);

  const { battle, callRpc } = useStore();

  const handleRequestCritique = async () => {
    if (!callRpc || battle.logs.length <= 1) return;
    setIsLoading(true);
    try {
      const res = await callRpc('pokemon.coach.analyze', {
        battleLog: battle.logs.map((l) => l.text),
        playerTeam: battle.playerTeam.map((p) => ({ name: p.name })),
        aiTeam: battle.aiTeam.map((p) => ({ name: p.name })),
        result: battle.status,
      });
      if (res?.analysis) {
        setCritique(res.analysis);
      }
    } catch (err) {
      console.error('Failed to load coach critique:', err);
      setCritique('Failed to reach AI Coach. Please check your network connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const hasBattleHistory = battle.logs.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Coach Mascot Profile */}
        <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 w-full md:max-w-xs">
          <div className="w-14 h-14 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-3xl shadow-inner">
            🧠
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-200">Coach Gemini</h4>
            <p className="text-xs text-slate-400">VGC Strategy Consultant</p>
            <span className="text-[10px] text-slate-500 font-semibold block mt-1">
              Status: Ready to analyze
            </span>
          </div>
        </div>

        {/* Console Box */}
        <div className="flex-1 w-full space-y-4">
          {!critique && !isLoading ? (
            <div className="bg-slate-950/60 rounded-xl p-6 border border-slate-800 text-center space-y-4">
              <Brain className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <h4 className="font-bold text-sm text-slate-300">Strategy Evaluation Ready</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Once you complete a battle in the Arena, you can request Coach Gemini to analyze
                  your plays, coverage weaknesses, and team dynamics.
                </p>
              </div>

              <button
                onClick={handleRequestCritique}
                disabled={!hasBattleHistory}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 mx-auto transition-all disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Request Last Battle Critique
              </button>
              {!hasBattleHistory && (
                <p className="text-[10px] text-rose-400 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Start a battle in Stadium first.
                </p>
              )}
            </div>
          ) : isLoading ? (
            <div className="bg-slate-950/60 rounded-xl p-8 border border-slate-800 text-center space-y-4">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
                <div
                  className="absolute inset-2 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin"
                  style={{ animationDirection: 'reverse', animationDuration: '1s' }}
                />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-300">
                  Critiquing Your Battle Decisions...
                </h4>
                <p className="text-[10px] text-slate-400 font-mono mt-1 animate-pulse">
                  Analyzing team coverage, swap phases, and move damage rolls...
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-inner"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" /> VGC Match Review Log
                </h4>
                <button
                  onClick={() => setCritique(null)}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Clear Review
                </button>
              </div>

              {/* Coaching Feedback Text */}
              <div className="text-xs text-slate-300 leading-relaxed font-sans space-y-3 whitespace-pre-wrap">
                {critique}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
export default PokemonCoach;
