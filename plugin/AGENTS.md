<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# plugin

## Purpose
Claude Code plugin that exposes CodeAgora's multi-agent review pipeline via MCP (Model Context Protocol). Enables AI agents to run code reviews, query session history, and validate configuration directly from Claude Code.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Plugin manifest — private package, MCP dependencies, build script |
| `.mcp.json` | MCP server configuration — registers `agora` server via Node.js bridge |
| `bridge/mcp-server.ts` | MCP server implementation — 3 tools (run_review, get_result, list_sessions) |
| `tsconfig.json` | TypeScript config for bridge sources (ES2022, strict, rootDir=bridge) |
| `scripts/build-mcp.mjs` | Build script — compiles TS to CJS via esbuild for Node.js execution |
| `skills/config/SKILL.md` | Skill definition — view and validate CodeAgora configuration |
| `skills/review/SKILL.md` | Skill definition — run multi-agent code review on staged/diff changes |
| `skills/status/SKILL.md` | Skill definition — show recent review sessions and results |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `bridge/` | MCP server source code (TypeScript) — compiles to `bridge/mcp-server.cjs` |
| `skills/` | Claude Code skill definitions (SKILL.md per skill) |
| `.claude-plugin/` | Claude Code plugin metadata (`plugin.json`) |

## For AI Agents

### Working In This Directory

**Plugin Type:** MCP (Model Context Protocol) server for Claude Code
- Build: `pnpm build` (esbuild, outputs `bridge/mcp-server.cjs`)
- No test suite (integration testing via Claude Code)
- TypeScript strict mode

**MCP Tools Exposed:**
1. `agora_run_review(diffPath)` — Run review on diff file, returns session ID + verdict
2. `agora_get_result(date?, sessionId?)` — Fetch session metadata, verdict, and report
3. `agora_list_sessions(limit=10)` — List recent sessions with status and duration

**Session Storage:**
- Sessions live in `.ca/sessions/{YYYY-MM-DD}/{sessionId}/` (relative to CWD)
- Each session contains: `metadata.json`, `result.md`, `report.md`, `suggestions.md`
- MCP tools read from `.ca/sessions/` in the user's project root

**Claude Code Integration:**
- Registered via `.mcp.json` — MCP server entry point is `bridge/mcp-server.cjs`
- Skills (config/review/status) are user-invocable Claude Code commands
- Build output must be CommonJS for Node.js execution

### Build & Development

```bash
# Build MCP server (TypeScript → CommonJS)
pnpm build

# (No tests — integration via Claude Code)
```

### Design Notes
- MCP server reads from codegen, spawns CLI via `execFileAsync()` (no shell interpretation)
- All session lookups are directory-based and gracefully handle missing sessions
- Error handling returns text content with `isError: true` for MCP compatibility
- Skills are documentation-only (SKILL.md) — actual logic runs via MCP tools and core CLI

<!-- MANUAL: -->
