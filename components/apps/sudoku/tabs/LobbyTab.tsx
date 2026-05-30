import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Difficulty } from '../types';
import {
  Users,
  Plus,
  ArrowRight,
  LogOut,
  Send,
  MessageSquare,
  Shield,
  Activity,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthSession } from '@/components/auth/AuthSessionContext';

export const LobbyTab: React.FC = () => {
  const { room, createRoom, joinRoom, leaveRoom, sendMessage, nickname, isConnected, game } =
    useStore();

  const [codeDraft, setCodeDraft] = useState('');
  const [lobbyDifficulty, setLobbyDifficulty] = useState<Difficulty>('Medium');
  const [chatDraft, setChatDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthSession();

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.messages]);

  const handleCreate = async () => {
    if (!isConnected) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await createRoom(nickname, lobbyDifficulty);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = codeDraft.trim().toUpperCase();
    if (!code || !isConnected) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await joinRoom(code, nickname);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to join room.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatDraft.trim();
    if (!text) return;
    try {
      await sendMessage(text);
      setChatDraft('');
    } catch (err) {
      console.error(err);
    }
  };

  const difficulties: Difficulty[] = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Expert'];

  // Left room layout
  if (!room.id) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6 h-full font-sans select-none text-slate-200">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Users className="text-indigo-400" size={22} />
            Co-op Arena
          </h2>
          <p className="text-xs text-slate-500">
            Play multiplayer matches with friends. Solve together in turn-based mode!
          </p>
        </div>

        {errorMsg && (
          <div className="px-4 py-2.5 rounded-lg text-xs font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Room Block */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between space-y-5">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Plus size={18} className="text-indigo-400" />
                Initialize Lobby
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure difficulty and spin up a new multiplayer board.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase">Difficulty</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {difficulties.map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setLobbyDifficulty(diff)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition border',
                      lobbyDifficulty === diff
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    )}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={loading || !isConnected}
              onClick={handleCreate}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition disabled:opacity-40"
            >
              {loading ? 'Creating...' : 'Create Match Room'}
            </button>
          </div>

          {/* Join Room Block */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between space-y-5">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ArrowRight size={18} className="text-indigo-400" />
                Join Existing Lobby
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter a 6-character room code to join your partner&apos;s game.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase">Room Code</label>
              <input
                type="text"
                maxLength={6}
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value)}
                placeholder="Enter Code (e.g. D39X2A)"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none uppercase font-mono tracking-widest focus:border-indigo-500/50 text-center font-bold"
              />
            </div>

            <button
              type="button"
              disabled={loading || !codeDraft.trim() || !isConnected}
              onClick={handleJoin}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition disabled:opacity-40"
            >
              {loading ? 'Joining...' : 'Join Match Room'}
            </button>
          </div>
        </div>

        {!isConnected && (
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center text-xs text-rose-400">
            ⚠ Connection Offline. Matching services are unavailable.
          </div>
        )}
      </div>
    );
  }

  const myPlayer = room.players.find((p) => (user ? p.id === user.id : p.name === nickname));
  const turnsLeft = room.players.length > 1;
  const isMyTurn = !turnsLeft || room.currentTurnPlayerId === myPlayer?.id;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full font-sans select-none text-slate-200">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/30 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-black text-xs uppercase tracking-wider">
            Room: {room.id}
          </div>
          <span className="text-slate-600 text-xs">|</span>
          <span className="text-xs text-slate-400 font-bold uppercase">
            Difficulty: {room.difficulty}
          </span>
        </div>
        <button
          type="button"
          onClick={leaveRoom}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 font-bold text-xs transition"
        >
          <LogOut size={12} />
          Leave
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left Side: Player Roster & Turn Info */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-850 bg-slate-950/20 p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
          {/* Turn Banner */}
          <div
            className={cn(
              'p-3.5 rounded-xl border flex flex-col items-center gap-1 text-center shadow-inner',
              room.status === 'finished'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : isMyTurn
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
            )}
          >
            <Activity size={18} className="mb-0.5" />
            <div className="text-[10px] font-black uppercase tracking-wider">Match Status</div>
            <div className="text-xs font-bold leading-tight">
              {room.status === 'finished'
                ? 'Puzzle Solved!'
                : room.players.length <= 1
                  ? 'Waiting for Player 2'
                  : isMyTurn
                    ? "It's Your Turn!"
                    : 'Opponent is Thinking'}
            </div>
          </div>

          {/* Players List */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Lobby Players
            </label>
            <div className="space-y-2">
              {room.players.map((p, idx) => {
                const isCreator = p.id === room.creatorId;
                const turnActive = p.id === room.currentTurnPlayerId;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'p-3 rounded-xl border flex flex-col gap-2 relative',
                      turnActive
                        ? 'bg-slate-900 border-indigo-500/30'
                        : 'bg-slate-900/40 border-slate-850'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <img
                        src={p.avatar}
                        alt="avatar"
                        className="w-6 h-6 rounded-lg bg-slate-800 shrink-0 border border-slate-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white leading-none truncate flex items-center gap-1">
                          {p.name}
                          {isCreator && <Shield size={10} className="text-amber-500 shrink-0" />}
                        </div>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase leading-none">
                          Player {idx + 1}
                        </span>
                      </div>
                      {turnActive && (
                        <Star
                          size={12}
                          className="text-indigo-400 shrink-0 fill-current animate-bounce"
                        />
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400">
                        <span>SOLVE PROGRESS</span>
                        <span className="font-mono text-indigo-400">{p.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900 shadow-inner">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Chat Panel */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900/10">
          <div className="p-3 border-b border-slate-850 bg-slate-900/20 flex items-center gap-2 shrink-0">
            <MessageSquare size={14} className="text-slate-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Live Chat
            </span>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {room.messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex flex-col max-w-[85%] rounded-xl px-3 py-2 text-xs',
                  m.isSystem
                    ? 'mx-auto bg-slate-950/45 border border-slate-850 text-slate-400 text-center italic text-[10px] px-4 py-1'
                    : m.sender === nickname
                      ? 'ml-auto bg-indigo-600 text-white rounded-tr-none shadow-md'
                      : 'mr-auto bg-slate-800 text-slate-300 rounded-tl-none border border-slate-750'
                )}
              >
                {!m.isSystem && (
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide mb-0.5">
                    {m.sender}
                  </span>
                )}
                <span className="leading-relaxed break-words">{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Form */}
          <form
            onSubmit={handleSendChat}
            className="p-3 border-t border-slate-850 bg-slate-900/40 flex gap-2 shrink-0"
          >
            <input
              type="text"
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="Send message to room..."
              className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500/50"
            />
            <button
              type="submit"
              disabled={!chatDraft.trim()}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md transition flex items-center justify-center shrink-0"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default LobbyTab;
