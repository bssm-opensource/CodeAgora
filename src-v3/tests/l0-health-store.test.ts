import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HealthStore } from '../l0/health-store.js';
import fs from 'fs/promises';
import path from 'path';

const tmpDir = '/tmp/test-health-store';
const tmpFile = path.join(tmpDir, 'health.json');

beforeEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('HealthStore', () => {
  it('1. health 상태 save → load 후 복원 확인', async () => {
    const store = new HealthStore(tmpFile);
    store.recordPingResult({
      provider: 'groq',
      model: 'llama-3.3-70b',
      success: true,
      latencyMs: 120,
      timestamp: 1000,
    });
    store.recordPingResult({
      provider: 'groq',
      model: 'llama-3.3-70b',
      success: false,
      error: 'timeout',
      timestamp: 2000,
    });
    await store.save();

    const loaded = new HealthStore(tmpFile);
    await loaded.load();

    const health = loaded.getProviderHealth('groq');
    expect(health.successCount).toBe(1);
    expect(health.failureCount).toBe(1);
    expect(health.lastSuccess).toBe(1000);
    expect(health.lastFailure).toBe(2000);
  });

  it('2. recordPingResult(success) → successCount 증가', () => {
    const store = new HealthStore(tmpFile);
    store.recordPingResult({ provider: 'nim', model: 'deepseek-r1', success: true, timestamp: 500 });
    store.recordPingResult({ provider: 'nim', model: 'deepseek-r1', success: true, timestamp: 600 });

    const health = store.getProviderHealth('nim');
    expect(health.successCount).toBe(2);
    expect(health.failureCount).toBe(0);
    expect(health.lastSuccess).toBe(600);
  });

  it('3. recordPingResult(failure) → failureCount, consecutiveFailures 증가', () => {
    const store = new HealthStore(tmpFile);
    store.recordPingResult({ provider: 'openai', model: 'gpt-4o', success: false, error: 'rate limit', timestamp: 100 });
    store.recordPingResult({ provider: 'openai', model: 'gpt-4o', success: false, error: 'rate limit', timestamp: 200 });

    const health = store.getProviderHealth('openai');
    expect(health.failureCount).toBe(2);
    expect(health.consecutiveFailures).toBe(2);
    expect(health.lastFailure).toBe(200);
  });

  it('4. success 후 consecutiveFailures 리셋', () => {
    const store = new HealthStore(tmpFile);
    store.recordPingResult({ provider: 'groq', model: 'llama', success: false, timestamp: 100 });
    store.recordPingResult({ provider: 'groq', model: 'llama', success: false, timestamp: 200 });
    store.recordPingResult({ provider: 'groq', model: 'llama', success: true, timestamp: 300 });

    const health = store.getProviderHealth('groq');
    expect(health.consecutiveFailures).toBe(0);
    expect(health.successCount).toBe(1);
    expect(health.failureCount).toBe(2);
  });

  it('5. consecutiveFailures >= 3 → isHealthy: false', () => {
    const store = new HealthStore(tmpFile);
    store.recordPingResult({ provider: 'groq', model: 'llama', success: false, timestamp: 100 });
    store.recordPingResult({ provider: 'groq', model: 'llama', success: false, timestamp: 200 });

    expect(store.getProviderHealth('groq').isHealthy).toBe(true);

    store.recordPingResult({ provider: 'groq', model: 'llama', success: false, timestamp: 300 });

    expect(store.getProviderHealth('groq').isHealthy).toBe(false);
  });

  it('6. getProviderHealth 미등록 provider → 기본값 반환', () => {
    const store = new HealthStore(tmpFile);
    const health = store.getProviderHealth('unknown-provider');

    expect(health.provider).toBe('unknown-provider');
    expect(health.successCount).toBe(0);
    expect(health.failureCount).toBe(0);
    expect(health.consecutiveFailures).toBe(0);
    expect(health.isHealthy).toBe(true);
    expect(health.lastSuccess).toBeUndefined();
    expect(health.lastFailure).toBeUndefined();
  });

  it('7. isStale — 최근 기록이 maxAgeMs 이내면 false', () => {
    const store = new HealthStore(tmpFile);
    const now = Date.now();
    store.recordPingResult({ provider: 'groq', model: 'llama', success: true, timestamp: now - 1000 });

    // 1s ago, maxAge = 5s → not stale
    expect(store.isStale(5000)).toBe(false);

    // 1s ago, maxAge = 500ms → stale
    expect(store.isStale(500)).toBe(true);
  });

  it('8. 파일 없을 때 load() → 에러 없이 빈 상태', async () => {
    const store = new HealthStore(tmpFile);
    await expect(store.load()).resolves.toBeUndefined();

    expect(store.getAllHealth()).toHaveLength(0);
  });
});
