/**
 * Unified Environment Detection
 * Combines API provider key detection and CLI backend availability
 * into a single EnvironmentReport.
 */

import { PROVIDER_ENV_VARS } from '../providers/env-vars.js';
import { detectCliBackends, type DetectedCli } from './cli-detect.js';

export interface ApiProviderStatus {
  provider: string;
  envVar: string;
  available: boolean;
}

export interface EnvironmentReport {
  apiProviders: ApiProviderStatus[];
  cliBackends: DetectedCli[];
}

/**
 * Detect the full environment: API provider keys + CLI backends.
 *
 * - Iterates PROVIDER_ENV_VARS and checks process.env for each.
 * - Runs detectCliBackends() in parallel with the env-var scan.
 * - Never throws — always returns a complete report.
 */
export async function detectEnvironment(): Promise<EnvironmentReport> {
  const [cliBackends] = await Promise.all([detectCliBackends()]);

  const apiProviders: ApiProviderStatus[] = Object.entries(PROVIDER_ENV_VARS)
    .map(([provider, envVar]) => ({
      provider,
      envVar,
      available: Boolean(process.env[envVar]),
    }))
    .sort((a, b) => a.provider.localeCompare(b.provider));

  return { apiProviders, cliBackends };
}
