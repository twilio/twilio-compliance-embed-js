import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/vitest.setup.ts'],
    environmentMatchGlobs: [
      ['tests/**/*.browser.test.ts', 'jsdom'],
      ['tests/ssr/*.node.test.ts', 'node'],
      ['tests/unit/**/*.test.ts', 'node'],
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
    },
  },
});
