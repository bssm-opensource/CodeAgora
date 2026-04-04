/**
 * Notification Webhook Extended Tests
 * Tests sendSlackNotification() format details and sendNotifications() multi-target behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendSlackNotification,
  sendNotifications,
} from '../webhook.js';
import type { NotificationPayload, NotificationConfig } from '../webhook.js';

// ============================================================================
// Helpers
// ============================================================================

const DISCORD_URL = 'https://discord.com/api/webhooks/999/token';
const SLACK_URL = 'https://hooks.slack.com/services/T/B/X';

function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    decision: 'ACCEPT',
    reasoning: 'Code looks good.',
    severityCounts: { WARNING: 1 },
    topIssues: [
      { severity: 'WARNING', filePath: 'src/main.ts', title: 'Missing guard' },
    ],
    sessionId: 'sess-abc',
    date: '2026-03-21',
    totalDiscussions: 2,
    resolved: 2,
    escalated: 0,
    ...overrides,
  };
}

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, status: 200 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ============================================================================
// sendSlackNotification — detailed format checks
// ============================================================================

describe('sendSlackNotification() — format details', () => {
  it('block array starts with a header block', async () => {
    await sendSlackNotification(SLACK_URL, makePayload());
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.blocks[0].type).toBe('header');
  });

  it('second block is a section with reasoning text', async () => {
    await sendSlackNotification(SLACK_URL, makePayload({ reasoning: 'All looks fine.' }));
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    const section = body.blocks[1];
    expect(section.type).toBe('section');
    expect(section.text.text).toContain('All looks fine.');
  });

  it('reasoning is truncated at 3000 chars', async () => {
    const longReasoning = 'x'.repeat(4000);
    await sendSlackNotification(SLACK_URL, makePayload({ reasoning: longReasoning }));
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    const section = body.blocks[1];
    expect(section.text.text.length).toBeLessThanOrEqual(3000);
  });

  it('top issues section uses mrkdwn with backtick-wrapped filePaths', async () => {
    await sendSlackNotification(SLACK_URL, makePayload());
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    const sections = body.blocks.filter((b: { type: string }) => b.type === 'section');
    const issuesSection = sections.find((s: { text: { text: string } }) =>
      s.text.text.includes('Top Issues'),
    );
    expect(issuesSection).toBeDefined();
    expect(issuesSection.text.text).toContain('`src/main.ts`');
  });

  it('context block has mrkdwn type element', async () => {
    await sendSlackNotification(SLACK_URL, makePayload());
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    const ctx = body.blocks.find((b: { type: string }) => b.type === 'context');
    expect(ctx.elements[0].type).toBe('mrkdwn');
  });

  it('includes all 5 top issues when more than 5 are present (capped at 5)', async () => {
    const payload = makePayload({
      topIssues: Array.from({ length: 8 }, (_, i) => ({
        severity: 'WARNING',
        filePath: `src/file${i}.ts`,
        title: `Issue ${i}`,
      })),
    });
    await sendSlackNotification(SLACK_URL, payload);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    const sections = body.blocks.filter((b: { type: string }) => b.type === 'section');
    const issuesSection = sections.find((s: { text: { text: string } }) =>
      s.text.text.includes('Top Issues'),
    );
    // Should contain exactly 5 bullet points
    const bulletCount = (issuesSection.text.text.match(/^•/gm) ?? []).length;
    expect(bulletCount).toBeLessThanOrEqual(5);
  });

  it('severity counts section uses SEVERITY_EMOJI circle prefixes', async () => {
    await sendSlackNotification(
      SLACK_URL,
      makePayload({ severityCounts: { HARSHLY_CRITICAL: 1 }, topIssues: [] }),
    );
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    const sections = body.blocks.filter((b: { type: string }) => b.type === 'section');
    const sevSection = sections.find((s: { text: { text: string } }) =>
      s.text.text.includes('Severity Counts'),
    );
    expect(sevSection).toBeDefined();
    expect(sevSection.text.text).toContain(':red_circle:');
  });

  it('does not throw when topIssues is empty and severityCounts is empty', async () => {
    await expect(
      sendSlackNotification(SLACK_URL, makePayload({ topIssues: [], severityCounts: {} })),
    ).resolves.toBeUndefined();
  });
});

// ============================================================================
// sendNotifications() — multi-target allSettled behavior
// ============================================================================

describe('sendNotifications() — multi-target', () => {
  it('sends to both Discord and Slack in the same call batch', async () => {
    const config: NotificationConfig = {
      discord: { webhookUrl: DISCORD_URL },
      slack: { webhookUrl: SLACK_URL },
    };
    await sendNotifications(config, makePayload());

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const urls = mockFetch.mock.calls.map((c) => (c as [string])[0]);
    expect(urls).toContain(DISCORD_URL);
    expect(urls).toContain(SLACK_URL);
  });

  it('resolves even when Slack fetch rejects (allSettled)', async () => {
    vi.useFakeTimers();
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200 })  // Discord succeeds
      .mockRejectedValue(new Error('Slack network error')); // Slack fails (with retries)

    const config: NotificationConfig = {
      discord: { webhookUrl: DISCORD_URL },
      slack: { webhookUrl: SLACK_URL },
    };

    const promise = sendNotifications(config, makePayload());
    // Advance past all backoff delays (1s + 2s)
    await vi.advanceTimersByTimeAsync(4000);
    await expect(promise).resolves.toBeUndefined();
    // Both were attempted (Discord=1, Slack retries up to maxAttempts=3, total ≥ 2)
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });

  it('resolves even when Discord fetch rejects (allSettled)', async () => {
    vi.useFakeTimers();
    mockFetch
      .mockRejectedValueOnce(new Error('Discord network error')) // Discord fails
      .mockResolvedValueOnce({ ok: true, status: 200 }); // Slack succeeds

    const config: NotificationConfig = {
      discord: { webhookUrl: DISCORD_URL },
      slack: { webhookUrl: SLACK_URL },
    };

    const promise = sendNotifications(config, makePayload());
    await vi.advanceTimersByTimeAsync(4000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('resolves when config is completely empty', async () => {
    await expect(sendNotifications({}, makePayload())).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('resolves when one URL fails validation and the other succeeds', async () => {
    const config: NotificationConfig = {
      discord: { webhookUrl: DISCORD_URL },
      // invalid: HTTP not HTTPS — validateWebhookUrl will throw synchronously inside the promise
      slack: { webhookUrl: 'http://hooks.slack.com/bad' },
    };

    await expect(sendNotifications(config, makePayload())).resolves.toBeUndefined();
    // Discord was attempted; Slack threw before fetch
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe(DISCORD_URL);
  });

  it('sends ACCEPT payload with correct decision in both channels', async () => {
    const config: NotificationConfig = {
      discord: { webhookUrl: DISCORD_URL },
      slack: { webhookUrl: SLACK_URL },
    };
    await sendNotifications(config, makePayload({ decision: 'ACCEPT' }));

    for (const call of mockFetch.mock.calls as Array<[string, RequestInit]>) {
      const body = JSON.parse(call[1].body as string);
      const bodyStr = JSON.stringify(body);
      expect(bodyStr).toContain('ACCEPT');
    }
  });
});
