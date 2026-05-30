export const MAX_CSV_IMPORT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GiB (must match backend)

export const DB_STORAGE_KEY = 'vsql_db_id';
export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;
export const VIDEO_FPS_DEFAULT = 30;
export const HOUR_FRAMES = 60 * 60 * VIDEO_FPS_DEFAULT;

export const viewItems = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Workspace summary',
  },
  {
    id: 'sql',
    label: 'SQL Terminal',
    description: 'Run SQL and inspect results',
  },
  {
    id: 'tableExplorer',
    label: 'Table Explorer',
    description: 'Browse schema and edit rows',
  },
  {
    id: 'search',
    label: 'Durgas Search',
    description: 'Elasticsearch-style console',
  },
  {
    id: 'visualizer',
    label: 'Pixel Inspector',
    description: 'Inspect encoded frames',
  },
  {
    id: 'performance',
    label: 'Performance log',
    description: 'Encode/decode timings and storage snapshot',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Encoding options',
  },
  {
    id: 'feedback',
    label: 'Feedback',
    description: 'User experience submissions',
  },
] as const;
