import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@codeagora/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@codeagora/core': path.resolve(__dirname, 'packages/core/src'),
      '@codeagora/github': path.resolve(__dirname, 'packages/github/src'),
      '@codeagora/notifications': path.resolve(__dirname, 'packages/notifications/src'),
      '@codeagora/cli': path.resolve(__dirname, 'packages/cli/src'),
      '@codeagora/tui': path.resolve(__dirname, 'packages/tui/src'),
      // Deduplicate React/Ink to prevent "multiple copies of React" in monorepo
      'react': path.resolve(__dirname, 'node_modules/react'),
      'ink': path.resolve(__dirname, 'node_modules/ink'),
      'ink-select-input': path.resolve(__dirname, 'node_modules/ink-select-input'),
    },
  },
  test: {
    globals: true,
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.tsx'],
    poolMatchGlobs: [
      ['**/e2e-*.test.ts', 'forks'],
    ],
    deps: {
      // Inline @codeagora/* so vi.mock intercepts across alias/relative import paths
      inline: [/@codeagora\//],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['src/tests/**', 'packages/tui/**'],
    },
  },
});
