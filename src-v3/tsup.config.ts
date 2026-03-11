import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts', 'cli/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
