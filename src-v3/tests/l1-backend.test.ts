/**
 * L1 Backend Executor Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BackendInput } from '../l1/backend.js';

// ============================================================================
// Mocks
// ============================================================================

// Hoist mockExecAsync so it is available inside the vi.mock factory below.
const { mockExecAsync } = vi.hoisted(() => ({
  mockExecAsync: vi.fn(),
}));

// Mock child_process so no real subprocesses are spawned
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock util.promisify to return the hoisted mock function
vi.mock('util', () => ({
  promisify: vi.fn(() => mockExecAsync),
}));

// Mock fs/promises so no temp files are written/deleted on disk
vi.mock('fs/promises', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock the api-backend module so the 'api' branch never hits the AI SDK
vi.mock('../l1/api-backend.js', () => ({
  executeViaAISDK: vi.fn(),
}));

import { executeBackend } from '../l1/backend.js';
import { executeViaAISDK } from '../l1/api-backend.js';
import fs from 'fs/promises';

const mockExecuteViaAISDK = vi.mocked(executeViaAISDK);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockUnlink = vi.mocked(fs.unlink);

// ============================================================================
// Helpers
// ============================================================================

function makeInput(overrides: Partial<BackendInput> = {}): BackendInput {
  return {
    backend: 'opencode',
    model: 'gpt-4o',
    provider: 'openai',
    prompt: 'Review this code',
    timeout: 60,
    ...overrides,
  };
}

// ============================================================================
// 'api' backend dispatch
// ============================================================================

describe("executeBackend() with backend 'api'", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to executeViaAISDK and returns its result', async () => {
    mockExecuteViaAISDK.mockResolvedValue('api review output');

    const result = await executeBackend(makeInput({ backend: 'api' }));

    expect(mockExecuteViaAISDK).toHaveBeenCalledOnce();
    expect(result).toBe('api review output');
  });

  it('passes the full input object to executeViaAISDK', async () => {
    mockExecuteViaAISDK.mockResolvedValue('ok');

    const input = makeInput({ backend: 'api', model: 'deepseek-r1', provider: 'groq' });
    await executeBackend(input);

    expect(mockExecuteViaAISDK).toHaveBeenCalledWith(input);
  });

  it('does not write a temp file when using the api backend', async () => {
    mockExecuteViaAISDK.mockResolvedValue('ok');

    await executeBackend(makeInput({ backend: 'api' }));

    expect(mockWriteFile).not.toHaveBeenCalled();
  });
});

// ============================================================================
// CLI backends – shared exec behaviour
// ============================================================================

describe('executeBackend() CLI backends – successful execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns trimmed stdout from the subprocess', async () => {
    mockExecAsync.mockResolvedValue({ stdout: '  review output\n', stderr: '' });

    const result = await executeBackend(makeInput({ backend: 'opencode' }));

    expect(result).toBe('review output');
  });

  it('writes the prompt to a temp file before executing', async () => {
    mockExecAsync.mockResolvedValue({ stdout: 'ok', stderr: '' });

    await executeBackend(makeInput({ backend: 'codex', provider: undefined }));

    expect(mockWriteFile).toHaveBeenCalledOnce();
    const [filePath, content, encoding] = mockWriteFile.mock.calls[0] as [string, string, string];
    expect(filePath).toMatch(/^\/tmp\/prompt-.+\.txt$/);
    expect(content).toBe('Review this code');
    expect(encoding).toBe('utf-8');
  });

  it('deletes the temp file after successful execution', async () => {
    mockExecAsync.mockResolvedValue({ stdout: 'ok', stderr: '' });

    await executeBackend(makeInput({ backend: 'gemini', provider: undefined }));

    expect(mockUnlink).toHaveBeenCalledOnce();
    const [unlinkedPath] = mockUnlink.mock.calls[0] as [string];
    expect(unlinkedPath).toMatch(/^\/tmp\/prompt-.+\.txt$/);
  });

  it('passes the configured timeout (in ms) to exec', async () => {
    mockExecAsync.mockResolvedValue({ stdout: 'ok', stderr: '' });

    await executeBackend(makeInput({ backend: 'claude', timeout: 30 }));

    const [, options] = mockExecAsync.mock.calls[0] as [string, { timeout: number }];
    expect(options.timeout).toBe(30_000);
  });

  it('throws when stderr is non-empty and stdout is empty', async () => {
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: 'Something went wrong' });

    await expect(
      executeBackend(makeInput({ backend: 'opencode' }))
    ).rejects.toThrow('Backend error: Something went wrong');
  });
});

// ============================================================================
// Command builders – correct CLI commands selected
// ============================================================================

describe('executeBackend() dispatches correct CLI command per backend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecAsync.mockResolvedValue({ stdout: 'ok', stderr: '' });
  });

  it("builds an opencode command containing 'opencode run'", async () => {
    await executeBackend(makeInput({ backend: 'opencode', model: 'gpt-4o', provider: 'openai' }));

    const [command] = mockExecAsync.mock.calls[0] as [string];
    expect(command).toContain('opencode run');
    expect(command).toContain('openai/gpt-4o');
  });

  it("builds a codex command containing 'codex exec'", async () => {
    await executeBackend(makeInput({ backend: 'codex', model: 'o3', provider: undefined }));

    const [command] = mockExecAsync.mock.calls[0] as [string];
    expect(command).toContain('codex exec');
    expect(command).toContain('o3');
  });

  it("builds a gemini command containing 'gemini'", async () => {
    await executeBackend(makeInput({ backend: 'gemini', model: 'gemini-2.0-flash', provider: undefined }));

    const [command] = mockExecAsync.mock.calls[0] as [string];
    expect(command).toContain('gemini');
    expect(command).toContain('gemini-2.0-flash');
  });

  it("builds a claude command containing 'claude --non-interactive'", async () => {
    await executeBackend(makeInput({ backend: 'claude', model: 'claude-3-5-sonnet-20241022' }));

    const [command] = mockExecAsync.mock.calls[0] as [string];
    expect(command).toContain('claude --non-interactive');
    expect(command).toContain('claude-3-5-sonnet-20241022');
  });
});

// ============================================================================
// opencode backend – missing provider
// ============================================================================

describe("executeBackend() with backend 'opencode'", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when provider is missing', async () => {
    await expect(
      executeBackend(makeInput({ backend: 'opencode', provider: undefined }))
    ).rejects.toThrow('OpenCode backend requires provider parameter');
  });
});

// ============================================================================
// Unknown backend
// ============================================================================

describe('executeBackend() with unknown backend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws an unsupported backend error', async () => {
    await expect(
      executeBackend(makeInput({ backend: 'unknown' as any }))
    ).rejects.toThrow('Unsupported backend: unknown');
  });
});

// ============================================================================
// Timeout handling
// ============================================================================

describe('executeBackend() timeout handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps ETIMEDOUT error with a human-readable message', async () => {
    const timeoutError = Object.assign(new Error('Command timed out'), { code: 'ETIMEDOUT' });
    mockExecAsync.mockRejectedValue(timeoutError);

    await expect(
      executeBackend(makeInput({ backend: 'opencode', timeout: 5 }))
    ).rejects.toThrow('Backend timeout after 5s');
  });

  it('deletes the temp file even when a timeout occurs', async () => {
    const timeoutError = Object.assign(new Error('Command timed out'), { code: 'ETIMEDOUT' });
    mockExecAsync.mockRejectedValue(timeoutError);

    await expect(
      executeBackend(makeInput({ backend: 'opencode', timeout: 5 }))
    ).rejects.toThrow();

    expect(mockUnlink).toHaveBeenCalledOnce();
  });

  it('wraps generic exec errors with a Backend execution failed message', async () => {
    mockExecAsync.mockRejectedValue(new Error('spawn error'));

    await expect(
      executeBackend(makeInput({ backend: 'codex', provider: undefined }))
    ).rejects.toThrow('Backend execution failed: spawn error');
  });

  it('deletes the temp file even when a generic exec error occurs', async () => {
    mockExecAsync.mockRejectedValue(new Error('spawn error'));

    await expect(
      executeBackend(makeInput({ backend: 'codex', provider: undefined }))
    ).rejects.toThrow();

    expect(mockUnlink).toHaveBeenCalledOnce();
  });
});
