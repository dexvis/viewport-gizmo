import { defineConfig } from 'tsdown';

// One build config for every dexvis plain-TypeScript library.
export default defineConfig({
  entry: ['src/index.ts'],
  // A browser library: 'neutral' adds no runtime-specific handling and keeps
  // the output extension tied to package.json "type" (index.js, index.d.ts)
  // instead of the platform-'node' default (.mjs, .d.mts).
  platform: 'neutral',
  sourcemap: true,
  // One bundled index.d.ts. No declaration maps: they point into src/, which
  // the package does not ship.
  dts: { sourcemap: false },
});
