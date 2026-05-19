/**
 * Electron main process (CommonJS). Loads Next.js dev server URL in development,
 * or spawns the standalone `server.js` from `extraResources/standalone` in production.
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const waitOn = require('wait-on');

/** When true, load `next dev` / `next start` on port 3000 (see `npm run dev:electron`). */
const USE_DEV_SERVER = process.env.ELECTRON_DEV === '1';

let mainWindow = null;
let nextChild = null;

function getStandaloneRoot() {
  if (USE_DEV_SERVER) return null;
  if (app.isPackaged) return path.join(process.resourcesPath, 'standalone');
  return path.join(__dirname, '..', '.next', 'standalone');
}

function pickPort() {
  return process.env.ELECTRON_NEXT_PORT || process.env.PORT || '3040';
}

async function resolveStartUrl() {
  if (USE_DEV_SERVER) {
    await waitOn({
      resources: ['http-get://127.0.0.1:3000'],
      timeout: 120_000,
      interval: 250,
    });
    return 'http://127.0.0.1:3000';
  }

  const standaloneRoot = getStandaloneRoot();
  const serverJs = path.join(standaloneRoot, 'server.js');
  const fs = require('fs');
  if (!fs.existsSync(serverJs)) {
    const fallback = process.env.ELECTRON_FALLBACK_URL || 'https://durgasos.thekoushikdurgas.ai';
    console.warn('[electron] No bundled standalone server; loading remote URL:', fallback);
    return fallback;
  }

  const port = pickPort();
  const nodeBin = process.env.ELECTRON_NODE_PATH || 'node';
  nextChild = spawn(nodeBin, ['server.js'], {
    cwd: standaloneRoot,
    env: {
      ...process.env,
      HOSTNAME: '127.0.0.1',
      PORT: port,
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  });

  nextChild.on('error', (err) => {
    console.error('[electron] Failed to spawn Next standalone:', err);
  });

  const url = `http://127.0.0.1:${port}`;
  try {
    await waitOn({
      resources: [`http-get://${url.replace('http://', '')}`],
      timeout: 90_000,
      interval: 400,
    });
    return url;
  } catch (e) {
    console.error('[electron] Standalone server did not become ready:', e);
    const fallback = process.env.ELECTRON_FALLBACK_URL || 'https://durgasos.thekoushikdurgas.ai';
    return fallback;
  }
}

async function createWindow() {
  const startUrl = await resolveStartUrl();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'DurgasOS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  await mainWindow.loadURL(startUrl);

  if (USE_DEV_SERVER) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function stopNextChild() {
  if (nextChild && !nextChild.killed) {
    try {
      nextChild.kill('SIGTERM');
    } catch {
      // ignore
    }
    nextChild = null;
  }
}

app.whenReady().then(() => {
  ipcMain.handle('open-external', async (_evt, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      await shell.openExternal(url);
    }
  });

  createWindow().catch((err) => {
    console.error('[electron] createWindow failed', err);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopNextChild();
    app.quit();
  }
});

app.on('before-quit', () => {
  stopNextChild();
});
