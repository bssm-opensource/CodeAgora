<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# utils/ (@codeagora/shared utilities)

## Purpose
Core utility functions used across all CodeAgora packages: concurrency control, diff parsing, filesystem operations, logging, path validation, process management, error recovery, issue mapping, and scope detection. No external dependencies beyond zod and picocolors.

## Key Files
| File | Description |
|------|-------------|
| `concurrency.ts` | Lightweight pLimit implementation; no external p-limit dependency |
| `diff.ts` | Unified diff parsing; extract files and code snippets |
| `fs.ts` | Filesystem helpers for `.ca/` directory structure and file operations |
| `issue-mapper.ts` | Map evidence documents (findings) to diff line numbers |
| `logger.ts` | Structured logging system; writes to `.ca/logs/` directory |
| `path-validation.ts` | Path security validation; rejects traversal, symlinks, null bytes |
| `process-kill.ts` | Unix-only process tree termination via process groups |
| `recovery.ts` | Retry logic with exponential backoff; configurable parameters |
| `scope-detector.ts` | Lightweight scope detection (regex-based, no AST); language detection |

## For AI Agents

### Working In This Directory

**Each File is Independent:**
- Utilities do not depend on each other; each can be imported in isolation
- Never create circular imports between utils files
- All external inputs validated with zod or custom Result<T> pattern

**Pattern: No Barrel Exports**
- Import directly: `import { pLimit } from '@codeagora/shared/utils/concurrency.js'`
- Never use: `import { pLimit } from '@codeagora/shared/utils/'` (no index.ts)

**File-by-File Breakdown:**

**concurrency.ts**
- Exports: `pLimit(concurrency: number) → (fn) => Promise<T>`
- Lightweight queue-based implementation (no external p-limit)
- Used for adaptive parallelization: serial ≤2 items, pLimit(3) for >2 items
- Error handling: throws RangeError if concurrency < 1

**diff.ts**
- Exports: `extractFileListFromDiff(diffContent: string) → string[]`
- Exports: `extractCodeSnippet(diffContent, filePath, [startLine, endLine]) → CodeSnippet`
- Supports unified diff format (diff --git a/path b/path)
- lineRange: [start, end] inclusive; code extracted with context

**fs.ts**
- Exports: `CA_ROOT = '.ca'`, directory getters, file read/write functions
- Directory structure: `.ca/sessions/{YYYY-MM-DD}/{sessionId}/`, `.ca/reviews/`, `.ca/logs/`, `.ca/credentials/`
- SessionMetadata validation via zod schema
- File operations: appendMarkdown(), readJSON(), writeJSON() with error handling

**issue-mapper.ts**
- Exports: `mapIssuesToLines(evidenceDocs, filePath) → MappedIssue[]`
- Maps EvidenceDocument (reviewer findings) to diff line numbers
- Interface: MappedIssue with line, severity, title, filePath, evidence[], suggestion
- Fuzzy file path matching based on diff file list

**logger.ts**
- Exports: `createLogger(component: string) → Logger`
- Logger methods: info(), warn(), error(), debug()
- Writes to `.ca/logs/{component}.log` with timestamp, level, message, optional data
- LogEntry interface: timestamp, level, component, message, data?

**path-validation.ts**
- Exports: `validateDiffPath(path, options?) → Result<string, string>`
- Rejects: empty string, null bytes, absolute paths, symlinks, traversal (../)
- Optional allowedRoots whitelist for containment checks
- Returns Result<T, string> pattern (ok/err from core)

**process-kill.ts**
- Exports: `killProcessTree(pid, signal?) → Promise<void>`
- Unix-only: uses process.kill(-pid, signal)
- Kills process group (process + children)
- Error handling: silently ignores ESRCH (process already dead)

**recovery.ts**
- Exports: `retryAsync(fn, options?) → Promise<T>`
- Exports: `DEFAULT_RETRY_OPTIONS: { maxRetries: 3, baseDelay: 1000, maxDelay: 10000, backoffFactor: 2 }`
- Exponential backoff: delay = min(baseDelay * (backoffFactor ^ attempt), maxDelay)
- Error handling: rethrows final error after exhausting retries

**scope-detector.ts**
- Exports: `detectLanguage(filePath) → 'ts' | 'python' | 'go' | 'unknown'`
- Exports: `detectScope(code, language) → ScopeInfo | null`
- Regex-based (no AST); supports .ts/.tsx/.js/.jsx/.py/.go
- ScopeInfo: { name, type: 'function'|'class'|'method'|'unknown', startLine }

### Common Patterns

**Concurrency:**
```typescript
import { pLimit } from '@codeagora/shared/utils/concurrency.js';

const limit = pLimit(3);
const tasks = items.map(item => limit(() => processItem(item)));
const results = await Promise.allSettled(tasks);
```

**Diff Processing:**
```typescript
import { extractFileListFromDiff, extractCodeSnippet } from '@codeagora/shared/utils/diff.js';

const files = extractFileListFromDiff(diffContent);
for (const file of files) {
  const snippet = extractCodeSnippet(diffContent, file, [10, 20]);
  if (snippet) {
    console.log(snippet.code);
  }
}
```

**Validation with Result<T>:**
```typescript
import { validateDiffPath } from '@codeagora/shared/utils/path-validation.js';

const result = validateDiffPath(userPath);
if (result.ok) {
  // result.value is a safe, validated path
  await readFile(result.value);
} else {
  // result.error is the rejection reason
  logger.error('Invalid path', { error: result.error });
}
```

**Logging:**
```typescript
import { createLogger } from '@codeagora/shared/utils/logger.js';

const logger = createLogger('my-component');
logger.info('Operation started', { userId: '123' });
logger.error('Operation failed', { error: err.message, stack: err.stack });
```

**Retry with Backoff:**
```typescript
import { retryAsync, DEFAULT_RETRY_OPTIONS } from '@codeagora/shared/utils/recovery.js';

try {
  const result = await retryAsync(
    () => fetchDataFromAPI(),
    { ...DEFAULT_RETRY_OPTIONS, maxRetries: 5 }
  );
} catch (err) {
  logger.error('API call failed after retries', { error: err });
}
```

**Scope Detection:**
```typescript
import { detectLanguage, detectScope } from '@codeagora/shared/utils/scope-detector.js';

const lang = detectLanguage('src/app.ts');  // 'ts'
const scope = detectScope(code, lang);
if (scope) {
  console.log(`Function ${scope.name} at line ${scope.startLine}`);
}
```

**Error Handling Conventions:**
- All functions validate input with zod or Result pattern
- Security boundaries (paths, shell args) use Result<T, string>
- Async operations use try-catch with logged failures
- Never throw from utils; return error or log + graceful fallback

**TypeScript:**
- Strict mode enforced
- Interfaces exported alongside implementations
- No `any` types; use `unknown` with narrowing
- Functional style: pure functions, immutable data

## Dependencies

### Internal (within shared)
- Each utility file is independent; no cross-dependencies between utils files

### External
- `zod` — Schema validation (imported from zod package)
- `picocolors` — Terminal colors (used in logger.ts for colored output)
- Node.js builtins: `fs/promises`, `path`, `process`, `child_process`, `crypto`

<!-- MANUAL: -->
