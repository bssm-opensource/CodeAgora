/**
 * Session API Routes
 * CRUD operations for review session data stored in .ca/sessions/.
 */

import { Hono } from 'hono';
import path from 'path';
import type { SessionMetadata } from '@codeagora/core/types/core.js';
import { readJsonSafe, readFileSafe, readdirSafe } from '../utils/fs-helpers.js';

const CA_ROOT = '.ca';

export const sessionRoutes = new Hono();

/**
 * GET /api/sessions — List all sessions from .ca/sessions/ directory tree.
 */
sessionRoutes.get('/', async (c) => {
  const sessionsDir = path.join(CA_ROOT, 'sessions');
  const dateDirs = await readdirSafe(sessionsDir);

  const sessions: SessionMetadata[] = [];

  for (const dateDir of dateDirs) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateDir)) continue;

    const datePath = path.join(sessionsDir, dateDir);
    const sessionIds = await readdirSafe(datePath);

    for (const sessionId of sessionIds) {
      if (!/^\d{3}$/.test(sessionId)) continue;

      const metadataPath = path.join(datePath, sessionId, 'metadata.json');
      const metadata = await readJsonSafe<SessionMetadata>(metadataPath);

      if (metadata) {
        sessions.push(metadata);
      }
    }
  }

  return c.json(sessions);
});

/**
 * GET /api/sessions/:date/:id — Get single session detail.
 */
sessionRoutes.get('/:date/:id', async (c) => {
  const { date, id } = c.req.param();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{3}$/.test(id)) {
    return c.json({ error: 'Invalid session identifier' }, 400);
  }

  const sessionDir = path.join(CA_ROOT, 'sessions', date, id);
  const metadata = await readJsonSafe<SessionMetadata>(path.join(sessionDir, 'metadata.json'));

  if (!metadata) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const reviews = await loadSessionReviews(sessionDir);
  const discussions = await loadSessionDiscussions(sessionDir);
  const rounds = await loadSessionRounds(sessionDir);
  const verdict = await readJsonSafe(path.join(sessionDir, 'head-verdict.json'))
    ?? await readJsonSafe(path.join(sessionDir, 'verdict.json'));

  // Load diff content if metadata has diffPath
  let diff = '';
  if (metadata.diffPath) {
    diff = await readFileSafe(metadata.diffPath) ?? '';
  }

  return c.json({ metadata, reviews, discussions, rounds, verdict, diff });
});

/**
 * GET /api/sessions/:date/:id/reviews — Get review outputs for a session.
 */
sessionRoutes.get('/:date/:id/reviews', async (c) => {
  const { date, id } = c.req.param();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{3}$/.test(id)) {
    return c.json({ error: 'Invalid session identifier' }, 400);
  }

  const sessionDir = path.join(CA_ROOT, 'sessions', date, id);
  const reviews = await loadSessionReviews(sessionDir);
  return c.json(reviews);
});

/**
 * GET /api/sessions/:date/:id/discussions — Get discussion rounds and verdicts.
 */
sessionRoutes.get('/:date/:id/discussions', async (c) => {
  const { date, id } = c.req.param();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{3}$/.test(id)) {
    return c.json({ error: 'Invalid session identifier' }, 400);
  }

  const sessionDir = path.join(CA_ROOT, 'sessions', date, id);
  const discussions = await loadSessionDiscussions(sessionDir);
  return c.json(discussions);
});

/**
 * GET /api/sessions/:date/:id/verdict — Get head verdict.
 */
sessionRoutes.get('/:date/:id/verdict', async (c) => {
  const { date, id } = c.req.param();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{3}$/.test(id)) {
    return c.json({ error: 'Invalid session identifier' }, 400);
  }

  const sessionDir = path.join(CA_ROOT, 'sessions', date, id);
  const verdict = await readJsonSafe(path.join(sessionDir, 'head-verdict.json'))
    ?? await readJsonSafe(path.join(sessionDir, 'verdict.json'));

  if (!verdict) {
    return c.json({ error: 'Verdict not found' }, 404);
  }

  return c.json(verdict);
});

/**
 * Load all review JSON files from a session's reviews/ directory.
 */
async function loadSessionReviews(sessionDir: string): Promise<Record<string, unknown>[]> {
  const reviewsDir = path.join(sessionDir, 'reviews');
  const files = await readdirSafe(reviewsDir);
  const reviews: Record<string, unknown>[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const data = await readJsonSafe<Record<string, unknown>>(path.join(reviewsDir, file));
    if (data) reviews.push(data);
  }

  return reviews;
}

/**
 * Load discussions from a session's discussions/ directory.
 * Supports both JSON files and subdirectory-based discussions (verdict.md + round-N.md).
 */
async function loadSessionDiscussions(sessionDir: string): Promise<Record<string, unknown>[]> {
  const discussionsDir = path.join(sessionDir, 'discussions');
  const entries = await readdirSafe(discussionsDir);
  const discussions: Record<string, unknown>[] = [];

  for (const entry of entries) {
    const entryPath = path.join(discussionsDir, entry);

    if (entry.endsWith('.json')) {
      // Legacy: JSON file in discussions/
      const data = await readJsonSafe<Record<string, unknown>>(entryPath);
      if (data) discussions.push(data);
      continue;
    }

    // Subdirectory-based discussion (e.g. disc-001/)
    if (entry.includes('.')) continue; // skip dotfiles or files with extensions
    const subFiles = await readdirSafe(entryPath);
    if (subFiles.length === 0) continue;

    const disc: Record<string, unknown> = { discussionId: entry };

    // Parse verdict.md if present
    if (subFiles.includes('verdict.md')) {
      const content = await readFileSafe(path.join(entryPath, 'verdict.md'));
      if (content) {
        const severity = content.match(/\*\*Final Severity:\*\*\s*(\w+)/)?.[1] ?? 'WARNING';
        const consensus = content.match(/\*\*Consensus Reached:\*\*\s*(Yes|No)/)?.[1] === 'Yes';
        const rounds = parseInt(content.match(/\*\*Rounds:\*\*\s*(\d+)/)?.[1] ?? '0', 10);
        const reasoning = content.match(/## Reasoning\n([\s\S]*?)$/)?.[1]?.trim() ?? '';
        Object.assign(disc, { finalSeverity: severity, consensusReached: consensus, rounds, reasoning });
      }
    } else {
      // Count round files as fallback
      const roundFiles = subFiles.filter((f) => /^round-\d+\.md$/.test(f));
      Object.assign(disc, { finalSeverity: 'WARNING', consensusReached: false, rounds: roundFiles.length });
    }

    discussions.push(disc);
  }

  return discussions;
}

/**
 * Parse a round-N.md file into structured data.
 */
function parseRoundMarkdown(content: string): {
  round: number;
  moderatorPrompt: string;
  supporterResponses: Array<{ supporterId: string; stance: string; response: string }>;
} {
  const roundMatch = content.match(/^# Round (\d+)/m);
  const round = roundMatch ? parseInt(roundMatch[1]!, 10) : 0;

  const promptMatch = content.match(/## Moderator Prompt\n([\s\S]*?)(?=\n## |$)/);
  const moderatorPrompt = promptMatch?.[1]?.trim() ?? '';

  const supporterResponses: Array<{ supporterId: string; stance: string; response: string }> = [];
  const supporterRegex = /### (\S+) \((\w+)\)\n([\s\S]*?)(?=\n### |\n## |$)/g;
  let m;
  while ((m = supporterRegex.exec(content)) !== null) {
    const stance = m[2]!.toLowerCase();
    supporterResponses.push({
      supporterId: m[1]!,
      stance: ['agree', 'disagree'].includes(stance) ? stance : 'neutral',
      response: m[3]!.trim(),
    });
  }

  return { round, moderatorPrompt, supporterResponses };
}

/**
 * Load parsed round-N.md files from each discussion subdirectory.
 * Returns { [discussionId]: ParsedRound[] }
 */
async function loadSessionRounds(sessionDir: string): Promise<Record<string, unknown[]>> {
  const discussionsDir = path.join(sessionDir, 'discussions');
  const entries = await readdirSafe(discussionsDir);
  const rounds: Record<string, unknown[]> = {};

  for (const entry of entries) {
    if (entry.includes('.')) continue;
    const entryPath = path.join(discussionsDir, entry);
    const subFiles = await readdirSafe(entryPath);
    const roundFiles = subFiles.filter((f) => /^round-\d+\.md$/.test(f)).sort();

    if (roundFiles.length === 0) continue;

    const parsed: unknown[] = [];
    for (const rf of roundFiles) {
      const content = await readFileSafe(path.join(entryPath, rf));
      if (content) parsed.push(parseRoundMarkdown(content));
    }
    rounds[entry] = parsed;
  }

  return rounds;
}
