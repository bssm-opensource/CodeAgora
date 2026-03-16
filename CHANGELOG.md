# Changelog

## 1.0.0-rc.8 (2026-03-16)

### Features
- **GitHub Actions integration** — inline PR review comments, commit status checks, SARIF output
- **15 API providers** — OpenAI, Anthropic, Google, Groq, DeepSeek, Qwen, Mistral, xAI, Together, Cerebras, NVIDIA NIM, ZAI, OpenRouter, GitHub Models, GitHub Copilot
- **5 CLI backends** — claude, codex, gemini, copilot, opencode
- **LLM-based Head verdict** — L3 Head agent uses LLM to evaluate reasoning quality (rule-based fallback)
- **Majority consensus** — checkConsensus handles >50% agree/disagree votes
- **Semantic file grouping** — import-relationship-based clustering for reviewer distribution
- **Reviewer personas** — strict, pragmatic, security-focused persona files
- **Configurable chunking** — maxTokens settable via config
- **NEEDS_HUMAN handling** — auto-request human reviewers + add labels
- **SARIF 2.1.0 output** — GitHub Code Scanning compatible
- **Secure credentials** — API keys stored in ~/.config/codeagora/credentials
- **TUI paste support** — clipboard paste works in all text inputs
- **CLI --pr flag** — review GitHub PRs directly from command line

### Bug Fixes
- Fix dist build crash (locale JSON not bundled)
- Fix discussion matching (exact filePath:line instead of substring)
- Fix division by zero in forfeit threshold
- Fix CLI flags (--provider, --model, --timeout, --no-discussion) being ignored
- Fix GitHub Action multiline output corruption
- Fix parser "looks good" false negative
- Fix inline comment position errors (fallback to summary-only)

## 1.0.0-rc.1 to rc.7

Initial development releases. See git history for details.
