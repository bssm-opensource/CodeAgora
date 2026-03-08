/**
 * Bandit Store
 * Persists Thompson Sampling bandit state and review history to disk.
 * Storage: .ca/model-quality.json
 */

import type { BanditArm, ReviewRecord } from '../types/l0.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface BanditStoreData {
  version: number;
  lastUpdated: string;
  arms: Record<string, BanditArm>;
  history: ReviewRecord[];
}

// ============================================================================
// Store
// ============================================================================

const DEFAULT_STORE_PATH = path.join(process.cwd(), '.ca', 'model-quality.json');

export class BanditStore {
  private data: BanditStoreData;
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? DEFAULT_STORE_PATH;
    this.data = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      arms: {},
      history: [],
    };
  }

  async load(): Promise<void> {
    try {
      const content = await readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(content);
    } catch {
      // File doesn't exist yet — use defaults
    }
  }

  async save(): Promise<void> {
    this.data.lastUpdated = new Date().toISOString();
    const dir = path.dirname(this.filePath);
    await mkdir(dir, { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  getArm(key: string): BanditArm | undefined {
    return this.data.arms[key];
  }

  getAllArms(): Map<string, BanditArm> {
    return new Map(Object.entries(this.data.arms));
  }

  updateArm(key: string, reward: 0 | 1): void {
    const arm = this.data.arms[key] ?? {
      alpha: 1,
      beta: 1,
      reviewCount: 0,
      lastUsed: 0,
    };

    if (reward === 1) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }
    arm.reviewCount += 1;
    arm.lastUsed = Date.now();
    this.data.arms[key] = arm;
  }

  /**
   * Warm-start a new model version from an old arm's prior (50% decay).
   */
  warmStart(oldKey: string, newKey: string): void {
    const oldArm = this.data.arms[oldKey];
    if (!oldArm) return;

    this.data.arms[newKey] = {
      alpha: Math.round(oldArm.alpha * 0.5) + 1,
      beta: Math.round(oldArm.beta * 0.5) + 1,
      reviewCount: 0,
      lastUsed: Date.now(),
    };
  }

  addHistory(record: ReviewRecord): void {
    this.data.history.push(record);
  }

  getHistory(): ReviewRecord[] {
    return this.data.history;
  }

  getData(): BanditStoreData {
    return this.data;
  }
}
