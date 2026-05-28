'use client';

import { useRoadRash } from '@/contexts/roadrash-context';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Radio } from '@/components/ui/radio';
import { getSeasonWeek, daysUntilSeasonReset, medalEmoji } from '@/lib/roadrash-engine';
import { TRACKS } from '@/lib/roadrash-constants';
import type { LeaderboardEntry } from '@/lib/roadrash-ws-service';

function ScoreTable({ rows }: { rows: LeaderboardEntry[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-center py-12 text-white/30 text-xs">
        No records yet. Race to set the first score!
      </p>
    );
  }
  return (
    <>
      <div className="hidden md:block rounded-3xl rr-panel-3d overflow-hidden border border-white/5">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-slate-950/40 text-white/50 text-xs uppercase">
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Rider</th>
              <th className="px-6 py-4">Time</th>
              <th className="px-6 py-4">Medal</th>
              <th className="px-6 py-4">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-6 py-4 font-bold text-rose-500">#{index + 1}</td>
                <td className="px-6 py-4 font-semibold">{item.player_name}</td>
                <td className="px-6 py-4 text-emerald-400 font-bold">
                  {item.race_time.toFixed(2)}s
                </td>
                <td className="px-6 py-4">{medalEmoji(item.medal)}</td>
                <td className="px-6 py-4 text-amber-400">₹{item.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden flex flex-col gap-2">
        {rows.map((item, index) => (
          <div
            key={item.id}
            className="rr-panel-3d rounded-2xl p-4 flex justify-between items-center"
          >
            <div>
              <span className="text-rose-500 font-bold">#{index + 1}</span>
              <span className="ml-2 font-semibold">{item.player_name}</span>
            </div>
            <div className="text-right text-sm">
              <div className="text-emerald-400 font-bold">{item.race_time.toFixed(2)}s</div>
              <div>
                {medalEmoji(item.medal)} ₹{item.points}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function LeaderboardTab() {
  const {
    leaderboard,
    seasonLeaderboard,
    friendsLeaderboard,
    personalBest,
    leaderboardView,
    setLeaderboardView,
    selectedTrack,
    setSelectedTrack,
    loadUserData,
  } = useRoadRash();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">LEADERBOARDS</h2>
          <p className="text-sm text-white/50">
            Week {getSeasonWeek()} · Reset in {daysUntilSeasonReset()}d
          </p>
        </div>
      </div>
      <Tabs
        value={leaderboardView}
        onValueChange={(v) => setLeaderboardView(v as typeof leaderboardView)}
        variant="pill"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="season">Season</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap gap-3 mb-4">
          {TRACKS.map((t) => (
            <label key={t.id} className="flex items-center gap-2 cursor-pointer text-xs">
              <Radio
                name="lb-track"
                checked={selectedTrack === t.id}
                onChange={() => {
                  setSelectedTrack(t.id);
                  loadUserData();
                }}
              />
              {t.name.split(' ')[0]}
            </label>
          ))}
        </div>
        {personalBest.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-sm mb-4">
            <span className="text-amber-400 font-bold">My Best: </span>
            {personalBest.map((pb) => (
              <span key={pb.id} className="mr-4">
                {pb.track_name} {pb.race_time.toFixed(2)}s {medalEmoji(pb.medal)}
              </span>
            ))}
          </div>
        )}
        <TabsContent value="global">
          <ScoreTable rows={leaderboard} />
        </TabsContent>
        <TabsContent value="season">
          <ScoreTable rows={seasonLeaderboard} />
        </TabsContent>
        <TabsContent value="friends">
          <ScoreTable rows={friendsLeaderboard} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
