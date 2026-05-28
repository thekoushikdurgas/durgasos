'use client';

import { useRoadRash } from '@/contexts/roadrash-context';
import { RoadRashInput } from '@/components/apps/roadrash/ui/RoadRashInput';
import { RoadRashButton } from '@/components/apps/roadrash/ui/RoadRashButton';
import { medalEmoji } from '@/lib/roadrash-engine';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';

export function SocialTab() {
  const {
    friendSearchName,
    setFriendSearchName,
    addFriend,
    pendingFriends,
    acceptFriend,
    friends,
    challengeFriend,
  } = useRoadRash();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black tracking-tight">SOCIAL & FRIENDS</h2>
        <p className="text-sm text-white/50">Add riders, accept requests, and challenge friends.</p>
      </div>
      <div className="flex gap-2">
        <RoadRashInput
          value={friendSearchName}
          onChange={(e) => setFriendSearchName(e.target.value)}
          placeholder="Driver nickname to add"
          aria-label="Friend driver nickname"
          className="flex-1"
        />
        <RoadRashButton onClick={addFriend}>Add Friend</RoadRashButton>
      </div>
      {pendingFriends.length > 0 && (
        <LiquidGlassSurface variant="frost" className="rr-panel-3d rounded-2xl p-4">
          <h3 className="text-xs font-bold text-white/40 uppercase mb-3">Pending</h3>
          {pendingFriends.map((p) => (
            <div
              key={(p as { id?: string }).id ?? p.friend_id}
              className="flex justify-between items-center py-2"
            >
              <span>{p.player_name}</span>
              <RoadRashButton
                size="sm"
                className="bg-emerald-600"
                onClick={() => acceptFriend((p as { id: string }).id ?? p.friend_id)}
              >
                Accept
              </RoadRashButton>
            </div>
          ))}
        </LiquidGlassSurface>
      )}
      <LiquidGlassSurface variant="frost" className="rr-panel-3d rounded-2xl p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase mb-3">Friends</h3>
        {friends.length === 0 ? (
          <p className="text-xs text-white/30">No friends yet. Search above to add a rider.</p>
        ) : (
          friends.map((f) => (
            <div
              key={f.friend_id}
              className="flex justify-between items-center py-2 border-b border-white/5 last:border-0"
            >
              <div>
                <div className="font-semibold">{f.player_name}</div>
                <div className="text-xs text-white/40">
                  ELO {f.elo_score ?? '—'}
                  {f.best_time != null && ` · Best ${f.best_time.toFixed(2)}s`}
                  {f.best_medal && ` ${medalEmoji(f.best_medal)}`}
                </div>
              </div>
              <RoadRashButton
                size="sm"
                variant="outline"
                onClick={() => challengeFriend(f.friend_id)}
              >
                Challenge
              </RoadRashButton>
            </div>
          ))
        )}
      </LiquidGlassSurface>
    </div>
  );
}
