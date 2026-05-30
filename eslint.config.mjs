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
      // Capacitor native shells (Gradle/Kotlin/Swift) — not part of the Next TS lint surface.
      'android/**',
      'ios/**',
    ],
  },
  {
    extends: [...next],
    rules: {
      // Intentional: many apps hydrate local/remote state on mount via effects (50+ sites).
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['electron/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
]);
