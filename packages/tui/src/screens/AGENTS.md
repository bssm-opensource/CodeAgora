<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# TUI Screens

## Purpose
Full-screen views for each major workflow: home menu, diff selection, pipeline execution, results, debate, session replay, and configuration.

## Key Files

| File | Description |
|------|-------------|
| `HomeScreen.tsx` | Main menu (Review, Sessions, Config, Quit) — entry point |
| `ReviewSetupScreen.tsx` | Diff file selection and submission to pipeline |
| `PipelineScreen.tsx` | Real-time pipeline execution monitor (L0→L1→L2→L3 phases) |
| `ResultsScreen.tsx` | Final verdict, summary stats, top issues list |
| `ContextScreen.tsx` | Diff context explorer + evidence docs side-by-side |
| `DebateScreen.tsx` | Multi-issue debate rounds with consensus visualization |
| `SessionsScreen.tsx` | Past session history, replay, and export |
| `ConfigScreen.tsx` | Configuration with 5 tabs (see config/ subdirectory) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `config/` | 5 configuration tabs: EnvSetup, ReviewersTab, SupportersTab, ModeratorTab, PresetsTab |

## For AI Agents

### Working In This Directory
- Each screen is a React component with standard props: `onNavigate`, `onBack`, `onError`, etc.
- Screens must handle keyboard input via `useInput()` — do not rely on global input
- Import `Panel`, `Menu`, `DetailRow` components from `../components/`
- Use `theme.ts` for all styling (colors, icons, borders)
- State should be kept minimal (use hooks only for local UI state)
- Navigation: call `onNavigate(screen)` or `onBack()` instead of managing router directly

### Screen Navigation Flow
```
Home → ReviewSetup → Pipeline → Results
         ├→ back to Home
         └→ Results → ContextScreen or DebateScreen
            ├→ back to Results
            └→ SessionsScreen
               └→ back to Home
Config → back to Home (or previous screen)
```

### Common Props Pattern
```typescript
interface ScreenNameProps {
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
  onError?: (err: string) => void;
  // screen-specific data
}
```

### Key Implementation Details

| Screen | State | Polling | Key Interactions |
|--------|-------|---------|-------------------|
| HomeScreen | none | none | Arrow keys + Enter to select menu |
| ReviewSetupScreen | selected path, reviewing | none | Enter to submit, Tab for file browser |
| PipelineScreen | phase, status, logs | yes (phase updates) | Real-time phase display, pause/cancel |
| ResultsScreen | verdict, issues, filters | none | Arrow keys for issue list, 'd' for debate |
| ContextScreen | scroll position, selected issue | none | Arrow keys for scrolling, 'q' to back |
| DebateScreen | expanded rounds, filter | none | Arrow keys, 'e' to expand round |
| SessionsScreen | session list, selected session | none | Arrow keys, 'r' to replay, 'e' to export |
| ConfigScreen | active tab, settings | none | Tab key to switch tabs, Enter to apply |

### Dependencies
#### Internal
- `../components/*` — Panel, Menu, DetailRow, DiffViewer, etc.
- `../theme.js` — colors, icons, borders, helper functions
- `../hooks/useRouter.js` — useRouter hook (provides screen type)
- `@codeagora/core` — PipelineResult, runPipeline, session/discussion types
- `@codeagora/shared` — i18n (t()), types, config schemas

#### External
- `ink` — Box, Text, useInput
- `react` — FC, useState, useCallback

### Config Subdirectory Structure

| File | Purpose |
|------|---------|
| `EnvSetup.tsx` | API key input and provider health check |
| `ReviewersTab.tsx` | Enable/disable reviewers, assign models per reviewer |
| `SupportersTab.tsx` | Configure discussion supporters (moderators) |
| `ModeratorTab.tsx` | Head agent (L3) selection and settings |
| `PresetsTab.tsx` | Load/save preset reviewer combinations |

<!-- MANUAL: -->
