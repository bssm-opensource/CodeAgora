/**
 * Session Detail API Tests
 * Tests for loadSessionDiscussions(), parseRoundMarkdown(), loadSessionDiff(),
 * and head-verdict.json loading introduced in PR #182.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { sessionRoutes } from '../../src/server/routes/sessions.js';

// ============================================================================
// Mock fs/promises
// ============================================================================

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

import { readdir, readFile } from 'fs/promises';

const mockReaddir = vi.mocked(readdir);
const mockReadFile = vi.mocked(readFile);

// ============================================================================
// Helpers
// ============================================================================

function makeApp(): Hono {
  const app = new Hono();
  app.route('/api/sessions', sessionRoutes);
  return app;
}

const sampleMetadata = {
  sessionId: '001',
  date: '2025-01-15',
  timestamp: 1705312800000,
  diffPath: 'test.diff',
  status: 'completed',
  startedAt: 1705312800000,
  completedAt: 1705312900000,
};

const sampleVerdictContent = JSON.stringify({ decision: 'ACCEPT', summary: 'Looks good' });

/**
 * Build a round-N.md string in the format written by packages/core/src/l2/writer.ts.
 */
function makeRoundMd(roundNum: number, supporters: Array<{ id: string; stance: string; response: string }>): string {
  const lines: string[] = [`# Round ${roundNum}`, '## Moderator Prompt', `Prompt for round ${roundNum}`, '## Supporter Responses'];
  for (const s of supporters) {
    lines.push(`### ${s.id} (${s.stance})`);
    lines.push(s.response);
  }
  return lines.join('\n');
}

/**
 * Build a verdict.md string matching the format expected by the parser.
 */
function makeVerdictMd(severity: string, consensus: 'Yes' | 'No', rounds: number, reasoning: string): string {
  return [
    `**Final Severity:** ${severity}`,
    `**Consensus Reached:** ${consensus}`,
    `**Rounds:** ${rounds}`,
    '## Reasoning',
    reasoning,
  ].join('\n');
}

// ============================================================================
// Session detail API — rounds field
// ============================================================================

describe('GET /api/sessions/:date/:id — rounds field', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should include rounds field in session detail response', async () => {
    const app = makeApp();

    const roundMd = makeRoundMd(1, [
      { id: 'supporter-1', stance: 'AGREE', response: 'I agree with the issue.' },
    ]);
    const verdictMd = makeVerdictMd('WARNING', 'Yes', 1, 'Minor issue found.');

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(sampleMetadata);
      if (p.includes('head-verdict.json')) return sampleVerdictContent;
      if (p.includes('round-1.md')) return roundMd;
      if (p.includes('verdict.md')) return verdictMd;
      if (p.includes('test.diff')) return 'diff --git a/foo.ts b/foo.ts\n+added line';
      return '{}';
    });

    mockReaddir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      // reviews/ dir — empty
      if (p.endsWith('/reviews')) return [] as unknown as ReturnType<typeof readdir>;
      // discussions/ dir — one discussion
      if (p.endsWith('/discussions')) return ['disc-001'] as unknown as ReturnType<typeof readdir>;
      // disc-001 dir — one round file + verdict.md
      if (p.endsWith('/disc-001')) return ['round-1.md', 'verdict.md'] as unknown as ReturnType<typeof readdir>;
      return [] as unknown as ReturnType<typeof readdir>;
    });

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('rounds');
    expect(typeof body.rounds).toBe('object');
    expect(body.rounds).toHaveProperty('disc-001');
    expect(Array.isArray(body.rounds['disc-001'])).toBe(true);
    expect(body.rounds['disc-001']).toHaveLength(1);
    expect(body.rounds['disc-001'][0].round).toBe(1);
  });

  it('should return empty rounds object when discussions directory is missing', async () => {
    const app = makeApp();

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(sampleMetadata);
      if (p.includes('head-verdict.json')) return sampleVerdictContent;
      if (p.includes('test.diff')) return 'diff content';
      return '{}';
    });

    mockReaddir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      // reviews/ and discussions/ return empty (no discussions dir)
      if (p.endsWith('/reviews')) return [] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/discussions')) return [] as unknown as ReturnType<typeof readdir>;
      return [] as unknown as ReturnType<typeof readdir>;
    });

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('rounds');
    expect(body.rounds).toEqual({});
  });
});

// ============================================================================
// Session detail API — diff field
// ============================================================================

describe('GET /api/sessions/:date/:id — diff field', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should include diff field with file content when diffPath is set', async () => {
    const app = makeApp();
    const diffContent = 'diff --git a/src/index.ts b/src/index.ts\n+const x = 1;';

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(sampleMetadata);
      if (p.includes('head-verdict.json')) return sampleVerdictContent;
      if (p.endsWith('test.diff')) return diffContent;
      return '{}';
    });

    mockReaddir.mockImplementation(async () => [] as unknown as ReturnType<typeof readdir>);

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('diff');
    expect(body.diff).toBe(diffContent);
  });

  it('should return empty string for diff when diff file does not exist', async () => {
    const app = makeApp();

    // Metadata has diffPath but the actual file read throws ENOENT
    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(sampleMetadata);
      if (p.includes('head-verdict.json')) return sampleVerdictContent;
      // diff file read throws
      if (p.endsWith('test.diff')) throw new Error('ENOENT: no such file');
      return '{}';
    });

    mockReaddir.mockImplementation(async () => [] as unknown as ReturnType<typeof readdir>);

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('diff');
    expect(body.diff).toBe('');
  });

  it('should return empty string for diff when diffPath is empty', async () => {
    const app = makeApp();
    const metadataWithNoDiff = { ...sampleMetadata, diffPath: '' };

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(metadataWithNoDiff);
      if (p.includes('head-verdict.json')) return sampleVerdictContent;
      return '{}';
    });

    mockReaddir.mockImplementation(async () => [] as unknown as ReturnType<typeof readdir>);

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.diff).toBe('');
  });
});

// ============================================================================
// parseRoundMarkdown — tested via the API response
// ============================================================================

describe('parseRoundMarkdown — via session detail API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should parse moderatorPrompt correctly from round-N.md', async () => {
    const app = makeApp();

    const roundMd = [
      '# Round 1',
      '## Moderator Prompt',
      'Please discuss the null pointer dereference.',
      '## Supporter Responses',
      '### reviewer-1 (AGREE)',
      'This is definitely a bug.',
    ].join('\n');

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(sampleMetadata);
      if (p.includes('head-verdict.json')) return sampleVerdictContent;
      if (p.includes('round-1.md')) return roundMd;
      if (p.includes('test.diff')) return '';
      return '{}';
    });

    mockReaddir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      if (p.endsWith('/reviews')) return [] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/discussions')) return ['disc-001'] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/disc-001')) return ['round-1.md'] as unknown as ReturnType<typeof readdir>;
      return [] as unknown as ReturnType<typeof readdir>;
    });

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    const round = body.rounds['disc-001'][0];
    expect(round.moderatorPrompt).toBe('Please discuss the null pointer dereference.');
  });

  it('should parse supporter responses with stance from round-N.md', async () => {
    const app = makeApp();

    const roundMd = [
      '# Round 2',
      '## Moderator Prompt',
      'Reassess after initial feedback.',
      '## Supporter Responses',
      '### reviewer-alpha (agree)',
      'I now agree this is a problem.',
      '### reviewer-beta (disagree)',
      'I still think it is fine.',
    ].join('\n');

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(sampleMetadata);
      if (p.includes('head-verdict.json')) return sampleVerdictContent;
      if (p.includes('round-2.md')) return roundMd;
      if (p.includes('test.diff')) return '';
      return '{}';
    });

    mockReaddir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      if (p.endsWith('/reviews')) return [] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/discussions')) return ['disc-001'] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/disc-001')) return ['round-2.md'] as unknown as ReturnType<typeof readdir>;
      return [] as unknown as ReturnType<typeof readdir>;
    });

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    const round = body.rounds['disc-001'][0];
    expect(round.round).toBe(2);
    expect(round.supporterResponses).toHaveLength(2);

    const alpha = round.supporterResponses.find((r: { supporterId: string }) => r.supporterId === 'reviewer-alpha');
    const beta = round.supporterResponses.find((r: { supporterId: string }) => r.supporterId === 'reviewer-beta');

    expect(alpha).toBeDefined();
    expect(alpha.stance).toBe('agree');
    expect(alpha.response).toBe('I now agree this is a problem.');

    expect(beta).toBeDefined();
    expect(beta.stance).toBe('disagree');
    expect(beta.response).toBe('I still think it is fine.');
  });

  it('should default to neutral stance for unrecognized stance labels', async () => {
    const app = makeApp();

    const roundMd = [
      '# Round 1',
      '## Moderator Prompt',
      'Discuss.',
      '## Supporter Responses',
      '### reviewer-1 (UNSURE)',
      'Not certain.',
    ].join('\n');

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(sampleMetadata);
      if (p.includes('head-verdict.json')) return sampleVerdictContent;
      if (p.includes('round-1.md')) return roundMd;
      if (p.includes('test.diff')) return '';
      return '{}';
    });

    mockReaddir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      if (p.endsWith('/reviews')) return [] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/discussions')) return ['disc-001'] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/disc-001')) return ['round-1.md'] as unknown as ReturnType<typeof readdir>;
      return [] as unknown as ReturnType<typeof readdir>;
    });

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    const round = body.rounds['disc-001'][0];
    expect(round.supporterResponses[0].stance).toBe('neutral');
  });

  it('should sort multiple round files in ascending order', async () => {
    const app = makeApp();

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(sampleMetadata);
      if (p.includes('head-verdict.json')) return sampleVerdictContent;
      if (p.includes('round-1.md')) return makeRoundMd(1, [{ id: 's1', stance: 'disagree', response: 'R1' }]);
      if (p.includes('round-2.md')) return makeRoundMd(2, [{ id: 's1', stance: 'agree', response: 'R2' }]);
      if (p.includes('round-3.md')) return makeRoundMd(3, [{ id: 's1', stance: 'agree', response: 'R3' }]);
      if (p.includes('test.diff')) return '';
      return '{}';
    });

    // Readdir returns files out of order to verify sorting
    mockReaddir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      if (p.endsWith('/reviews')) return [] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/discussions')) return ['disc-001'] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/disc-001')) return ['round-3.md', 'round-1.md', 'round-2.md'] as unknown as ReturnType<typeof readdir>;
      return [] as unknown as ReturnType<typeof readdir>;
    });

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    const rounds = body.rounds['disc-001'];
    expect(rounds).toHaveLength(3);
    expect(rounds[0].round).toBe(1);
    expect(rounds[1].round).toBe(2);
    expect(rounds[2].round).toBe(3);
  });
});

// ============================================================================
// head-verdict.json filename
// ============================================================================

describe('GET /api/sessions/:date/:id — head-verdict.json', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should read verdict from head-verdict.json filename', async () => {
    const app = makeApp();

    const verdictData = { decision: 'REJECT', reasoning: 'Critical bugs found', score: 0.2 };

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(sampleMetadata);
      if (p.includes('head-verdict.json')) return JSON.stringify(verdictData);
      if (p.includes('test.diff')) return 'diff content';
      return '{}';
    });

    mockReaddir.mockImplementation(async () => [] as unknown as ReturnType<typeof readdir>);

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('verdict');
    expect(body.verdict.decision).toBe('REJECT');
    expect(body.verdict.reasoning).toBe('Critical bugs found');
  });

  it('GET /api/sessions/:date/:id/verdict should read head-verdict.json', async () => {
    const app = makeApp();

    const verdictData = { decision: 'ACCEPT', confidence: 0.95 };

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('head-verdict.json')) return JSON.stringify(verdictData);
      return '{}';
    });

    const res = await app.request('/api/sessions/2025-01-15/001/verdict');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.decision).toBe('ACCEPT');
    expect(body.confidence).toBe(0.95);
  });

  it('GET /api/sessions/:date/:id/verdict should return 404 when head-verdict.json missing', async () => {
    const app = makeApp();

    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const res = await app.request('/api/sessions/2025-01-15/001/verdict');
    expect(res.status).toBe(404);
  });
});

// ============================================================================
// discussions field from verdict.md parsing
// ============================================================================

describe('GET /api/sessions/:date/:id — discussions field from verdict.md', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should parse verdict.md fields into discussions array', async () => {
    const app = makeApp();

    const verdictMd = makeVerdictMd('CRITICAL', 'Yes', 2, 'The issue is severe and must be fixed.');

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(sampleMetadata);
      if (p.includes('head-verdict.json')) return sampleVerdictContent;
      if (p.includes('verdict.md')) return verdictMd;
      if (p.includes('test.diff')) return '';
      return '{}';
    });

    mockReaddir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      if (p.endsWith('/reviews')) return [] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/discussions')) return ['disc-001'] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/disc-001')) return ['verdict.md'] as unknown as ReturnType<typeof readdir>;
      return [] as unknown as ReturnType<typeof readdir>;
    });

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('discussions');
    expect(Array.isArray(body.discussions)).toBe(true);
    expect(body.discussions).toHaveLength(1);

    const disc = body.discussions[0];
    expect(disc.discussionId).toBe('disc-001');
    expect(disc.finalSeverity).toBe('CRITICAL');
    expect(disc.consensusReached).toBe(true);
    expect(disc.rounds).toBe(2);
    expect(disc.reasoning).toBe('The issue is severe and must be fixed.');
  });

  it('should emit minimal discussion entry when only round files present (no verdict.md)', async () => {
    const app = makeApp();

    const roundMd = makeRoundMd(1, [{ id: 's1', stance: 'agree', response: 'Agreed.' }]);

    mockReadFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('metadata.json')) return JSON.stringify(sampleMetadata);
      if (p.includes('head-verdict.json')) return sampleVerdictContent;
      if (p.includes('round-1.md')) return roundMd;
      if (p.includes('test.diff')) return '';
      return '{}';
    });

    mockReaddir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      if (p.endsWith('/reviews')) return [] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/discussions')) return ['disc-001'] as unknown as ReturnType<typeof readdir>;
      if (p.endsWith('/disc-001')) return ['round-1.md'] as unknown as ReturnType<typeof readdir>;
      return [] as unknown as ReturnType<typeof readdir>;
    });

    const res = await app.request('/api/sessions/2025-01-15/001');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.discussions).toHaveLength(1);

    const disc = body.discussions[0];
    expect(disc.discussionId).toBe('disc-001');
    expect(disc.finalSeverity).toBe('WARNING');
    expect(disc.consensusReached).toBe(false);
    expect(disc.rounds).toBe(1);
  });
});
