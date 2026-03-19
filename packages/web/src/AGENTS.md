<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# src/ — Source Root

## Purpose

Entry point and top-level organization for both server and frontend code.
- `index.ts` exports public API (server factory, route handlers, WebSocket utilities)
- `server/` contains Hono REST API and middleware
- `frontend/` contains React SPA with pages, components, and hooks

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Package exports: createApp, startServer, route modules, WebSocket setup |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `server/` | Hono REST API server, routes, WebSocket, middleware |
| `frontend/` | React SPA: pages, components, hooks, styles, utilities |

## For AI Agents

### Working In This Directory

**Scope:**
- `index.ts` is the public API surface. Keep exports in sync with implementation.
- If adding new route modules (e.g., `src/server/routes/newfeature.ts`), add the export in `index.ts`.
- Frontend code rarely needs changes at this level; focus on `frontend/` subdirectory.

**Common Edits:**
- Re-export new route handlers or utilities from server subpackage.
- Ensure TypeScript strict mode is enforced; types should be explicit.

### Common Patterns

**Public API:**
```typescript
// Export from implementation
export { createApp, startServer } from './server/index.js';
export type { ServerOptions } from './server/index.js';

// Export route modules
export { sessionRoutes } from './server/routes/sessions.js';
export { modelRoutes } from './server/routes/models.js';

// Export WebSocket
export { setEmitters, setupWebSocket } from './server/ws.js';
export type { WebSocketSetup } from './server/ws.js';
```

All exports use `.js` file extensions (ESM).

## Dependencies

### Internal (same package)
- `./server/` — Hono app factory, routes, middleware, WebSocket
- `./frontend/` — React app, pages, components, hooks

### External
- Implied by server/ and frontend/ subdirectories

<!-- MANUAL: -->
