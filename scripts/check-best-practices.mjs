import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const thresholdIndex = process.argv.indexOf('--threshold');
const threshold = thresholdIndex >= 0 ? Number(process.argv[thresholdIndex + 1]) : 80;
const noFail = args.has('--no-fail');

const checks = [
  { name: 'Next app directory exists', pass: existsSync(join(root, 'app')) },
  { name: 'Global stylesheet exists', pass: existsSync(join(root, 'app', 'globals.css')) },
  { name: 'TypeScript config exists', pass: existsSync(join(root, 'tsconfig.json')) },
  {
    name: 'ESLint config exists',
    pass: existsSync(join(root, 'eslint.config.mjs')) || existsSync(join(root, '.eslintrc.json')),
  },
  { name: 'Environment example exists', pass: existsSync(join(root, '.env.example')) },
  { name: 'Ignore file exists', pass: existsSync(join(root, '.gitignore')) },
  { name: 'README exists', pass: existsSync(join(root, 'README.md')) },
  { name: 'No committed Next build output', pass: !existsSync(join(root, '.next')) },
  {
    name: 'Package has CI script',
    pass: readFileSync(join(root, 'package.json'), 'utf8').includes('"ci"'),
  },
  {
    name: 'Package has typecheck script',
    pass: readFileSync(join(root, 'package.json'), 'utf8').includes('"typecheck"'),
  },
];

const passed = checks.filter((check) => check.pass).length;
const score = Math.round((passed / checks.length) * 100);
const report = {
  score,
  threshold,
  passed,
  total: checks.length,
  checks,
  generatedAt: new Date().toISOString(),
};

mkdirSync(join(root, 'reports'), { recursive: true });
writeFileSync(
  join(root, 'reports', `check_report_${Date.now()}.json`),
  `${JSON.stringify(report, null, 2)}\n`
);

console.log(`Best-practices score: ${score}% (${passed}/${checks.length})`);
for (const check of checks) {
  console.log(`${check.pass ? 'OK' : 'FAIL'} ${check.name}`);
}

if (!noFail && score < threshold) {
  process.exit(1);
}
