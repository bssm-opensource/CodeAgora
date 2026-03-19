<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# TUI Source Files

## Purpose
React/Ink component and screen implementations for terminal UI. All source code for the interactive review orchestrator.

## Key Files

| File | Description |
|------|-------------|
| `App.tsx` | Root app — screen routing, state lifecycle (reviewParams, pipelineResult, diffContent, evidenceDocs) |
| `index.tsx` | Entrypoint — Ink render() with alternate screen buffer (preserves terminal history) |
| `theme.ts` | Color palette, icons, borders, semantic helpers (severity/decision/status color + icon mappers) |
| `hooks/useRouter.ts` | Screen navigation hook — tracks history, supports back navigation |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `components/` | 14 reusable Ink components (Header, StatusBar, Panel, Menu, ModelSelector, TextInput, TabBar, ScrollableList, DetailRow, DiffViewer, DebatePanel, PipelineProgress, HelpOverlay, Toast) |
| `screens/` | 8 full screens (Home, ReviewSetup, Pipeline, Results, Context, Debate, Sessions, Config) |
| `screens/config/` | Config tabs (EnvSetup, ReviewersTab, SupportersTab, ModeratorTab, PresetsTab) |
| `utils/` | Helper functions (provider-status check) |

## For AI Agents

### Working In This Directory
- Modify component structure, add/remove screens, update routing
- Type all props with interfaces
- Import Ink primitives from `ink` and layout with `Box`/`Text`
- Use `theme.ts` constants for colors/icons

### Common Patterns
- **Props pattern:** `interface ScreenNameProps { onNavigate: (s: Screen) => void; onBack: () => void; ... }`
- **Keyboard handling:** `useInput()` for global keys; screens handle local keys
- **Conditional rendering:** Use `renderScreen(screen)` switch in App.tsx
- **Theme usage:** `import { colors, icons, borders, severityColor } from '../theme.js'`
- **Ref to core:** Import PipelineResult and runPipeline from @codeagora/core

### Dependencies
#### Internal
- `@codeagora/core` — types, pipeline runner
- `@codeagora/shared` — i18n (t()), types

#### External
- `ink` — Box, Text, render, useApp, useInput
- `ink-select-input` — select menu component
- `react` — FC, useState, useCallback, etc.

<!-- MANUAL: -->
