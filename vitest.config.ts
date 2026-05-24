import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    exclude: [
      '**/node_modules/**',
      '**/node_modules_broken_*/**',
      '**/.next/**',
      '**/coverage/**',
      '**/reports/**',
    ],
  },
});
