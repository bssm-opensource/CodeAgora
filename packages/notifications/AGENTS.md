<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# Notifications Package (@codeagora/notifications)

## Purpose
Notification system for review results. Supports Discord and Slack webhooks, generic webhook endpoints, and live event streaming. Fire-and-forget design: errors are logged, not thrown.

## Key Files
| File | Description |
|------|-------------|
| `webhook.ts` | Discord/Slack webhook sender with formatting |
| `generic-webhook.ts` | Generic webhook support for custom endpoints |
| `event-stream.ts` | Real-time event streaming to webhooks |
| `discord-live.ts` | Live Discord streaming during pipeline execution |

## Subdirectories
None — all modules are flat in `src/`.

## For AI Agents

### Working In This Directory
1. **Webhook validation**: All URLs are validated against whitelist (discord.com, hooks.slack.com, etc.)
2. **Payload formatting**: `NotificationPayload` includes decision, severity counts, top issues, session info
3. **Discord format**: Embeds with color coding (green=ACCEPT, red=REJECT, yellow=NEEDS_HUMAN)
4. **Slack format**: Block Kit messages with issue summaries
5. **Error handling**: All webhook sends use try-catch; errors logged but don't throw
6. **Event streaming**: `DiscussionEvent` objects forwarded to generic webhook as NDJSON

### Common Patterns
- **Config**: `NotificationConfig` with optional discord/slack/autoNotify fields
- **Payload structure**: Includes decision, reasoning, severity counts, top issues, session ID
- **Color mapping**: DECISION_COLORS and SEVERITY_EMOJI for visual formatting
- **Truncation**: Long text is truncated to prevent message overflow
- **Security**: Webhook URLs validated; only HTTPS allowed (enforced in config validation)

### Adding New Notification Channel
1. Create new file (e.g., `telegram.ts`)
2. Export async function matching `sendDiscordWebhook()` signature
3. Implement URL validation and error handling
4. Register in config schema (`@codeagora/core/types/config.ts`)
5. Call from review pipeline after verdict is ready

## Dependencies

### Internal
- `@codeagora/core` — Config types, event types
- `@codeagora/shared` — Utility functions

### External
- `node-fetch` (if HTTP client needed; check current implementation)
- Standard library: `fs`, `path` (for credential lookup if needed)

<!-- MANUAL: -->
