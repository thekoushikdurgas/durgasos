'use client';

import { useCallback, useState } from 'react';
import { getSeasonWeek } from '@/lib/roadrash-engine';
import {
  ROADRASH_RPC,
  type FriendEntry,
  type LeaderboardEntry,
  type RoadRashProfile,
} from '@/lib/roadrash-ws-service';

type UseRoadRashDataArgs = {
  callRpc: (method: string, params: Record<string, unknown>) => Promise<unknown>;
  waitForWsReady: () => Promise<void>;
  selectedTrack: string;
};

export function useRoadRashData({ callRpc, waitForWsReady, selectedTrack }: UseRoadRashDataArgs) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [personalBest, setPersonalBest] = useState<LeaderboardEntry[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [pendingFriends, setPendingFriends] = useState<FriendEntry[]>([]);

  const loadUserData = useCallback(
    async (profile: RoadRashProfile, setProfile: (p: RoadRashProfile) => void) => {
      try {
        await waitForWsReady();
      } catch {
        return;
      }
      try {
        const prof = (await callRpc(ROADRASH_RPC.profileGet, {})) as RoadRashProfile | null;
        if (prof) setProfile(prof);
      } catch (e) {
        console.warn('Could not retrieve cloud save, using local fallback.', e);
      }
      try {
        const leader = (await callRpc(ROADRASH_RPC.leaderboardGet, {
          track_name: selectedTrack,
        })) as { scores?: LeaderboardEntry[] };
        if (leader?.scores) setLeaderboard(leader.scores);
      } catch (e) {
        console.error('Error loading leaderboards', e);
      }
      try {
        const season = (await callRpc(ROADRASH_RPC.leaderboardSeason, {
          track_name: selectedTrack,
          season_week: getSeasonWeek(),
        })) as { scores?: LeaderboardEntry[] };
        if (season?.scores) setSeasonLeaderboard(season.scores);
      } catch {
        /* optional */
      }
      try {
        const pb = (await callRpc(ROADRASH_RPC.leaderboardPersonalBest, {
          track_name: selectedTrack,
        })) as { scores?: LeaderboardEntry[] };
        if (pb?.scores) setPersonalBest(pb.scores);
      } catch {
        /* optional */
      }
      try {
        const fl = (await callRpc(ROADRASH_RPC.friendsList, {
          track_name: selectedTrack,
        })) as { friends?: FriendEntry[]; pending?: FriendEntry[] };
        if (fl?.friends) setFriends(fl.friends);
        if (fl?.pending) setPendingFriends(fl.pending);
      } catch {
        /* optional */
      }
      try {
        const flb = (await callRpc(ROADRASH_RPC.leaderboardFriends, {
          track_name: selectedTrack,
        })) as { scores?: LeaderboardEntry[] };
        if (flb?.scores) setFriendsLeaderboard(flb.scores);
      } catch {
        /* optional */
      }
    },
    [callRpc, waitForWsReady, selectedTrack]
  );

  return {
    leaderboard,
    seasonLeaderboard,
    friendsLeaderboard,
    personalBest,
    friends,
    pendingFriends,
    setFriends,
    setPendingFriends,
    loadUserData,
  };
}
