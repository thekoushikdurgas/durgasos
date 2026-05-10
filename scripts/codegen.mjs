import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
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

// Windows: `.cmd` shims need a shell or spawn fails silently / returns non-zero.
const r = spawnSync(bin, ['--config', 'codegen.yml'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(r.status ?? 1);
