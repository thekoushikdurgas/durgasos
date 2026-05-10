import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const reportDir = join(root, 'reports');
const ignoredDirs = new Set(['node_modules', '.next', 'reports']);
const sourceExtensions = new Set(['.css', '.tsx', '.ts', '.jsx', '.js']);

function collectFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...collectFiles(join(dir, entry.name)));
      }
      continue;
    }

    const extension = entry.name.slice(entry.name.lastIndexOf('.'));
    const fullPath = join(dir, entry.name);
    if (entry.isFile() && sourceExtensions.has(extension) && statSync(fullPath).isFile()) {
      files.push(relative(root, fullPath));
    }
  }

  return files;
}

const files = collectFiles(root);

const lines = ['# CSS Inventory', '', `Scanned ${files.length} source files.`, ''];

for (const file of files) {
  const fullPath = join(root, file);
  const source = readFileSync(fullPath, 'utf8');
  const imports = [...source.matchAll(/@import\s+["']([^"']+)["']/g)].map((match) => match[1]);
  const inlineStyleCount = (source.match(/style=\{\{/g) ?? []).length;
  const tailwindSignals = (source.match(/\b(className|@apply|@theme)\b/g) ?? []).length;

  if (imports.length || inlineStyleCount || tailwindSignals) {
    lines.push(`## ${relative(root, fullPath)}`);
    if (imports.length) lines.push(`- imports: ${imports.join(', ')}`);
    if (inlineStyleCount) lines.push(`- inline style={{}} count: ${inlineStyleCount}`);
    if (tailwindSignals) lines.push(`- Tailwind/className signals: ${tailwindSignals}`);
    lines.push('');
  }
}

mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'css-inventory.txt'), `${lines.join('\n')}\n`);
console.log('CSS inventory written to reports/css-inventory.txt');
