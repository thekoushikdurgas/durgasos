/**
 * After `next build` with `output: 'standalone'`, Next.js expects
 * `.next/static` and `public` to live beside the standalone server.
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/output
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');
const serverJs = path.join(standalone, 'server.js');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    const st = fs.statSync(from);
    if (st.isDirectory()) copyDir(from, to);
    else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

if (!fs.existsSync(serverJs)) {
  console.warn(
    '[copy-standalone-assets] No .next/standalone/server.js — skip (run `next build` first).'
  );
  process.exit(0);
}

const standaloneNext = path.join(standalone, '.next');
fs.mkdirSync(standaloneNext, { recursive: true });
copyDir(path.join(root, '.next', 'static'), path.join(standaloneNext, 'static'));
copyDir(path.join(root, 'public'), path.join(standalone, 'public'));
console.log('[copy-standalone-assets] Copied .next/static and public into .next/standalone.');
