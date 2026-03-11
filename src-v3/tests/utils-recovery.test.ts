/**
 * Recovery Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryWithBackoff,
  retryOnError,
  isRetryableError,
  CircuitBreaker,
} from '../utils/recovery.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a function that fails a given number of times then succeeds. */
function failsThenSucceeds(failCount: number, successValue: string = 'ok') {
  let calls = 0;
  return vi.fn(async () => {
    calls++;
    if (calls <= failCount) throw new Error(`attempt ${calls} failed`);
    return successValue;
  });
}

/** Use minimal delays for all retry tests so the suite stays fast. */
const FAST_OPTIONS = { baseDelay: 1, maxDelay: 1, backoffFactor: 1 };

// ---------------------------------------------------------------------------
// retryWithBackoff
// ---------------------------------------------------------------------------

describe('retryWithBackoff', () => {
  it('returns the result immediately on first-try success', async () => {
    const fn = vi.fn(async () => 'success');
    const result = await retryWithBackoff(fn, { ...FAST_OPTIONS, maxRetries: 3 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and returns result when a later attempt succeeds', async () => {
    const fn = failsThenSucceeds(2, 'recovered');
    const result = await retryWithBackoff(fn, { ...FAST_OPTIONS, maxRetries: 3 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3); // 2 failures + 1 success
  });

  it('throws the last error when all retries are exhausted', async () => {
    const fn = vi.fn(async () => { throw new Error('persistent failure'); });
    await expect(
      retryWithBackoff(fn, { ...FAST_OPTIONS, maxRetries: 2 })
    ).rejects.toThrow('persistent failure');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('respects maxRetries: 0 — calls the function exactly once', async () => {
    const fn = vi.fn(async () => { throw new Error('fail'); });
    await expect(
      retryWithBackoff(fn, { ...FAST_OPTIONS, maxRetries: 0 })
    ).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respects maxRetries: 1 — calls the function at most twice', async () => {
    const fn = vi.fn(async () => { throw new Error('fail'); });
    await expect(
      retryWithBackoff(fn, { ...FAST_OPTIONS, maxRetries: 1 })
    ).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// retryOnError
// ---------------------------------------------------------------------------

describe('retryOnError', () => {
  it('returns result on first-try success without calling shouldRetry', async () => {
    const fn = vi.fn(async () => 'value');
    const shouldRetry = vi.fn(() => true);
    const result = await retryOnError(fn, shouldRetry, { ...FAST_OPTIONS, maxRetries: 3 });
    expect(result).toBe('value');
    expect(shouldRetry).not.toHaveBeenCalled();
  });

  it('throws immediately without retrying when shouldRetry returns false', async () => {
    const fn = vi.fn(async () => { throw new Error('not retryable'); });
    const shouldRetry = vi.fn(() => false);
    await expect(
      retryOnError(fn, shouldRetry, { ...FAST_OPTIONS, maxRetries: 3 })
    ).rejects.toThrow('not retryable');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });

  it('retries when shouldRetry returns true and eventually succeeds', async () => {
    const fn = failsThenSucceeds(1, 'done');
    const shouldRetry = vi.fn(() => true);
    const result = await retryOnError(fn, shouldRetry, { ...FAST_OPTIONS, maxRetries: 3 });
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws last error when all retries are exhausted with shouldRetry true', async () => {
    const fn = vi.fn(async () => { throw new Error('always fails'); });
    const shouldRetry = vi.fn(() => true);
    await expect(
      retryOnError(fn, shouldRetry, { ...FAST_OPTIONS, maxRetries: 2 })
    ).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

// ---------------------------------------------------------------------------
// isRetryableError
// ---------------------------------------------------------------------------

describe('isRetryableError', () => {
  it('returns true for timeout errors', () => {
    expect(isRetryableError(new Error('request timeout exceeded'))).toBe(true);
  });

  it('returns true for ETIMEDOUT errors', () => {
    expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
  });

  it('returns true for ECONNREFUSED errors', () => {
    expect(isRetryableError(new Error('ECONNREFUSED 127.0.0.1:3000'))).toBe(true);
  });

  it('returns true for rate limit errors', () => {
    expect(isRetryableError(new Error('rate limit exceeded, slow down'))).toBe(true);
  });

  it('returns true for network errors', () => {
    expect(isRetryableError(new Error('network connection lost'))).toBe(true);
  });

  it('returns false for a generic application error', () => {
    expect(isRetryableError(new Error('validation failed: missing field'))).toBe(false);
  });

  it('returns false for a syntax error message', () => {
    expect(isRetryableError(new Error('SyntaxError: unexpected token'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker
// ---------------------------------------------------------------------------

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    // threshold=3 failures to open; timeout=50ms so HALF_OPEN is reachable
    cb = new CircuitBreaker(3, 50);
  });

  it('starts in CLOSED state', () => {
    expect(cb.getState()).toBe('CLOSED');
  });

  it('executes the function and returns its value in CLOSED state', async () => {
    const result = await cb.execute(async () => 42);
    expect(result).toBe(42);
  });

  it('increments failure count on each failure without opening prematurely', async () => {
    const failFn = async () => { throw new Error('boom'); };
    // Two failures — still under threshold of 3
    await expect(cb.execute(failFn)).rejects.toThrow();
    await expect(cb.execute(failFn)).rejects.toThrow();
    expect(cb.getState()).toBe('CLOSED');
  });

  it('transitions to OPEN state after reaching the failure threshold', async () => {
    const failFn = async () => { throw new Error('boom'); };
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failFn)).rejects.toThrow();
    }
    expect(cb.getState()).toBe('OPEN');
  });

  it('throws "Circuit breaker is OPEN" when state is OPEN and timeout not elapsed', async () => {
    const failFn = async () => { throw new Error('boom'); };
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failFn)).rejects.toThrow();
    }
    await expect(cb.execute(async () => 'value')).rejects.toThrow('Circuit breaker is OPEN');
  });

  it('transitions to HALF_OPEN after the timeout elapses', async () => {
    vi.useFakeTimers();
    try {
      const cb2 = new CircuitBreaker(3, 100);
      const failFn = async () => { throw new Error('boom'); };
      for (let i = 0; i < 3; i++) {
        await cb2.execute(failFn).catch(() => {});
      }
      expect(cb2.getState()).toBe('OPEN');

      // Advance time past the 100ms timeout
      vi.advanceTimersByTime(101);

      // Next execute call checks Date.now() vs lastFailureTime
      await cb2.execute(async () => 'probe').catch(() => {});
      // After timeout elapses the state should have moved to HALF_OPEN or CLOSED
      expect(['HALF_OPEN', 'CLOSED']).toContain(cb2.getState());
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns to CLOSED state after a successful call in HALF_OPEN', async () => {
    vi.useFakeTimers();
    try {
      const cb2 = new CircuitBreaker(3, 100);
      const failFn = async () => { throw new Error('boom'); };
      for (let i = 0; i < 3; i++) {
        await cb2.execute(failFn).catch(() => {});
      }
      vi.advanceTimersByTime(101);

      // Successful probe in HALF_OPEN → CLOSED
      const result = await cb2.execute(async () => 'recovered');
      expect(result).toBe('recovered');
      expect(cb2.getState()).toBe('CLOSED');
    } finally {
      vi.useRealTimers();
    }
  });

  it('getState() reflects the current state accurately', async () => {
    expect(cb.getState()).toBe('CLOSED');
    const failFn = async () => { throw new Error('x'); };
    for (let i = 0; i < 3; i++) {
      await cb.execute(failFn).catch(() => {});
    }
    expect(cb.getState()).toBe('OPEN');
  });
});
