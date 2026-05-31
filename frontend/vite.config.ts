import { defineConfig } from 'vitest/config';

// Project pages are served from https://<user>.github.io/<repo>/, so the
// production base must match the repository name. Dev/preview stay at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/MAD/' : '/',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
