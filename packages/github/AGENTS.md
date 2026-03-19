<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# GitHub Package (@codeagora/github)

## Purpose
GitHub integration layer. Handles PR diff fetching, comment posting, SARIF report generation, and GitHub Actions entrypoint. Provides pure functions for parsing GitHub URLs and mapping review findings to PR hunks.

## Key Files
| File | Description |
|------|-------------|
| `action.ts` | GitHub Actions entrypoint; reads env inputs, runs pipeline, posts results |
| `client.ts` | Octokit wrapper and URL parsers (PR URL, git remote) |
| `pr-diff.ts` | Fetch PR diff from GitHub API |
| `diff-parser.ts` | Parse unified diff into hunks and position index |
| `mapper.ts` | Map review findings to PR diff positions |
| `poster.ts` | Post review comments and commit status to GitHub |
| `comment.ts` | Format review comments for GitHub |
| `dedup.ts` | Deduplication logic for review comments |
| `sarif.ts` | Generate SARIF reports for GitHub code scanning |
| `dryrun-preview.ts` | Preview mode for review posting (no actual posts) |
| `session-diff.ts` | Load diff from past session storage |
| `types.ts` | TypeScript types for GitHub integration |

## Subdirectories
None — all modules are flat in `src/`.

## For AI Agents

### Working In This Directory
1. **Input validation**: All external inputs (PR URLs, diffs, tokens) are validated before use
2. **Octokit usage**: Use `createOctokit(config)` to get a configured instance
3. **Diff parsing**: Use `buildDiffPositionIndex()` to create a mapping from file/line to GitHub position
4. **Finding mapping**: Use `mapToGitHubReview()` to convert review findings to GitHub comment format
5. **Posting**: Use `postReview()` to POST the review; handles pagination and threading
6. **Error handling**: Validation errors throw descriptively; network errors are retried

### Common Patterns
- **Config**: `GitHubConfig` includes `token`, `owner`, `repo`
- **PR info**: Fetch via Octokit, includes diff as string
- **Position index**: Maps file path + line number → GitHub diff position for comments
- **Review format**: Findings grouped by file with body text (max 4096 chars per comment)
- **Dedup**: Multiple findings on same line are merged into one comment
- **SARIF**: Generated for code scanning dashboard integration

### Adding New Functionality
1. If adding a new GitHub API call, update `client.ts` with Octokit call
2. If adding new comment format, update `comment.ts`
3. If adding new mapping logic, extend `mapper.ts`
4. Always validate inputs with zod schemas from `@codeagora/shared`

## Dependencies

### Internal
- `@codeagora/core` — Config types, pipeline result types
- `@codeagora/shared` — Types, zod schemas, utilities, path validation

### External
- `@octokit/rest` — GitHub API client
- `fs/promises` — File operations
- `path` — Path utilities

<!-- MANUAL: -->
