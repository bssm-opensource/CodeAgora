<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# CodeAgora

## Purpose
Multi-LLM code review pipeline where multiple AI reviewers independently analyze code, debate conflicting opinions, and a head agent renders a final verdict. Distributed as a CLI tool, GitHub Action, MCP server, and web dashboard.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Root workspace manifest — pnpm monorepo, bin entries `codeagora`/`agora` |
| `pnpm-workspace.yaml` | Workspace definition pointing to `packages/*` |
| `tsconfig.json` | Root TypeScript config with path aliases for all `@codeagora/*` packages |
| `tsconfig.base.json` | Shared base compiler options (ES2022, strict, composite) |
| `vitest.config.ts` | Test config — tests live in `src/tests/`, aliases resolve to package sources |
| `eslint.config.js` | Flat ESLint config — TypeScript strict + React hooks |
| `action.yml` | GitHub Actions composite action for PR review integration |
| `.env.example` | Environment variable template for API keys |
| `.reviewignore` | Patterns to exclude from code review diffs |
| `.npmignore` | npm publish exclusions |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `packages/` | Monorepo workspace packages — all source code (see `packages/AGENTS.md`) |
| `src/` | Test suite — 131 files, 1880 tests (see `src/AGENTS.md`) |
| `docs/` | Design documents, PRD, phase plans (see `docs/AGENTS.md`) |
| `tools/` | Standalone utility scripts (see `tools/AGENTS.md`) |
| `plugin/` | Claude Code plugin with MCP bridge (see `plugin/AGENTS.md`) |
| `examples/` | Example projects for testing (see `examples/AGENTS.md`) |
| `assets/` | Static assets — logos, images (see `assets/AGENTS.md`) |
| `.github/` | GitHub Actions workflows, issue templates (see `.github/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- This is a **pnpm monorepo** — always use `pnpm` (not npm/yarn)
- Package aliases: `@codeagora/shared`, `@codeagora/core`, `@codeagora/cli`, etc.
- Build all packages: `pnpm build` (uses tsup per-package)
- Type-check: `pnpm typecheck` (root) or `pnpm typecheck:ws` (all workspaces)
- Run CLI in dev: `pnpm dev` or `pnpm cli`

### Architecture Overview
```
CLI Layer → L0 (Model Intelligence) → L1 (Parallel Reviewers) → L2 (Discussion) → L3 (Head Verdict)
```
- **L0**: Selects optimal models via multi-armed bandit + health monitoring
- **L1**: Runs parallel independent reviews (API or CLI backends)
- **L2**: Deduplicates findings, debates conflicting opinions via structured discussion
- **L3**: Head agent synthesizes final verdict (ACCEPT / REJECT / NEEDS_HUMAN)

### Testing Requirements
- Tests are in `src/tests/` (not colocated with source)
- Run: `pnpm test` (root vitest) or `pnpm test:ws` (all workspaces)
- E2E tests use `forks` pool; unit tests use default pool
- Coverage excludes `packages/tui/`

### Common Patterns
- TypeScript strict mode everywhere
- Zod for all external input validation
- Functional style preferred (pure functions, immutable data)
- Shell args sanitized via `sanitizeShellArg()` + `spawn()` (never `exec`)
- Error handling: L1 try-catch, L2 Promise.allSettled, security boundaries use Result<T>

## Dependencies

### External
- `ai` (Vercel AI SDK) — multi-provider LLM abstraction
- `@ai-sdk/*` — provider packages (OpenAI, Anthropic, Google, Groq, OpenRouter)
- `commander` + `ink` — CLI framework + React TUI
- `zod` — schema validation
- `@octokit/rest` — GitHub API
- `@modelcontextprotocol/sdk` — MCP server
- `tsup` — build tool
- `vitest` — test framework

<!-- MANUAL: -->
