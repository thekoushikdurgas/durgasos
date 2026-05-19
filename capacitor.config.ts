import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_CAPACITOR_SERVER_URL ||
  'https://durgasos.thekoushikdurgas.ai';

const config: CapacitorConfig = {
  appId: 'ai.thekoushikdurgas.durgasos',
  appName: 'DurgasOS',
  /** Placeholder static assets; runtime UI loads from `server.url`. */
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
