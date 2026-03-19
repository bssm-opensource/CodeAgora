<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# TUI Components

## Purpose
Reusable Ink/React terminal components for the review UI. Handles layout, input, navigation, and specialized displays (diffs, debates, pipeline progress).

## Key Files

| File | Description |
|------|-------------|
| `Panel.tsx` | Bordered container with optional title — used in every screen |
| `Header.tsx` | App title + version bar (centered at top) |
| `StatusBar.tsx` | Footer with navigation hints and current screen name |
| `Menu.tsx` | Selectable list with keyboard navigation (arrow keys, Enter) |
| `TextInput.tsx` | Single-line text input field (used in config and diff selection) |
| `TabBar.tsx` | Tab switcher — select active tab with arrow keys |
| `ScrollableList.tsx` | Scrollable list with keyboard controls (Page Up/Down, arrow keys) |
| `DetailRow.tsx` | Two-column row: left key (bold), right value — for displaying metadata |
| `ModelSelector.tsx` | Dropdown selector for LLM models and providers |
| `DiffViewer.tsx` | Renders unified diff with optional syntax highlighting |
| `DebatePanel.tsx` | Multi-round debate/discussion visualization with collapses |
| `PipelineProgress.tsx` | Real-time progress bar for pipeline phases (L0→L1→L2→L3) |
| `HelpOverlay.tsx` | Keyboard shortcut reference (toggleable overlay) |
| `Toast.tsx` | Temporary notification (error, success, info) — auto-dismiss |

## Subdirectories
None — all components at root level.

## For AI Agents

### Working In This Directory
- Add new components as simple React functions returning JSX.Element
- Use `Box` and `Text` from Ink for layout and text rendering
- Import and use `colors`, `icons`, `borders` from `../theme.js` for consistency
- Keep components small and focused (single responsibility)
- Always type props with interfaces

### Common Patterns
- **Props interface:** Declare interface for each component's props
- **Ink imports:** `import { Box, Text } from 'ink';`
- **Theme usage:** `import { colors, icons, borders, severityColor } from '../theme.js'`
- **Default exports:** Export the component as default or named (keep consistent)
- **Layout:** Use `Box` with `flexDirection`, `marginX`/`marginY`, `paddingX`/`paddingY`, `width`/`height`
- **Text styling:** Apply `color`, `bold`, `dimColor` to `Text` elements
- **Borders:** Apply to Box with `borderStyle` and `borderColor`

### Key Dependencies
- `ink` — Box, Text, useInput
- `react` — React.FC, React.ReactNode, etc.
- `../theme.js` — colors, icons, borders, helper functions
- `ink-select-input` — SelectInput for menus (in Menu.tsx)

### Component Responsibilities

| Component | Responsibility |
|-----------|-----------------|
| Panel | Bordered frame with title (container) |
| Header | App title + version (no state) |
| StatusBar | Navigation hints (no state) |
| Menu | Selectable list with keyboard (stateful) |
| TextInput | Text field input (stateful) |
| TabBar | Tab selection (stateful) |
| ScrollableList | Long list with scroll (stateful) |
| DetailRow | Key-value pair display (no state) |
| ModelSelector | Model dropdown (stateful) |
| DiffViewer | Diff rendering (no state, syntax-aware if possible) |
| DebatePanel | Debate rounds display (collapsible) |
| PipelineProgress | Phase progress + real-time updates (stateful) |
| HelpOverlay | Keyboard shortcuts (stateful toggle) |
| Toast | Temp notification (auto-dismiss, stateful) |

<!-- MANUAL: -->
