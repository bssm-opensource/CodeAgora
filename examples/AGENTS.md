<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# examples

## Purpose
Demonstration projects for testing and showcasing CodeAgora functionality. Contains intentionally vulnerable example code for review demos.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `vulnerable-api/` | Example Express.js server with intentional security flaws (hardcoded secrets, SQL injection, JWT bypass, etc.) for testing CodeAgora review capabilities |

## Key Files

| File | Description |
|------|-------------|
| `vulnerable-api/server.ts` | Intentionally vulnerable API server with multiple security issues (hardcoded DB password, JWT secret, API keys; SQL injection vectors; auth bypass patterns) — **DO NOT use in production** |

## For AI Agents

### Working In This Directory

- **Purpose**: These are demo/test projects, not part of the main codebase
- **Code quality**: Intentionally contains vulnerabilities to test CodeAgora's review capabilities
- **Dependencies**: Examples may use different dependencies than the main monorepo (e.g., Express, MySQL, JWT libraries)
- **Running examples**: Check individual example READMEs or top comments for setup instructions
- **Adding examples**: Create new subdirectories for additional example projects; use clear naming and include a comment block explaining the example's purpose

### When Using Examples

- Use for: testing CodeAgora on real-world code patterns, training reviewers, validating detection rules
- Do not: copy example code into production or assume patterns are secure
- Always mark intentional flaws clearly in code comments
- Update examples when adding new review categories or detectors

<!-- MANUAL: -->
