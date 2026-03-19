<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# src/server/ — Hono REST API

## Purpose

Hono.js HTTP server with:
- REST API routes (5 modules: health, sessions, models, config, costs)
- CORS and error handling middleware
- WebSocket upgrade handler for real-time events
- Static file serving for built frontend

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | App factory (`createApp()`) and server startup (`startServer()`) |
| `middleware.ts` | CORS validation (localhost origins) and JSON error handler |
| `ws.ts` | WebSocket upgrade setup, event listener attachment, message forwarding |
| `utils/fs-helpers.ts` | Safe file system utilities: readJsonSafe, readdirSafe |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `routes/` | 5 API route modules (health, sessions, models, config, costs) |
| `utils/` | Helper functions for file I/O |

## Route Modules Overview

| Route Module | Endpoints | Purpose |
|--------------|-----------|---------|
| `health.ts` | GET `/api/health` | Server status, version, uptime |
| `sessions.ts` | GET, POST `/api/sessions` | List, create, fetch sessions from `.ca/sessions/` |
| `models.ts` | GET `/api/models` | Bandit store data for Thompson Sampling visualization |
| `config.ts` | GET, POST `/api/config` | Load and update CodeAgora config |
| `costs.ts` | GET `/api/costs` | Aggregate cost analytics across all sessions |

## For AI Agents

### Working In This Directory

**App Setup:**
- `createApp()` returns a Hono instance with all routes mounted.
- `startServer()` starts the HTTP server on port 6274 (or `$PORT` env var) and injects WebSocket support.
- Middleware stack: CORS first, then error handler, then routes, then static file serving.

**Adding a New Route:**
1. Create `routes/newfeature.ts` with a Hono instance.
2. Define handlers using `routeInstance.get()`, `.post()`, etc.
3. Export the route: `export const newfeatureRoutes = new Hono()`.
4. Mount in `index.ts`: `app.route('/api/newfeature', newfeatureRoutes)`.
5. Re-export from `src/index.ts` if it's part of the public API.

**Route Handler Patterns:**
```typescript
// Example route handler
routeRoutes.get('/path', async (c) => {
  try {
    const data = await readJsonSafe(filePath);
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Not found' }, 404);
  }
});
```

**WebSocket Setup:**
- Call `setEmitters(progressEmitter, discussionEmitter)` once on startup to wire event listeners.
- Listeners attach in `onOpen`, detach in `onClose` and `onError`.
- Messages are JSON-stringified and sent via `ws.send()`.

**Middleware:**
- CORS: checks `Origin` header, allows localhost origins, responds with `Access-Control-*` headers.
- Error handler: wraps all routes in try-catch, returns structured JSON errors.
- Both are applied globally via `app.use('*', ...)`.

### Common Patterns

**Reading from `.ca/` directory:**
```typescript
import { readJsonSafe, readdirSafe } from '../utils/fs-helpers.js';
import path from 'path';

const CA_ROOT = '.ca';
const data = await readJsonSafe(path.join(CA_ROOT, 'file.json'));
const dirs = await readdirSafe(path.join(CA_ROOT, 'subdir'));
```

**Responding with JSON:**
```typescript
c.json(data);           // 200 OK
c.json({ error: '...' }, 404);  // 404 Not Found
c.json({ error: '...' }, 500);  // 500 Internal Server Error
```

**Error handling in routes:**
- Try-catch for synchronous errors.
- Catch file not found, invalid JSON, etc.
- Return descriptive error messages.

**Static file serving:**
- Hono serves built frontend from `dist/frontend/` directory.
- Mounted last so API routes take precedence.

## Dependencies

### Internal
- `@codeagora/core` — Types (SessionMetadata, ConfigSchema), emitters (ProgressEmitter, DiscussionEmitter)
- `./utils/` — File system helpers
- `./routes/` — All route modules

### External
- `hono` — HTTP framework
- `@hono/node-server` — Node.js HTTP server integration
- `@hono/node-ws` — WebSocket support via createNodeWebSocket

## Patterns & Conventions

**Async/await:** All route handlers are async. Use try-catch for error handling.

**File I/O:** Always use `readJsonSafe` and `readdirSafe` to handle missing files gracefully.

**Type Safety:** Import types from `@codeagora/core/types/`, use strict TypeScript.

**Error Messages:** Return human-readable messages in JSON responses.

<!-- MANUAL: -->
