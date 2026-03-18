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
      // Pin shared dependencies to root node_modules to prevent duplicates
      'react': path.resolve(__dirname, 'node_modules/react'),
      'ink': path.resolve(__dirname, 'node_modules/ink'),
      'ink-select-input': path.resolve(__dirname, 'node_modules/ink-select-input'),
      'ai': path.resolve(__dirname, 'node_modules/ai'),
      '@ai-sdk/groq': path.resolve(__dirname, 'node_modules/@ai-sdk/groq'),
      '@ai-sdk/google': path.resolve(__dirname, 'node_modules/@ai-sdk/google'),
      '@ai-sdk/openai': path.resolve(__dirname, 'node_modules/@ai-sdk/openai'),
      '@ai-sdk/openai-compatible': path.resolve(__dirname, 'node_modules/@ai-sdk/openai-compatible'),
      '@ai-sdk/anthropic': path.resolve(__dirname, 'node_modules/@ai-sdk/anthropic'),
      '@openrouter/ai-sdk-provider': path.resolve(__dirname, 'node_modules/@openrouter/ai-sdk-provider'),
      '@octokit/rest': path.resolve(__dirname, 'node_modules/@octokit/rest'),
      'zod': path.resolve(__dirname, 'node_modules/zod'),
      'yaml': path.resolve(__dirname, 'node_modules/yaml'),
    },
  },
  test: {
    globals: true,
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.tsx'],
    poolMatchGlobs: [
      ['**/e2e-*.test.ts', 'forks'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['src/tests/**', 'packages/tui/**'],
    },
  },
});
