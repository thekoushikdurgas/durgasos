/**
 * Generates PWA / store icons from `public/favicon.svg`.
 * Run: `npm run icons:generate`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'public', 'favicon.svg');
const outDir = path.join(root, 'public', 'icons');

async function main() {
  const sharp = (await import('sharp')).default;
  if (!fs.existsSync(svgPath)) {
    console.error('[icons] Missing public/favicon.svg');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const buf = fs.readFileSync(svgPath);
  await sharp(buf).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'));
  await sharp(buf).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'));
  console.log('[icons] Wrote public/icons/icon-192.png and icon-512.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
