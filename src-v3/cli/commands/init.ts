/**
 * Init Command
 * Initialize CodeAgora in a project directory.
 */

import fs from 'fs/promises';
import path from 'path';
import * as p from '@clack/prompts';
import { generateMinimalTemplate } from '../../config/templates.js';
import { PROVIDER_ENV_VARS } from '../../providers/env-vars.js';
import { stringify as yamlStringify } from 'yaml';

// ============================================================================
// Types
// ============================================================================

export interface InitOptions {
  format: 'json' | 'yaml';
  force: boolean;
  baseDir: string;
}

export interface InitResult {
  created: string[];
  skipped: string[];
  warnings: string[];
}

export interface CustomConfigParams {
  provider: string;
  model: string;
  reviewerCount: number;
  discussion: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

export function generateReviewIgnore(): string {
  return [
    'node_modules/',
    'dist/',
    '.git/',
    '*.lock',
    'package-lock.json',
  ].join('\n') + '\n';
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeFile(
  filePath: string,
  content: string,
  force: boolean,
  created: string[],
  skipped: string[]
): Promise<void> {
  const exists = await fileExists(filePath);
  if (exists && !force) {
    skipped.push(filePath);
    return;
  }
  await fs.writeFile(filePath, content, 'utf-8');
  created.push(filePath);
}

// ============================================================================
// buildCustomConfig
// ============================================================================

/**
 * Build a config object from user selections (wizard or programmatic).
 */
export function buildCustomConfig(params: CustomConfigParams): object {
  const { provider, model, reviewerCount, discussion } = params;

  const agentBase = { model, backend: 'api', provider, enabled: true, timeout: 120 };

  const reviewers = Array.from({ length: reviewerCount }, (_, i) => ({
    id: `r${i + 1}`,
    label: `${provider} ${model} Reviewer ${i + 1}`,
    ...agentBase,
  }));

  return {
    reviewers,
    supporters: {
      pool: [
        { id: 's1', ...agentBase },
      ],
      pickCount: 1,
      pickStrategy: 'random',
      devilsAdvocate: {
        id: 'da',
        ...agentBase,
      },
      personaPool: ['.ca/personas/strict.md', '.ca/personas/pragmatic.md'],
      personaAssignment: 'random',
    },
    moderator: {
      model,
      backend: 'api',
      provider,
    },
    discussion: {
      maxRounds: discussion ? 4 : 0,
      registrationThreshold: {
        HARSHLY_CRITICAL: 1,
        CRITICAL: 1,
        WARNING: 2,
        SUGGESTION: null,
      },
      codeSnippetRange: 10,
    },
    errorHandling: {
      maxRetries: 2,
      forfeitThreshold: 0.7,
    },
  };
}

// ============================================================================
// Default model per provider
// ============================================================================

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  groq: 'llama-3.3-70b-versatile',
  google: 'gemini-2.0-flash',
  mistral: 'mistral-large-latest',
  openrouter: 'meta-llama/llama-3.3-70b-instruct',
  'nvidia-nim': 'meta/llama-3.1-70b-instruct',
  cerebras: 'llama3.1-70b',
  together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  xai: 'grok-beta',
};

// ============================================================================
// Public API
// ============================================================================

export async function runInit(options: InitOptions): Promise<InitResult> {
  const { format, force, baseDir } = options;
  const created: string[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];

  // Ensure .ca/ directory exists
  const caDir = path.join(baseDir, '.ca');
  await fs.mkdir(caDir, { recursive: true });

  // Config file
  const configFileName = format === 'yaml' ? 'config.yaml' : 'config.json';
  const configPath = path.join(caDir, configFileName);
  const configContent = generateMinimalTemplate(format);
  await writeFile(configPath, configContent, force, created, skipped);

  // .reviewignore
  const reviewIgnorePath = path.join(baseDir, '.reviewignore');
  const reviewIgnoreContent = generateReviewIgnore();
  await writeFile(reviewIgnorePath, reviewIgnoreContent, force, created, skipped);

  return { created, skipped, warnings };
}

export async function runInitInteractive(options: InitOptions): Promise<InitResult> {
  const { force, baseDir } = options;
  const created: string[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];

  p.intro('CodeAgora Setup');

  // Step 1: Config format
  const formatSelection = await p.select({
    message: 'Config format?',
    options: [
      { value: 'json', label: 'JSON' },
      { value: 'yaml', label: 'YAML' },
    ],
  });
  if (p.isCancel(formatSelection)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
  const format = formatSelection as 'json' | 'yaml';

  // Step 2: Provider selection — detect available API keys
  const providerOptions = Object.entries(PROVIDER_ENV_VARS).map(([name, envVar]) => ({
    value: name,
    label: `${name}${process.env[envVar] ? ' \u2713 (key detected)' : ''}`,
  }));
  const providerSelection = await p.select({
    message: 'Which provider?',
    options: providerOptions,
  });
  if (p.isCancel(providerSelection)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
  const provider = providerSelection as string;

  // Step 3: Reviewer count
  const countSelection = await p.select({
    message: 'How many reviewers?',
    options: [
      { value: '1', label: '1 (minimal)' },
      { value: '3', label: '3 (recommended)' },
      { value: '5', label: '5 (thorough)' },
    ],
    initialValue: '3',
  });
  if (p.isCancel(countSelection)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
  const reviewerCount = parseInt(countSelection as string, 10);

  // Step 4: Model name
  const defaultModel = PROVIDER_DEFAULT_MODELS[provider] ?? 'llama-3.3-70b-versatile';
  const modelSelection = await p.text({
    message: 'Model name?',
    placeholder: defaultModel,
    defaultValue: defaultModel,
  });
  if (p.isCancel(modelSelection)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
  const model = (modelSelection as string) || defaultModel;

  // Step 5: Enable discussion
  const discussionSelection = await p.confirm({
    message: 'Enable L2 discussion (multi-agent debate)?',
    initialValue: true,
  });
  if (p.isCancel(discussionSelection)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
  const discussion = discussionSelection as boolean;

  // Build config from selections
  const configData = buildCustomConfig({ provider, model, reviewerCount, discussion });

  // Ensure .ca/ directory exists
  const caDir = path.join(baseDir, '.ca');
  await fs.mkdir(caDir, { recursive: true });

  // Config file
  const configFileName = format === 'yaml' ? 'config.yaml' : 'config.json';
  const configPath = path.join(caDir, configFileName);
  const configContent = format === 'yaml'
    ? yamlStringify(configData, { lineWidth: 120 })
    : JSON.stringify(configData, null, 2);
  await writeFile(configPath, configContent, force, created, skipped);

  // .reviewignore
  const reviewIgnorePath = path.join(baseDir, '.reviewignore');
  const reviewIgnoreContent = generateReviewIgnore();
  await writeFile(reviewIgnorePath, reviewIgnoreContent, force, created, skipped);

  p.outro('Config created!');

  return { created, skipped, warnings };
}
