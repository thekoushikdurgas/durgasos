'use client';

export const badges = [
  {
    name: 'YOLO',
    emoji: '🤘',
    color: 'from-pink-500/30 to-rose-500/10 border-pink-500/20',
  },
  {
    name: 'Pull Shark',
    emoji: '🦈',
    color: 'from-blue-500/30 to-cyan-500/10 border-blue-500/20',
  },
  {
    name: 'Quick Draw',
    emoji: '⚡',
    color: 'from-yellow-400/30 to-orange-500/10 border-yellow-500/20',
  },
  {
    name: 'Galaxy Brain',
    emoji: '🧠',
    color: 'from-purple-500/30 to-indigo-500/10 border-purple-500/20',
  },
  {
    name: 'Pair Extraordinaire',
    emoji: '👯',
    color: 'from-green-400/30 to-emerald-600/10 border-green-500/20',
  },
  {
    name: 'Starstruck',
    emoji: '🌟',
    color: 'from-amber-400/30 to-yellow-600/10 border-amber-500/20',
  },
  {
    name: 'Public Sponsor',
    emoji: '💖',
    color: 'from-red-400/30 to-rose-600/10 border-red-500/20',
  },
  {
    name: 'Arctic Code Vault',
    emoji: '❄️',
    color: 'from-sky-300/30 to-blue-500/10 border-sky-400/20',
  },
];

export function BadgeItem({
  badge,
  size = 'sm',
}: {
  badge: (typeof badges)[0];
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-full shadow-lg border bg-gradient-to-br backdrop-blur-sm ${badge.color} ${
        size === 'sm' ? 'w-10 h-10 text-lg' : 'w-14 h-14 text-2xl'
      } hover:scale-110 hover:border-white/30 transition-all duration-200 cursor-pointer`}
      title={badge.name}
    >
      <span>{badge.emoji}</span>
    </div>
  );
}
