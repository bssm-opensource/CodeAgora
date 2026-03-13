/**
 * Health Store
 * Persists provider health state (success/failure records) to disk.
 * Storage: .ca/data/health.json
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface ProviderHealth {
  provider: string;
  successCount: number;
  failureCount: number;
  lastSuccess?: number;  // timestamp
  lastFailure?: number;  // timestamp
  consecutiveFailures: number;
  isHealthy: boolean;
}

export interface PingResult {
  provider: string;
  model: string;
  success: boolean;
  latencyMs?: number;
  error?: string;
  timestamp: number;
}

interface HealthStoreData {
  version: number;
  lastUpdated: string;
  providers: Record<string, StoredProviderHealth>;
}

interface StoredProviderHealth {
  successCount: number;
  failureCount: number;
  lastSuccess?: number;
  lastFailure?: number;
  consecutiveFailures: number;
}

// ============================================================================
// Store
// ============================================================================

const DEFAULT_STORE_PATH = path.join(process.cwd(), '.ca', 'data', 'health.json');
const UNHEALTHY_THRESHOLD = 3;

export class HealthStore {
  private data: HealthStoreData;
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? DEFAULT_STORE_PATH;
    this.data = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      providers: {},
    };
  }

  async load(): Promise<void> {
    try {
      const content = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(content) as HealthStoreData;
      // Basic shape validation
      if (parsed && typeof parsed === 'object' && parsed.providers) {
        this.data = parsed;
      }
    } catch {
      // File doesn't exist or is invalid — use defaults (not an error)
    }
  }

  async save(): Promise<void> {
    this.data.lastUpdated = new Date().toISOString();
    const dir = path.dirname(this.filePath);
    await mkdir(dir, { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  getProviderHealth(provider: string): ProviderHealth {
    const stored = this.data.providers[provider];
    if (!stored) {
      return {
        provider,
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        isHealthy: true,
      };
    }
    return {
      provider,
      successCount: stored.successCount,
      failureCount: stored.failureCount,
      lastSuccess: stored.lastSuccess,
      lastFailure: stored.lastFailure,
      consecutiveFailures: stored.consecutiveFailures,
      isHealthy: stored.consecutiveFailures < UNHEALTHY_THRESHOLD,
    };
  }

  getAllHealth(): ProviderHealth[] {
    return Object.keys(this.data.providers).map((p) => this.getProviderHealth(p));
  }

  recordPingResult(result: PingResult): void {
    const { provider, success, timestamp } = result;
    const stored: StoredProviderHealth = this.data.providers[provider] ?? {
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
    };

    if (success) {
      stored.successCount += 1;
      stored.lastSuccess = timestamp;
      stored.consecutiveFailures = 0;
    } else {
      stored.failureCount += 1;
      stored.lastFailure = timestamp;
      stored.consecutiveFailures += 1;
    }

    this.data.providers[provider] = stored;
  }

  isStale(maxAgeMs: number): boolean {
    const providers = Object.values(this.data.providers);
    if (providers.length === 0) {
      return true;
    }

    // Find the most recent activity across all providers
    let mostRecent = 0;
    for (const p of providers) {
      if (p.lastSuccess !== undefined && p.lastSuccess > mostRecent) {
        mostRecent = p.lastSuccess;
      }
      if (p.lastFailure !== undefined && p.lastFailure > mostRecent) {
        mostRecent = p.lastFailure;
      }
    }

    if (mostRecent === 0) {
      return true;
    }

    return Date.now() - mostRecent > maxAgeMs;
  }

  reset(): void {
    this.data = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      providers: {},
    };
  }
}
