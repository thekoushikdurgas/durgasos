'use client';

import { useDesktopBackground } from '@/components/desktop-background/DesktopBackgroundProvider';
import {
  Settings,
  Palette,
  Cpu,
  Activity,
  Server,
  ChevronRight,
  Monitor,
  KeyRound,
  FileType,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Checkbox } from '@/components/ui/checkbox';
import { Radio } from '@/components/ui/radio';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useSystemHealth } from '@/hooks/use-system-health';
import { getGraphqlHttpUrl } from '@/lib/backend-url';
import { ME, SYSTEM_READY } from '@/lib/graphql-modules';
import {
  DESKTOP_BACKGROUND_OPTIONS,
  type DesktopBackgroundId,
} from '@/lib/desktop-background-storage';
import { SettingsAiProvidersPane } from '@/components/apps/SettingsAiProvidersPane';
import { SettingsDefaultAppsPane } from '@/components/apps/SettingsDefaultAppsPane';
import { SettingsProfilePane } from '@/components/apps/SettingsProfilePane';
import { SettingsAccountsPane } from '@/components/apps/SettingsAccountsPane';
import { useWindowLaunch } from '@/components/window-launch-context';
import { useAuthSession } from '@/components/auth/AuthSessionContext';
import { SettingsSessionSummary } from '@/components/apps/SettingsSessionSummary';
import { notifyFocusWelcomeAuth } from '@/lib/auth-session-events';
import { canRunAuthedGraphqlQueries } from '@/lib/auth-graphql-ready';

const SETTINGS_TAB_NAMES = [
  'Profile',
  'Accounts',
  'Appearance',
  'Agents & models',
  'AI providers',
  'Default apps',
  'System health',
  'Backend & session',
  'More (coming soon)',
] as const;

/** Sidebar tabs that have real content (not the dashed “under construction” placeholder). */
const SETTINGS_TABS_WITH_PANES: readonly string[] = [...SETTINGS_TAB_NAMES];

function SettingsConstructionFallback({ activeTab }: { activeTab: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 text-white/30">
      <Settings className="mb-4 h-12 w-12 opacity-50" />
      <p>Settings modules for {activeTab} are under construction.</p>
    </div>
  );
}

function DesktopBackgroundThumb({ id }: { id: DesktopBackgroundId }) {
  switch (id) {
    case 'stars':
      return (
        <div
          className="h-full w-full"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(147,197,253,0.35) 0%, hsl(217 64% 6%) 55%)',
          }}
        />
      );
    case 'classic':
      return (
        <div className="h-full w-full bg-gradient-to-br from-[#1a1c2c] via-[#4a1942] to-[#12355b] opacity-95" />
      );
    case 'paths':
      return (
        <div className="h-full w-full bg-[#1a1c2c]">
          <svg
            className="h-full w-full opacity-70"
            viewBox="0 0 696 316"
            preserveAspectRatio="none"
          >
            <path
              d="M-200 -100 C 100 50 400 200 600 250"
              fill="none"
              stroke="rgba(148,163,184,0.45)"
              strokeWidth="2"
            />
            <path
              d="M 600 50 C 400 120 200 280 -50 200"
              fill="none"
              stroke="rgba(148,163,184,0.3)"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      );
    case 'asmr':
      return (
        <div
          className="h-full w-full"
          style={{
            background: 'radial-gradient(circle at 30% 40%, rgba(180,220,255,0.1) 0%, #0a0a0c 65%)',
          }}
        />
      );
    default:
      return <div className="h-full w-full bg-slate-900" />;
  }
}

export function SettingsApp() {
  const launch = useWindowLaunch();
  const [activeTab, setActiveTab] = useState('Appearance');
  const [transparencyOn, setTransparencyOn] = useState(true);
  const [accent, setAccent] = useState<'blue' | 'violet' | 'cyan'>('blue');
  const [agentsTab, setAgentsTab] = useState('routing');
  const { backgroundId, setBackgroundId } = useDesktopBackground();
  const { raw, overall, loading, error, refetch } = useSystemHealth(20_000);

  const chatProvider = useMemo(
    () => process.env.NEXT_PUBLIC_CHAT_PROVIDER ?? '(not set — default stack)',
    []
  );

  const graphqlUrl = useMemo(() => {
    try {
      return getGraphqlHttpUrl();
    } catch {
      return '(configure NEXT_PUBLIC_GRAPHQL_URL or NEXT_PUBLIC_BACKEND_URL)';
    }
  }, []);

  const readyQ = useQuery(SYSTEM_READY, {
    variables: { params: {} },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  const { authenticated: sessionAuthed, user: sessionUser } = useAuthSession();
  const graphqlReady = canRunAuthedGraphqlQueries();
  const meQ = useQuery(ME, { fetchPolicy: 'cache-and-network', skip: !graphqlReady });
  const me = meQ.data?.me;
  const authed = Boolean(me?.id) || graphqlReady;
  const accountTitle =
    me?.email?.trim() ||
    sessionUser?.email?.trim() ||
    (me?.id ? `Account ${me.id.slice(0, 8)}…` : sessionAuthed ? 'Signed in' : 'Guest');
  const accountSubtitleAuthed = 'Signed in · synced with this session';
  const avatarLetter = (me?.email?.trim()?.[0] ?? me?.id?.[0] ?? 'U').toUpperCase();

  const TABS = [
    { name: 'Profile', icon: User },
    { name: 'Accounts', icon: Users },
    { name: 'Appearance', icon: Palette },
    { name: 'Agents & models', icon: Cpu },
    { name: 'AI providers', icon: KeyRound },
    { name: 'Default apps', icon: FileType },
    { name: 'System health', icon: Activity },
    { name: 'Backend & session', icon: Server },
    { name: 'More (coming soon)', icon: Settings },
  ];

  useEffect(() => {
    const t = launch?.settingsTab?.trim();
    if (!t) return;
    if ((SETTINGS_TAB_NAMES as readonly string[]).includes(t)) {
      queueMicrotask(() => {
        setActiveTab(t);
      });
    }
  }, [launch?.settingsTab]);

  return (
    <div className="absolute inset-0 flex bg-slate-900/90 text-slate-200">
      <LiquidGlassSurface
        variant="frost"
        className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-white/10 p-3"
      >
        <div className="mb-8 mt-2 flex items-center gap-3 px-2">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-slate-800">
            <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-white/70">
              {avatarLetter}
            </div>
          </div>
          <div className="min-w-0 flex flex-col items-start text-left">
            <span className="truncate font-semibold text-white/90" title={accountTitle}>
              {accountTitle}
            </span>
            {authed ? (
              <span className="truncate text-xs text-white/50">{accountSubtitleAuthed}</span>
            ) : (
              <p className="m-0 max-w-full truncate text-xs leading-snug text-white/50">
                Not signed in —{' '}
                <button
                  type="button"
                  className="font-medium text-blue-300 hover:text-blue-200 hover:underline"
                  title="Open the desktop sign-in overlay"
                  onClick={() => notifyFocusWelcomeAuth()}
                >
                  Welcome
                </button>{' '}
                to sign in
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                activeTab === tab.name
                  ? 'bg-blue-600/30 text-blue-400'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>
      </LiquidGlassSurface>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-900/50 p-8">
        <h1 className="text-3xl font-bold text-white/90 mb-8">{activeTab}</h1>

        {activeTab === 'Profile' && <SettingsProfilePane />}

        {activeTab === 'Accounts' && <SettingsAccountsPane />}

        {activeTab === 'Appearance' && (
          <div className="space-y-8">
            <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white/90">Accent color</h2>
              <p className="mb-4 text-sm text-white/50">
                Preview-only accent selection for the shell.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(
                  [
                    { id: 'blue' as const, label: 'Blue', className: 'bg-blue-500' },
                    { id: 'violet' as const, label: 'Violet', className: 'bg-violet-500' },
                    { id: 'cyan' as const, label: 'Cyan', className: 'bg-cyan-400' },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/[0.07]"
                  >
                    <Radio
                      name="accent"
                      checked={accent === opt.id}
                      onChange={() => setAccent(opt.id)}
                      aria-label={`Accent ${opt.label}`}
                    />
                    <span
                      className={`h-8 w-8 rounded-full border border-white/20 ${opt.className}`}
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-white/90">{opt.label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Monitor className="h-5 w-5 text-cyan-400" />
                Desktop background
              </h2>
              <p className="mb-4 text-sm text-white/50">
                Choose the animation behind the desktop. Your choice is saved in this browser.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DESKTOP_BACKGROUND_OPTIONS.map((opt) => {
                  const selected = backgroundId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBackgroundId(opt.id)}
                      className={cn(
                        'flex flex-col rounded-xl border p-4 text-left transition-colors',
                        selected
                          ? 'border-cyan-500/80 bg-cyan-950/30'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                      )}
                    >
                      <div className="mb-2 h-20 w-full overflow-hidden rounded-lg border border-white/10">
                        <DesktopBackgroundThumb id={opt.id} />
                      </div>
                      <span className="font-medium text-white/90">{opt.title}</span>
                      <span className="mt-1 text-xs text-white/45">{opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-blue-400" />
                Select a theme
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-blue-500 rounded-xl overflow-hidden cursor-pointer">
                  <div className="h-24 bg-gradient-to-br from-blue-900 to-slate-900" />
                  <div className="p-3 bg-slate-800 text-sm font-medium text-center">
                    Dark Modern
                  </div>
                </div>
                <div className="border-2 border-transparent hover:border-white/20 rounded-xl overflow-hidden cursor-pointer transition-colors">
                  <div className="h-24 bg-gradient-to-br from-blue-100 to-white" />
                  <div className="p-3 bg-slate-800 text-sm font-medium text-center text-white/70">
                    Light Clean
                  </div>
                </div>
              </div>
            </section>

            <section className="frost-glass-surface rounded-2xl border border-white/10 p-2">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl p-4 transition-colors hover:bg-white/5">
                <div>
                  <div className="font-medium text-white/90">Transparency effects</div>
                  <div className="text-sm text-white/50">
                    Windows and surfaces appear translucent
                  </div>
                </div>
                <Checkbox
                  checked={transparencyOn}
                  onChange={(e) => setTransparencyOn(e.target.checked)}
                  aria-label="Transparency effects"
                  className="border-white/30"
                />
              </label>
              <div className="mx-2 my-1 h-px bg-white/10" />
              <div className="flex items-center justify-between rounded-xl p-4 transition-colors hover:bg-white/5">
                <div>
                  <div className="font-medium text-white/90">Current accent</div>
                  <div className="text-sm capitalize text-white/50">{accent}</div>
                </div>
                <div
                  className={cn(
                    'h-6 w-6 rounded-full border-2 border-white/20',
                    accent === 'blue' && 'bg-blue-500',
                    accent === 'violet' && 'bg-violet-500',
                    accent === 'cyan' && 'bg-cyan-400'
                  )}
                />
              </div>
            </section>

            <section className="frost-glass-surface rounded-2xl border border-white/10 p-4">
              <h3 className="mb-3 text-sm font-medium text-white/80">
                Liquid glass intensity (preview)
              </h3>
              <Progress value={72} max={100} className="mb-2" />
              <p className="text-xs text-white/45">Visual-only demo bar using theme tokens.</p>
            </section>
          </div>
        )}

        {activeTab === 'Agents & models' && (
          <div className="space-y-6">
            <Tabs value={agentsTab} onValueChange={setAgentsTab} variant="pill" className="w-full">
              <TabsList className="w-full flex-wrap gap-1 bg-white/5 p-1">
                <TabsTrigger value="routing">Routing</TabsTrigger>
                <TabsTrigger value="models">Models</TabsTrigger>
              </TabsList>
              <TabsContent value="routing" className="mt-4">
                <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
                  <h2 className="mb-2 text-lg font-semibold text-white/90">Chat provider</h2>
                  <p className="mb-4 text-sm text-white/50">
                    Public build-time hint only. Never put API keys in{' '}
                    <code className="rounded bg-black/40 px-1">NEXT_PUBLIC_*</code>.
                  </p>
                  <p className="rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-sm text-cyan-200">
                    {chatProvider}
                  </p>
                </section>
              </TabsContent>
              <TabsContent value="models" className="mt-4">
                <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
                  <h2 className="mb-2 text-lg font-semibold text-white/90">Models</h2>
                  <p className="text-sm text-white/50">
                    Model lists are loaded from the gateway when apps connect. Open Chat or Metrics
                    for live catalogs.
                  </p>
                </section>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {activeTab === 'AI providers' && <SettingsAiProvidersPane />}

        {activeTab === 'Default apps' && <SettingsDefaultAppsPane />}

        {activeTab === 'System health' && (
          <div className="space-y-6">
            <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white/90">API health</h2>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                    overall === 'online' && 'bg-emerald-500/20 text-emerald-300',
                    overall === 'degraded' && 'bg-amber-500/20 text-amber-200',
                    overall === 'offline' && 'bg-red-500/20 text-red-200'
                  )}
                >
                  {loading ? 'loading' : overall}
                </span>
              </div>
              {error ? (
                <p className="text-sm text-red-300">
                  Could not reach GraphQL health: {error.message}
                </p>
              ) : null}
              <Progress
                variant="linear"
                value={loading ? 35 : overall === 'online' ? 100 : overall === 'degraded' ? 66 : 25}
                max={100}
                className="mb-4"
              />
              <button
                type="button"
                className="mb-4 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/15"
                onClick={() => void refetch()}
              >
                Refresh
              </button>
              <pre className="overflow-auto rounded-lg border border-white/10 bg-black/50 p-3 text-[11px] text-slate-300">
                {JSON.stringify(raw ?? {}, null, 2)}
              </pre>
            </section>
          </div>
        )}

        {activeTab === 'Backend & session' && (
          <div className="space-y-6">
            <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
              <h2 className="mb-2 text-lg font-semibold text-white/90">GraphQL endpoint</h2>
              <p className="mb-3 text-sm text-white/50">
                Direct HTTP URL to ai.backend for{' '}
                <code className="rounded bg-black/40 px-1">POST /graphql</code> (not proxied through
                Next).
              </p>
              <p className="break-all rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-cyan-200/90">
                {graphqlUrl}
              </p>
            </section>
            <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-white/90">Readiness</h2>
                <button
                  type="button"
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/15"
                  onClick={() => void readyQ.refetch()}
                >
                  Re-check systemReady
                </button>
              </div>
              {readyQ.loading ? (
                <p className="text-sm text-white/50">Loading…</p>
              ) : readyQ.error ? (
                <p className="text-sm text-red-300">{readyQ.error.message}</p>
              ) : (
                <pre className="overflow-auto rounded-lg border border-white/10 bg-black/50 p-3 text-[11px] text-slate-300">
                  {JSON.stringify(readyQ.data?.systemReady ?? {}, null, 2)}
                </pre>
              )}
            </section>
            <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
              <h2 className="mb-2 text-lg font-semibold text-white/90">Session</h2>
              <p className="mb-4 text-sm text-white/50">
                Auth tokens for the gateway are stored in this browser after sign-in (same keys as
                Apollo Bearer). HttpOnly cookies on the Next origin control the welcome overlay;
                both should show Yes when signed in.
              </p>
              <SettingsSessionSummary />
            </section>
          </div>
        )}

        {activeTab === 'More (coming soon)' && (
          <div className="space-y-4">
            <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
              <h2 className="mb-3 text-lg font-semibold text-white/90">Planned panes</h2>
              <p className="mb-4 text-sm text-white/50">
                The following classic settings areas are not wired yet. They stay grouped here to
                reduce noise in the sidebar.
              </p>
              <ul className="space-y-2 text-sm text-white/70">
                {[
                  'Network & internet',
                  'Bluetooth & devices',
                  'Display',
                  'Power & battery',
                  'Privacy & security',
                  'Notifications',
                ].map((label) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                  >
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {!SETTINGS_TABS_WITH_PANES.includes(activeTab) && (
          <SettingsConstructionFallback activeTab={activeTab} />
        )}
      </div>
    </div>
  );
}
