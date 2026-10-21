import { defineConfig } from 'vitest/config';

const shared = {
  globals: true,
  setupFiles: ['./tests/vitest.setup.ts'],
};

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          ...shared,
          name: 'browser',
          environment: 'jsdom',
          include: ['tests/**/*.browser.test.ts'],
        },
      },
      {
        test: {
          ...shared,
          name: 'node',
          environment: 'node',
          include: ['tests/ssr/*.node.test.ts', 'tests/unit/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
    },
  },
});
