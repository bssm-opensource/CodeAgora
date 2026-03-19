<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# TUI Package (@codeagora/tui)

## Purpose
Interactive terminal UI for CodeAgora built with Ink (React for CLI). Provides full control of code review pipeline: diff selection, reviewer/supporter configuration, real-time pipeline progress, results browsing, debate viewing, and context exploration. Multi-screen navigation with history-based routing.

## Key Files

| File | Description |
|------|-------------|
| `src/index.tsx` | Entrypoint — calls `render()` with alternate screen buffer setup |
| `src/App.tsx` | Root app component — screen routing, state management, navigation |
| `src/theme.ts` | Centralized colors, icons, borders, severity/decision mapping helpers |
| `src/hooks/useRouter.ts` | Screen navigation hook — history-based back, screen stack |
| `src/components/Header.tsx` | Title bar with branding and version |
| `src/components/StatusBar.tsx` | Footer bar with navigation hints (q to quit/back) |
| `src/components/Panel.tsx` | Reusable bordered container with optional title |
| `src/components/Menu.tsx` | Selectable menu list (keyboard navigation) |
| `src/components/ModelSelector.tsx` | Model/provider selection UI |
| `src/components/TextInput.tsx` | Text input field (single-line) |
| `src/components/TabBar.tsx` | Tab switcher for multi-panel screens |
| `src/components/ScrollableList.tsx` | Scrollable list with keyboard controls |
| `src/components/DetailRow.tsx` | Key-value display row (left=key, right=value) |
| `src/components/DiffViewer.tsx` | Syntax-highlighted diff display |
| `src/components/DebatePanel.tsx` | Multi-round debate/discussion visualization |
| `src/components/PipelineProgress.tsx` | Real-time pipeline phase progress (L0→L1→L2→L3) |
| `src/components/HelpOverlay.tsx` | Help text overlay (keyboard shortcuts) |
| `src/components/Toast.tsx` | Temporary notification display |
| `src/screens/HomeScreen.tsx` | Main menu (Review, Sessions, Config, Quit) |
| `src/screens/ReviewSetupScreen.tsx` | Diff selection and submission |
| `src/screens/PipelineScreen.tsx` | Real-time pipeline execution monitoring |
| `src/screens/ResultsScreen.tsx` | Review verdict, summary, and top issues list |
| `src/screens/ContextScreen.tsx` | Diff context + evidence docs explorer |
| `src/screens/DebateScreen.tsx` | Multi-issue debate rounds and final consensus |
| `src/screens/SessionsScreen.tsx` | Past session history and replay |
| `src/screens/ConfigScreen.tsx` | Configuration UI with tabs (see config/ subdirectory) |
| `src/screens/config/EnvSetup.tsx` | API key setup and provider health check |
| `src/screens/config/ReviewersTab.tsx` | Reviewer selection and model assignment |
| `src/screens/config/SupportersTab.tsx` | Supporter (discussion moderator) configuration |
| `src/screens/config/ModeratorTab.tsx` | Head agent (L3) configuration |
| `src/screens/config/PresetsTab.tsx` | Preset configs for common reviewer combinations |
| `src/utils/provider-status.ts` | Provider health check helper |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/components/` | 14 reusable Ink/React components (menus, inputs, panels, viewers) |
| `src/screens/` | 8 full-screen views + config/ subpages |
| `src/screens/config/` | 5 tabbed configuration pages |
| `src/hooks/` | React hooks (useRouter for screen navigation) |
| `src/utils/` | Helper functions (provider status, theme utilities) |

## For AI Agents

### Working In This Directory

**Language & Tools:**
- TypeScript (strict mode), React 19, Ink 6.8
- Testing: vitest with ink-testing-library
- Build: skip (compiled by root tsup)

**Dependencies:**
- `ink` — React rendering to terminal
- `ink-select-input` — keyboard-driven menu selection
- `react` — component framework
- `@codeagora/core` — pipeline execution (imported into screens)
- `@codeagora/shared` — types, i18n, config schemas

**Key Commands:**
- `pnpm typecheck` — type-check this package
- `pnpm test` — run tests in this package
- `pnpm lint` — lint sources

### Common Patterns

**Component Structure:**
- All components are functional React (FC or React.JSX.Element return)
- Import `Box`, `Text` from `ink` for layout
- Use `colors`, `icons`, `borders` from `theme.ts` for consistent styling
- Props are typed with interfaces (not inline)

**Screen Navigation:**
- `useRouter()` hook provides `screen`, `navigate()`, `goBack()`, `canGoBack`
- `navigate('screen-name')` adds to history
- Screens must handle `onNavigate()` and `onBack()` callbacks
- Home screen is the fallback for invalid states

**State Management in App.tsx:**
- `reviewParams` — diff path and other review setup from ReviewSetupScreen
- `pipelineResult` — final verdict, discussions, evidenceDocs from PipelineScreen
- `diffContent` — raw diff file read on pipeline complete
- `evidenceDocs` — extracted from topIssues for ContextScreen

**Keyboard Input:**
- `useInput()` from Ink handles all keyboard input
- Global `q` key exits or goes back (except on detail screens)
- Screens handle their own key bindings (Enter, arrow keys in menus)

**Theme & Colors:**
- Severity: HARSHLY_CRITICAL/CRITICAL → red, WARNING → yellow, SUGGESTION → cyan
- Decision: ACCEPT → green, REJECT → red, NEEDS_HUMAN → yellow
- Use `severityColor()`, `decisionColor()`, `statusColor()` helpers

**Diff Rendering:**
- `DiffViewer` handles inline diff display (syntax-aware if possible)
- `ContextScreen` combines diff + evidence docs side-by-side

**Real-time Updates:**
- `PipelineScreen` polls pipeline orchestrator for phase updates
- Shows progress: L0 selection → L1 reviews → L2 debate → L3 verdict
- Handles timeouts and partial failures gracefully

### Dependencies
#### Internal
- `@codeagora/core` — PipelineResult, runPipeline(), session/discussion types
- `@codeagora/shared` — i18n (t()), config/reviewer types, utilities

#### External
- `ink` (^6.8) — React-to-terminal rendering
- `ink-select-input` (^6.2) — menu selection component
- `react` (^19.2) — component framework

<!-- MANUAL: -->
