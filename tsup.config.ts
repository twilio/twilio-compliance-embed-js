import { defineConfig } from 'tsup';
import pkg from './package.json' with { type: 'json' };

const iifeBase = {
  entry: { [`twilio-compliance-v${pkg.version}`]: 'src/browser.ts' },
  format: ['iife'] as const,
  dts: false,
  clean: false,
  sourcemap: true,
  platform: 'browser' as const,
  splitting: false,
  outDir: 'dist/iife',
};

export default defineConfig([
  // Config 1: ESM + CJS — persona remains external (peerDependency)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
  },
  // Config 2: IIFE non-minified — persona is inlined automatically (tsup skips
  // the external plugin for IIFE format)
  {
    ...iifeBase,
    outExtension: () => ({ js: '.js' }),
  },
  // Config 3: IIFE minified
  {
    ...iifeBase,
    minify: true,
    outExtension: () => ({ js: '.min.js' }),
  },
]);
