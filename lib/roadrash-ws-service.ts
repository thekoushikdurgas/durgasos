/** WebSocket JSON-RPC method names for Road Rash */

export const ROADRASH_RPC = {
  profileGet: 'roadrash.profile.get',
  profileSave: 'roadrash.profile.save',
  leaderboardGet: 'roadrash.leaderboard.get',
  leaderboardSeason: 'roadrash.leaderboard.season',
  leaderboardPersonalBest: 'roadrash.leaderboard.personal_best',
  leaderboardFriends: 'roadrash.leaderboard.friends',
  leaderboardSubmit: 'roadrash.leaderboard.submit',
  friendsList: 'roadrash.friends.list',
  friendsAdd: 'roadrash.friends.add',
  friendsAccept: 'roadrash.friends.accept',
  friendsChallenge: 'roadrash.friends.challenge',
  matchmakingJoin: 'roadrash.matchmaking.join',
  matchmakingReady: 'roadrash.matchmaking.ready',
  gameSync: 'roadrash.game.sync',
  weatherReport: 'roadrash.weather.report',
} as const;

export type RoadRashProfile = {
  player_name: string;
  money: number;
  current_bike: string;
  unlocked_bikes: string[];
  unlocked_tracks: string[];
  save_data: Record<string, unknown>;
  elo_score?: number;
};

export type LeaderboardEntry = {
  id: string;
  player_name: string;
  race_time: number;
  points: number;
  medal?: string;
  track_name?: string;
};

export type FriendEntry = {
  friend_id: string;
  player_name: string;
  elo_score?: number;
  best_time?: number | null;
  best_medal?: string | null;
};
