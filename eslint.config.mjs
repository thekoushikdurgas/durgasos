import { defineConfig } from 'eslint/config';
import next from 'eslint-config-next';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  {
    // Build output, vendor trees, generated GraphQL, and native shells are not linted.
    ignores: [
      '.next/**',
      'node_modules/**',
      'node_modules_broken_*/**',
      'reports/**',
      'coverage/**',
      'out/**',
      'graphql/generated/**',
      'dist-electron/**',
      'android/**',
      'ios/**',
    ],
  },
  {
    extends: [...next],
  },
  {
    files: ['electron/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
]);
