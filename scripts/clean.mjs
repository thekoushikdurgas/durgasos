import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const all = process.argv.includes('--all');
const targets = ['.next', 'out', 'coverage', '.turbo'];

if (all) {
  targets.push('reports', 'tsconfig.tsbuildinfo');
}

for (const target of targets) {
  rmSync(resolve(root, target), { force: true, recursive: true });
}

console.log(`Cleaned ${targets.join(', ')}`);
