import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bin =
  process.platform === 'win32'
    ? join(root, 'node_modules', '.bin', 'graphql-codegen.cmd')
    : join(root, 'node_modules', '.bin', 'graphql-codegen');

if (!existsSync(bin)) {
  console.error('graphql-codegen not found. Run: npm install');
  process.exit(1);
}

function stripGeneratedEslintDisable() {
  const genDir = join(root, 'graphql', 'generated');
  if (!existsSync(genDir)) return;
  for (const name of readdirSync(genDir)) {
    if (!name.endsWith('.ts')) continue;
    const file = join(genDir, name);
    const text = readFileSync(file, 'utf8');
    const next = text.replace(/^\/\* eslint-disable \*\/\r?\n/, '');
    if (next !== text) writeFileSync(file, next, 'utf8');
  }
}

// Windows: `.cmd` shims need a shell or spawn fails silently / returns non-zero.
const r = spawnSync(bin, ['--config', 'codegen.yml'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if ((r.status ?? 1) === 0) {
  stripGeneratedEslintDisable();
}

process.exit(r.status ?? 1);
