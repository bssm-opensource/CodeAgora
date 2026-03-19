<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# @codeagora/web

## Purpose

Web dashboard package providing:
- **Hono.js REST API server** — HTTP endpoints for sessions, models, costs, config, and health checks
- **React SPA frontend** — Interactive dashboard with routing, real-time WebSocket events, and multi-page navigation
- **WebSocket integration** — Real-time pipeline progress and discussion events forwarded from core layers

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Workspace package definition, exports server/client APIs |
| `src/index.ts` | Public API exports (server factory, route handlers, WebSocket utilities) |
| `src/server/index.ts` | Hono app factory and server startup |
| `src/server/middleware.ts` | CORS and JSON error handling middleware |
| `src/server/ws.ts` | WebSocket upgrade handler and event forwarding |
| `src/frontend/main.tsx` | React root render + BrowserRouter initialization |
| `src/frontend/App.tsx` | Route definitions and page mounting |
| `src/frontend/components/Layout.tsx` | Page container with sidebar and header |

## Subdirectories

### src/server/
- `routes/` — 5 API route modules: health, sessions, models, config, costs
- `utils/` — fs-helpers for safe JSON/directory reads

### src/frontend/
- `components/` — 31 reusable UI components (charts, panels, badges, modals, etc.)
- `hooks/` — 3 custom hooks: useApi, useWebSocket, usePipelineEvents
- `pages/` — 8 page components: Dashboard, Sessions, ReviewDetail, Models, Costs, Discussions, Config, Pipeline
- `utils/` — Helper modules for data transformation and filtering
- `styles/` — Global CSS

## For AI Agents

### Working In This Directory

**Common Setup:**
```bash
# Install and build
cd packages/web
pnpm install
pnpm build

# Run dev server (with hot reload)
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck
```

**Server-side work:**
- Hono is the HTTP framework. Routes use `c.json()` for responses, `c.req.*` for requests.
- New API routes: create in `src/server/routes/`, export from route file, mount in `src/server/index.ts` via `app.route()`.
- All routes read from `.ca/` directory tree (sessions, models, costs, config).
- WebSocket listeners are attached via `setEmitters()` from `src/server/ws.ts`.

**Frontend work:**
- React Router v6 for routing. Pages are mounted in `App.tsx` as `<Route>`.
- Data fetching: use `useApi()` hook (simple fetch wrapper with loading/error/refetch states).
- Real-time events: use `usePipelineEvents()` (wraps `useWebSocket`, maintains pipeline state).
- Component reuse: build in `components/`, import into pages or other components.
- Styling: global `styles/globals.css` + inline Tailwind classes (no CSS modules).

### Common Patterns

**API Routes:**
1. Import `Hono` and route helpers from shared packages.
2. Define the route handler (async), read data from `.ca/`, return `c.json()`.
3. Export as named constant (e.g., `export const sessionRoutes = new Hono()`).
4. Mount in `src/server/index.ts`: `app.route('/api/path', routesVariable)`.

**React Pages:**
1. Import hooks (`useApi`, `usePipelineEvents`) and components.
2. Fetch data via `useApi<T>(path)` → destructure `{ data, loading, error, refetch }`.
3. Render content conditionally on `loading` and `error`.
4. Use components to compose the page layout.

**React Components:**
1. Accept props (typed), render JSX.
2. Use `useApi()` or `usePipelineEvents()` for data if needed.
3. Export as named function component.
4. Reusable components live in `components/`, page-specific in pages/.

**WebSocket:**
- Server: attach listeners via `progressEmitter.onProgress()` and `discussionEmitter.on('*', ...)` in `ws.ts`.
- Client: `useWebSocket(path)` returns `{ messages, connected, send }`.
- Events are JSON-stringified before sending; parse on client side.

## Dependencies

### Internal
- `@codeagora/core` — Types (SessionMetadata, ConfigSchema), emitters (ProgressEmitter, DiscussionEmitter), enums
- `@codeagora/shared` — Utility types and config validation

### External
- **Server:** Hono, @hono/node-server, @hono/node-ws
- **Frontend:** React, React Router v6, React DOM
- **Build:** tsup (both server and frontend bundles)
- **Dev:** TypeScript, Vitest (tests)

## Patterns & Conventions

**Error Handling:**
- Routes: wrap reads in try-catch, return structured `{ error: message }` via `c.json({...}, statusCode)`.
- Frontend: `useApi` hook captures fetch errors, passes via `error` state.
- Middleware: global error handler catches unhandled errors and returns JSON.

**Data Flow:**
- `.ca/` directory is single source of truth for all data.
- Routes read JSON files and directory trees, respond with structured JSON.
- Frontend fetches via REST API, caches in component/hook state.
- WebSocket is read-only event stream from CLI → server → browser.

**Testing:**
- Route tests mock file system reads.
- Component tests use @testing-library/react, render with mock data.
- Hook tests mock API responses via fetch mocking.

<!-- MANUAL: -->
