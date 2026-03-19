<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# src/ (@codeagora/shared source)

## Purpose
Source directory containing utilities, internationalization, provider mappings, static data, and meme mode implementations. Organized into 5 subdirectories with no barrel exports — other packages import directly from subpaths (e.g., `@codeagora/shared/utils/concurrency.js`).

## Key Files
| File | Description |
|------|-------------|
| `utils/` | Core utilities used across packages (7 modules) |
| `i18n/` | Lightweight i18n system with en/ko locale files |
| `data/` | Static JSON data (rankings, pricing, model lists) |
| `providers/` | Provider environment variable mapping |
| `meme/` | Meme mode text pools (verdicts, badges, statuses) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `utils/` | Shared utility functions for concurrency, diffs, filesystem, validation, logging, recovery |
| `i18n/` | Internationalization with locale files; setLocale/getText API |
| `data/` | Static configuration: model rankings, pricing, Groq models, GitHub Actions template |
| `providers/` | PROVIDER_ENV_VARS mapping (provider name → API key environment variable) |
| `meme/` | Meme mode verdict/badge/status message pools (both locales) |

## For AI Agents

### Working In This Directory

**No Barrel Exports:**
- Each subdirectory is independent; there is no `src/index.ts` re-exporting everything
- Other packages import as: `import { pLimit } from '@codeagora/shared/utils/concurrency.js'`
- Direct subpath imports ensure tree-shaking and clear dependencies

**Utilities (src/utils/):**
- `concurrency.ts` — pLimit() function; no external p-limit dependency
- `diff.ts` — extractFileListFromDiff(), extractCodeSnippet(); supports unified diff format
- `fs.ts` — CA_ROOT constant, directory getters (sessions, reviews, logs), file operations, credential handling
- `issue-mapper.ts` — mapIssuesToLines(); maps EvidenceDocuments to diff line numbers
- `logger.ts` — createLogger(); structured logging to `.ca/logs/` with timestamps
- `path-validation.ts` — validateDiffPath(); Result<T> pattern; rejects null bytes, traversal, symlinks
- `process-kill.ts` — killProcessTree(); Unix-only; kills process group via negative PID
- `recovery.ts` — retryAsync(); exponential backoff with configurable delays
- `scope-detector.ts` — detectLanguage(), detectScope(); regex-based (no AST); supports ts/js/py/go

**i18n (src/i18n/):**
- Lightweight; no external i18n library (no i18next, no messageformat)
- `setLocale('en' | 'ko')` — Switch active locale
- `getText(key, fallback?)` — Retrieve string by dot-notation key (e.g., 'app.title')
- Locale files: `locales/en.json`, `locales/ko.json`
- No variable interpolation; use simple string concatenation if dynamic values needed

**Data (src/data/):**
- `model-rankings.json` — Models ranked by quality/speed/cost from artificialanalysis.ai
- `pricing.json` — Per-token pricing for cost analytics
- `groq-models.json` — List of supported Groq API models
- `github-actions-template.md` — GitHub Actions workflow template (markdown)
- Import as: `import rankings from '@codeagora/shared/data/model-rankings.json' assert { type: 'json' }`

**Providers (src/providers/):**
- `env-vars.ts` → `PROVIDER_ENV_VARS: Record<string, string>`
- Maps provider name (lowercase) to environment variable name (UPPERCASE_SNAKE_CASE)
- Examples: `'openai' → 'OPENAI_API_KEY'`, `'anthropic' → 'ANTHROPIC_API_KEY'`
- Used by CLI at startup to populate LLM provider credentials

**Meme (src/meme/):**
- `getMemeVerdict(verdict: string)` — Return alternate text for a verdict (e.g., 'PASS' → meme variant)
- `getMemeBadge(badgeType: string)` — Return alternate badge text
- `getMemeSatus(status: string)` — Return alternate status message
- Supports locale-aware pools (en/ko)
- Falls back to default text if locale not found

### Common Patterns

**Imports (Direct Subpaths):**
```typescript
// ✓ Correct (direct subpath)
import { pLimit } from '@codeagora/shared/utils/concurrency.js';
import { extractFileListFromDiff } from '@codeagora/shared/utils/diff.js';
import en from '@codeagora/shared/data/model-rankings.json' assert { type: 'json' };

// ✗ Wrong (no barrel exports)
import { pLimit } from '@codeagora/shared';  // Will fail
```

**Diff Parsing:**
```typescript
import { extractFileListFromDiff, extractCodeSnippet } from '@codeagora/shared/utils/diff.js';

const files = extractFileListFromDiff(diffContent);
const snippet = extractCodeSnippet(diffContent, 'src/file.ts', [10, 20]);
```

**Filesystem Operations:**
```typescript
import { CA_ROOT, getSessionDir, appendMarkdown } from '@codeagora/shared/utils/fs.js';

const sessionDir = getSessionDir('2026-03-20', 'abc123');
await appendMarkdown(`${sessionDir}/findings.md`, '# Issues\n...');
```

**Path Security:**
```typescript
import { validateDiffPath } from '@codeagora/shared/utils/path-validation.js';

const result = validateDiffPath(userProvidedPath);
if (result.ok) {
  // result.value is safe to use
} else {
  throw new Error(result.error);
}
```

**Error Handling:**
- All utilities use zod for input validation
- Security boundaries use Result<T, string> pattern (ok/err functions from core)
- Async operations use try-catch with graceful degradation
- Never throw from utilities; return Result or logged error

## Dependencies

### Internal
None — src/ packages are the foundation. No dependencies on `@codeagora/core` or other packages.

### External
- `zod` — Schema validation (re-exported for use in other packages)
- `picocolors` — Terminal color helpers (used in logger.ts)
- Node.js: `fs/promises`, `path`, `process`, `child_process`, `crypto`

<!-- MANUAL: -->
