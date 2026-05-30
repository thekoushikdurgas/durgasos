'use client';

import { Button } from '@/components/ui/button';
import { authLogin, authRegister, fetchCloudStatus } from '@/lib/vsql-api';
import { Cloud, Command, Database as DatabaseIcon, Keyboard, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FRAME_HEIGHT, FRAME_WIDTH } from './constants';
import styles from './SettingsPage.module.css';

type SettingsPageProps = {
  apiBase: string;
  dbId: string;
  encodeHourShell: boolean;
  setEncodeHourShell: (value: boolean) => void;
  videoFps: number;
  setVideoFps: (value: number) => void;
  compressionAlgorithm: 'zstd' | 'zlib';
  setCompressionAlgorithm: (value: 'zstd' | 'zlib') => void;
  compressionLevel: 'fast' | 'balanced' | 'maximum';
  setCompressionLevel: (value: 'fast' | 'balanced' | 'maximum') => void;
  onNewDatabase: () => void;
  busy: boolean;
};

export function SettingsPage({
  apiBase,
  dbId,
  encodeHourShell,
  setEncodeHourShell,
  videoFps,
  setVideoFps,
  compressionAlgorithm,
  setCompressionAlgorithm,
  compressionLevel,
  setCompressionLevel,
  onNewDatabase,
  busy,
}: SettingsPageProps) {
  const [isMac, setIsMac] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<unknown>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsMac(navigator.platform.includes('Mac'));
  }, []);

  useEffect(() => {
    void fetchCloudStatus(apiBase)
      .then(setCloudStatus)
      .catch(() => setCloudStatus(null));
  }, [apiBase]);

  const modKey = isMac ? '⌘' : 'Ctrl';

  return (
    <section className={styles.settingsPage}>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.headerPrompt}>❯</span>
          <span>SYSTEM_SETTINGS config.ini</span>
        </div>
        <div className={styles.card}>
          <section className={styles.section}>
            <h4 className={styles.sectionHeader}>
              <Settings2 className={styles.sectionIconCyan} />
              Video Encoding Parameters
            </h4>

            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Resolution</label>
                <input
                  type="text"
                  title="Video resolution"
                  value={`${FRAME_WIDTH} x ${FRAME_HEIGHT} (HD)`}
                  readOnly
                  className={styles.inputReadonly}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Frame Rate</label>
                <input
                  type="number"
                  title="Video frame rate"
                  min={1}
                  max={120}
                  value={videoFps}
                  onChange={(e) => setVideoFps(Number(e.target.value) || 30)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Codec / Container</label>
                <input
                  type="text"
                  title="Codec and container"
                  value="FFV1 / Matroska (.mkv)"
                  readOnly
                  className={styles.inputReadonly}
                />
              </div>
              <label className={styles.checkboxField}>
                <input
                  type="checkbox"
                  title="Pad export to one hour"
                  checked={encodeHourShell}
                  onChange={(e) => setEncodeHourShell(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>
                  <span className={styles.checkboxLabel}>
                    Pad export to 1 hour @ current FPS ({(60 * 60 * videoFps).toLocaleString()}{' '}
                    frames)
                  </span>
                  <span className={styles.checkboxHint}>
                    Writes {(60 * 60 * videoFps).toLocaleString()} logical frames with a black tail.
                    Turn off to keep exports smaller.
                  </span>
                </span>
              </label>
            </div>

            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="vsql-compression-algo">
                  Payload compression
                </label>
                <select
                  id="vsql-compression-algo"
                  title="Algorithm for tabular bytes before RGBA packing"
                  className={styles.input}
                  value={compressionAlgorithm}
                  onChange={(e) =>
                    setCompressionAlgorithm(e.target.value === 'zlib' ? 'zlib' : 'zstd')
                  }
                  disabled={busy}
                >
                  <option value="zstd">zstd (recommended)</option>
                  <option value="zlib">zlib (legacy)</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="vsql-compression-level">
                  Compression level
                </label>
                <select
                  id="vsql-compression-level"
                  title="Trade speed vs size on next encode"
                  className={styles.input}
                  value={compressionLevel}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'fast' || v === 'balanced' || v === 'maximum') {
                      setCompressionLevel(v);
                    }
                  }}
                  disabled={busy}
                >
                  <option value="fast">Fast (larger, quickest)</option>
                  <option value="balanced">Balanced</option>
                  <option value="maximum">Maximum (smallest, slowest)</option>
                </select>
              </div>
            </div>
            <p className={styles.fieldHint}>
              Applied when you run <strong>Encode video</strong> from the shell. zstd is typically
              3–5× faster than zlib at similar ratios.
            </p>
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionHeader}>
              <DatabaseIcon className={styles.sectionIconGreen} />
              Database Core
            </h4>

            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Engine</label>
                <input
                  type="text"
                  title="Storage engine"
                  value="Python video storage + vSQL codec"
                  readOnly
                  className={styles.inputReadonly}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Backend API</label>
                <input
                  type="text"
                  title="Backend API"
                  value={apiBase}
                  readOnly
                  className={styles.inputReadonly}
                />
              </div>
            </div>

            <div className={styles.workspaceBox}>
              <div className={styles.workspaceLabel}>Current Workspace</div>
              <div className={styles.workspaceId}>{dbId}</div>
              <Button
                type="button"
                variant="outline"
                className={styles.workspaceButton}
                onClick={onNewDatabase}
                disabled={busy}
              >
                Create New Database
              </Button>
            </div>
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionHeader}>
              <Cloud className={styles.sectionIconCyan} />
              Cloud integrations (server env)
            </h4>
            <p className={styles.hint}>
              Keys stay on the API host only. This panel shows which variables are set — never
              secret values.
            </p>
            <pre className={styles.preJson}>
              {cloudStatus ? JSON.stringify(cloudStatus, null, 2) : 'Unable to load status.'}
            </pre>
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionHeader}>
              <DatabaseIcon className={styles.sectionIconGreen} />
              Workspace auth (vSQL users table)
            </h4>
            <p className={styles.hint}>
              Registers rows in <code className={styles.inlineCode}>vsql_users</code> with bcrypt
              hashes. JWT session tokens are returned on login.
            </p>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Email</label>
                <input
                  type="email"
                  className={styles.input}
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Password (8+ chars)</label>
                <input
                  type="password"
                  className={styles.input}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>
            <div className={styles.authRow}>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setAuthMsg(null);
                    const r = await authRegister(dbId, authEmail, authPassword);
                    setAuthMsg(r.ok ? 'Registered.' : (r.message ?? 'Registration failed'));
                  })();
                }}
              >
                Register
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setAuthMsg(null);
                    const r = await authLogin(dbId, authEmail, authPassword);
                    if (r.ok && r.token) {
                      sessionStorage.setItem('vsql_jwt', r.token);
                      setAuthMsg('Logged in; JWT saved to sessionStorage.');
                    } else {
                      setAuthMsg(r.message ?? 'Login failed');
                    }
                  })();
                }}
              >
                Login
              </Button>
            </div>
            {authMsg && <p className={styles.authNote}>{authMsg}</p>}
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionHeader}>
              <Keyboard className={styles.sectionIconAmber} />
              Keyboard Shortcuts
            </h4>

            <div className={styles.shortcutsGrid}>
              <div className={styles.shortcutItem}>
                <span className={styles.shortcutName}>Command Palette</span>
                <kbd className={styles.shortcutKey}>{modKey} K</kbd>
              </div>
              <div className={styles.shortcutItem}>
                <span className={styles.shortcutName}>New Database</span>
                <span className={styles.shortcutVia}>Via Command Palette</span>
              </div>
              <div className={styles.shortcutItem}>
                <span className={styles.shortcutName}>Import CSV</span>
                <span className={styles.shortcutVia}>Via Command Palette</span>
              </div>
              <div className={styles.shortcutItem}>
                <span className={styles.shortcutName}>Table Explorer</span>
                <span className={styles.shortcutVia}>Click Tables in sidebar</span>
              </div>
              <div className={styles.shortcutItem}>
                <span className={styles.shortcutName}>SQL Terminal</span>
                <span className={styles.shortcutVia}>Click SQL in sidebar</span>
              </div>
            </div>

            <div className={styles.shortcutHint}>
              <Command className={styles.shortcutHintIcon} />
              <span>
                Press <kbd className={styles.shortcutHintKey}>{modKey} K</kbd> anywhere to open the
                command palette
              </span>
            </div>
          </section>

          <div className={styles.warningBox}>
            Lossless FFV1/Matroska storage is sensitive to transcoding. Keep vSQL MKV files as
            archive artifacts and avoid pipelines that recompress frames.
          </div>
        </div>
      </div>
    </section>
  );
}
