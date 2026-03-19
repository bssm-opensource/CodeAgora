<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# tools

## Purpose
Standalone CLI utility tools for deterministic review processing. Provides six composable commands that parse raw reviewer responses, apply voting gates, anonymize opinions, score reasoning quality, detect debate convergence, and format final markdown reports.

## Key Files

| File | Description |
|------|-------------|
| `src/index.ts` | CLI entry point (commander program) — exposes all 6 commands as subcommands |
| `src/commands/parse-reviews.ts` | Parse raw reviewer responses into structured ParsedReview objects with zod validation |
| `src/commands/voting.ts` | 75% Majority Voting Gate — separates consensus issues from debate issues (core innovation) |
| `src/commands/anonymize.ts` | Anonymize opponent opinions by severity grouping to reduce conformity bias |
| `src/commands/score.ts` | Trajectory Scoring — 5 regex patterns for argument quality assessment |
| `src/commands/early-stop.ts` | Check if debate should stop early based on reasoning similarity (Jaccard index) |
| `src/commands/format-output.ts` | Generate markdown report from review results with severity emoji indicators |
| `src/types/index.ts` | Core zod type definitions for all inputs/outputs (Severity, ReviewIssue, ParsedReview, etc.) |
| `src/utils/parser.ts` | Parser utilities — transforms reviewer response markdown into ReviewIssue objects |
| `package.json` | Package manifest — bin entry `agora` points to `dist/index.js` |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/commands/` | Command implementations — one file per CLI subcommand |
| `src/types/` | Zod schema definitions — all input/output contracts |
| `src/utils/` | Shared parser logic — markdown parsing, severity normalization |
| `dist/` | Build output — compiled ESM + TypeScript declarations |
| `tests/` | Command unit tests — vitest suite |

## For AI Agents

### Working In This Directory

- **Build**: `pnpm build` (uses tsup, outputs to `dist/`)
- **Dev watch**: `pnpm dev`
- **Type-check**: `pnpm typecheck`
- **Test**: `pnpm test` or `pnpm test:watch`

### Command Pipeline

The tools are designed to chain together in a deterministic review pipeline:

1. **parse-reviews** — Input: raw reviewer responses (JSON array)
   - Output: structured ParsedReview objects with validated ReviewIssue list
   - Extracts and normalizes Gemini CLI wrapper format if present
   - Maps uppercase severity (CRITICAL/MAJOR/etc.) to lowercase enum (critical/warning/etc.)

2. **voting** — Input: parsed reviews (JSON)
   - Output: ConsensusIssue list (≥75% agreement) + DebateIssue list (disputed findings)
   - Implements 75% majority voting gate per file location
   - Groups issues by file/line, calculates confidence score

3. **anonymize** — Input: debate opinions (JSON)
   - Output: anonymized reasonings grouped by severity
   - Removes reviewer names from debate participant list to reduce conformity bias

4. **score** — Input: reasoning string (plain text)
   - Output: ScoreOutput with quality trajectory (0.0–1.0)
   - Detects code references, technical depth, evidence-based language, specific examples, actionable suggestions

5. **early-stop** — Input: debate participants (JSON)
   - Output: EarlyStopOutput with stopping recommendation + similarity scores
   - Uses Jaccard similarity (word-level) to detect reasoning convergence
   - Threshold: 0.7 for early stop recommendation

6. **format-output** — Input: consensus + debate results (JSON)
   - Output: markdown report with severity emoji indicators
   - Groups issues by severity (critical → warning → suggestion → nitpick)
   - Sorts by severity level for readability

### Input Validation

All commands validate input via zod schemas. If validation fails, commands return error JSON:
```json
{
  "success": false,
  "error": "error message"
}
```

### Type System

- **Severity**: enum ['critical', 'warning', 'suggestion', 'nitpick'] (lowercase)
- **ReviewIssue**: {severity, category, line, lineEnd?, title, description?, suggestion?, confidence}
- **ParsedReview**: {reviewer, file, issues, parseFailures}
- **ConsensusIssue**: {severity, issues[], confidence}
- **DebateIssue**: {severity, opinions[], location}

### Testing Strategy

- Unit tests validate parser regex patterns against diverse reviewer response formats
- Voting tests verify 75% threshold logic and confidence calculations
- Integration tests chain parse → vote → anonymize → score → early-stop → format

### Key Conventions

- All commands read JSON from stdin (or first argument as JSON string)
- Output is always JSON or markdown (determined by command)
- Errors are logged to stderr; success results to stdout
- No external API calls — all computation is deterministic and offline

### Common Tasks

**Add a new command:**
1. Create `src/commands/new-command.ts` with export function
2. Add zod input schema to `src/types/index.ts`
3. Register command in `src/index.ts` with `.command()` and `.action()`
4. Add unit tests in `tests/new-command.test.ts`

**Modify parser logic:**
- Edit `src/utils/parser.ts` (transformReviewerResponse function)
- Add normalization logic in `normalizeSeverity()` if new severity values are needed
- Test against sample reviewer responses

**Change voting threshold:**
- Edit `voting.ts` — search for `0.75` constant
- Update test expectations in `tests/voting.test.ts`

<!-- MANUAL: -->
