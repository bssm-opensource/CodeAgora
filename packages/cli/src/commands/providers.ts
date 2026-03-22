/**
 * Providers Command
 * List supported providers and API key status.
 * Optionally enriched with models.dev catalog data and CLI backend detection.
 */

import { getSupportedProviders } from '@codeagora/core/l1/provider-registry.js';
import { getProviderEnvVar } from './doctor.js';
import { statusColor, bold, dim } from '../utils/colors.js';
import { getProviderStats, type ModelsCatalog } from '@codeagora/shared/data/models-dev.js';
import { getProviderTier, getCliBackendTier, TIER_LABELS, type ProviderTier } from '@codeagora/shared/providers/tiers.js';
import type { DetectedCli } from '@codeagora/shared/utils/cli-detect.js';

// ============================================================================
// Types
// ============================================================================

export interface ProviderInfo {
  name: string;
  apiKeyEnvVar: string;
  apiKeySet: boolean;
  tier: ProviderTier;
  modelCount?: number;
  freeModelCount?: number;
}

// ============================================================================
// Public API
// ============================================================================

export function listProviders(catalog?: ModelsCatalog): ProviderInfo[] {
  const providers = getSupportedProviders().map((name) => {
    const apiKeyEnvVar = getProviderEnvVar(name);
    const info: ProviderInfo = {
      name,
      apiKeyEnvVar,
      apiKeySet: Boolean(process.env[apiKeyEnvVar]),
      tier: getProviderTier(name),
    };

    if (catalog) {
      const stats = getProviderStats(catalog, name);
      if (stats) {
        info.modelCount = stats.total;
        info.freeModelCount = stats.free;
      }
    }

    return info;
  });

  // Sort by tier (1 first), then by name
  return providers.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

export function formatProviderList(providers: ProviderInfo[], cliBackends?: DetectedCli[]): string {
  const COL_PROVIDER = 14;
  const COL_TIER = 14;
  const COL_KEY = 22;
  const COL_MODELS = 8;
  const COL_FREE = 6;

  const hasCatalog = providers.some((p) => p.modelCount !== undefined);

  // Build header
  let header = 'Provider'.padEnd(COL_PROVIDER) + 'Tier'.padEnd(COL_TIER) + 'API Key'.padEnd(COL_KEY);
  if (hasCatalog) {
    header += 'Models'.padEnd(COL_MODELS) + 'Free'.padEnd(COL_FREE);
  }
  header += 'Status';

  const dividerLen = COL_PROVIDER + COL_TIER + COL_KEY + 10 + (hasCatalog ? COL_MODELS + COL_FREE : 0);
  const divider = '\u2500'.repeat(dividerLen);

  let lastTier: ProviderTier | null = null;
  const rows: string[] = [];

  for (const p of providers) {
    // Add separator between tiers
    if (lastTier !== null && p.tier !== lastTier) {
      rows.push('');
    }
    lastTier = p.tier;

    const paddedName = p.name.padEnd(COL_PROVIDER);
    const tierLabel = TIER_LABELS[p.tier].label;
    const tierCol = p.tier === 1
      ? statusColor.pass(tierLabel.padEnd(COL_TIER))
      : p.tier === 2 ? tierLabel.padEnd(COL_TIER)
      : dim(tierLabel.padEnd(COL_TIER));
    const keyText = `${p.apiKeySet ? '\u2713' : '\u2717'} ${p.apiKeyEnvVar}`.padEnd(COL_KEY);
    const keyDisplay = p.apiKeySet ? statusColor.pass(keyText) : statusColor.fail(keyText);
    const status = p.apiKeySet ? 'available' : 'no key';

    let modelCols = '';
    if (hasCatalog) {
      const modelStr = (p.modelCount !== undefined ? String(p.modelCount) : '-').padEnd(COL_MODELS);
      const freeStr = (p.freeModelCount !== undefined ? String(p.freeModelCount) : '-').padEnd(COL_FREE);
      modelCols = modelStr + freeStr;
    }

    rows.push(bold(paddedName) + tierCol + keyDisplay + modelCols + status);
  }

  const sections: string[] = [header, divider, ...rows];

  // CLI backends section
  if (cliBackends && cliBackends.length > 0) {
    sections.push('');
    sections.push(formatCliBackends(cliBackends));
  }

  return sections.join('\n');
}

// ============================================================================
// CLI Backends Formatter
// ============================================================================

export function formatCliBackends(backends: DetectedCli[]): string {
  const COL_NAME = 16;
  const COL_TIER = 14;
  const COL_BINARY = 16;

  const header =
    'CLI Backends'.padEnd(COL_NAME) +
    'Tier'.padEnd(COL_TIER) +
    'Binary'.padEnd(COL_BINARY) +
    'Status';
  const divider = '\u2500'.repeat(COL_NAME + COL_TIER + COL_BINARY + 14);

  // Sort by tier
  const sorted = [...backends].sort((a, b) => getCliBackendTier(a.backend) - getCliBackendTier(b.backend));

  const rows = sorted.map((b) => {
    const tier = getCliBackendTier(b.backend);
    const tierLabel = TIER_LABELS[tier].label;
    const nameCol = b.backend.padEnd(COL_NAME);
    const tierCol = tier === 1
      ? statusColor.pass(tierLabel.padEnd(COL_TIER))
      : tier === 2 ? tierLabel.padEnd(COL_TIER)
      : dim(tierLabel.padEnd(COL_TIER));
    const binaryCol = b.bin.padEnd(COL_BINARY);
    const statusIcon = b.available ? '\u2713' : '\u2717';
    const statusText = b.available ? 'available' : 'not found';
    const statusDisplay = b.available
      ? statusColor.pass(`${statusIcon} ${statusText}`)
      : statusColor.fail(`${statusIcon} ${statusText}`);
    return dim(nameCol) + tierCol + dim(binaryCol) + statusDisplay;
  });

  return [header, divider, ...rows].join('\n');
}
