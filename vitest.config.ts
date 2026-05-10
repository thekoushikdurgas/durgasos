import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    exclude: [
      '**/node_modules/**',
      '**/node_modules_broken_*/**',
      '**/.next/**',
      '**/coverage/**',
      '**/reports/**',
    ],
  },
});
