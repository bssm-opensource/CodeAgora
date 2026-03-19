<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# src/frontend/ — React SPA

## Purpose

Interactive dashboard frontend with:
- **8 pages** for viewing sessions, costs, models, discussions, config, and pipeline status
- **31 reusable components** for charts, tables, panels, badges, and data visualization
- **3 custom hooks** for API calls, WebSocket events, and pipeline state management
- **Utilities** for data formatting, filtering, and transformation
- **Global styling** via Tailwind CSS

## Key Files

| File | Description |
|------|-------------|
| `main.tsx` | React root render, BrowserRouter setup, global CSS import |
| `App.tsx` | Route definitions, page mounting via React Router v6 |
| `index.html` | HTML shell with `<div id="root">` mount point |
| `styles/globals.css` | Global Tailwind and custom styles |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `components/` | 31 reusable UI components |
| `pages/` | 8 page components (Dashboard, Sessions, Models, Costs, etc.) |
| `hooks/` | 3 custom hooks (useApi, useWebSocket, usePipelineEvents) |
| `utils/` | Data formatters and helpers |

## Pages Overview

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | Overview dashboard with key metrics |
| Sessions | `/sessions` | List all review sessions |
| ReviewDetail | `/sessions/:date/:id` | Detailed view of a single review session |
| Models | `/models` | Model intelligence and Thompson Sampling data |
| Costs | `/costs` | Cost analytics and trends |
| Discussions | `/discussions` | Debate history and discussion threads |
| Config | `/config` | Configuration UI for editing settings |
| Pipeline | `/pipeline` | Real-time pipeline execution status |

## For AI Agents

### Working In This Directory

**Setup:**
```bash
cd packages/web
pnpm install
pnpm dev          # dev server with HMR
pnpm build        # production build to dist/frontend
pnpm test         # vitest in frontend/
pnpm typecheck    # TypeScript type check
```

**Adding a New Page:**
1. Create `pages/NewPage.tsx` with React component export.
2. Import in `App.tsx`.
3. Add route: `<Route path="/newpage" element={<NewPage />} />`.
4. Optionally add sidebar link in `components/Sidebar.tsx`.

**Adding a New Component:**
1. Create `components/NewComponent.tsx`.
2. Define props interface, render JSX.
3. Use `useApi()` or `usePipelineEvents()` if it needs data.
4. Export as named function component.

**Styling:**
- Use Tailwind utility classes (globals.css imports Tailwind).
- No CSS modules; inline classes on elements.
- Color palette defined in Tailwind config.

**Data Fetching:**
```typescript
// Simple API call
const { data, loading, error, refetch } = useApi<SessionData>('/api/sessions');

// Real-time pipeline events
const { pipeline, connected } = usePipelineEvents();

// Conditional rendering
if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;
```

### Common Patterns

**Page Template:**
```typescript
import React from 'react';
import { useApi } from '../hooks/useApi.js';

export function MyPage(): React.JSX.Element {
  const { data, loading, error } = useApi<MyDataType>('/api/endpoint');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {/* render data */}
    </div>
  );
}
```

**Component Template:**
```typescript
import React from 'react';

interface MyComponentProps {
  title: string;
  data: unknown[];
}

export function MyComponent({ title, data }: MyComponentProps): React.JSX.Element {
  return (
    <div className="p-4 border rounded">
      <h2>{title}</h2>
      {/* render data */}
    </div>
  );
}
```

**Conditional Rendering:**
```typescript
{condition && <div>Shown when true</div>}
{array.length > 0 ? <List items={array} /> : <EmptyState />}
```

**Event Handling:**
```typescript
const handleClick = () => {
  // Handle click
  refetch(); // Re-fetch data
};

return <button onClick={handleClick}>Click me</button>;
```

## Components Overview (31 total)

### Layout & Navigation
- `Layout.tsx` — Page container with sidebar and header
- `Sidebar.tsx` — Navigation menu

### Data Visualization
- `TrendChart.tsx` — Line/area chart component
- `CostTrend.tsx` — Cost trend visualization
- `QualityTrend.tsx` — Quality trend visualization
- `ModelLeaderboard.tsx` — Thompson Sampling model rankings

### Panels & Cards
- `IssueCard.tsx` — Issue summary card
- `CostSummary.tsx` — Cost aggregation panel
- `SeveritySummary.tsx` — Severity distribution summary
- `CostBreakdown.tsx` — Cost breakdown by reviewer/layer

### Real-Time & Status
- `PipelineStages.tsx` — Pipeline execution progress
- `ConsensusProgress.tsx` — Discussion consensus meter
- `ProgressBar.tsx` — Generic progress indicator
- `EventLog.tsx` — Real-time event stream display
- `LiveDiscussion.tsx` — Live discussion thread display

### Forms & Input
- `ConfigField.tsx` — Single config field editor
- `ConfigSection.tsx` — Multi-field config section
- `ConfigPreview.tsx` — Config preview/validation
- `ReviewerEditor.tsx` — Reviewer configuration editor

### Tables & Lists
- `SessionList.tsx` — Session list with filtering
- `DiscussionList.tsx` — Discussion thread list
- `SessionFilters.tsx` — Filter controls for sessions
- `SessionCompare.tsx` — Multi-session comparison

### Analytics & Reporting
- `DebateTimeline.tsx` — Timeline of debate rounds
- `VerdictBanner.tsx` — Final verdict display
- `ProviderReliability.tsx` — Provider success/failure stats
- `ReviewerCosts.tsx` — Cost breakdown by reviewer

### UI Elements
- `SeverityBadge.tsx` — Colored severity indicator
- `DiffViewer.tsx` — Syntax-highlighted diff display
- `StanceVisualization.tsx` — Reviewer stance visualization
- `SelectionFrequency.tsx` — Model selection frequency chart
- `Toast.tsx` — Toast notification component

## Hooks Overview

| Hook | Purpose | Returns |
|------|---------|---------|
| `useApi<T>(path)` | Fetch REST API data | `{ data, loading, error, refetch }` |
| `useWebSocket(path)` | Connect to WebSocket server | `{ messages, connected, send }` |
| `usePipelineEvents()` | Process pipeline events from WebSocket | `{ pipeline, connected, ...stage data }` |

## Utilities

| Module | Purpose |
|--------|---------|
| `config-helpers.ts` | Config UI rendering, validation |
| `cost-helpers.ts` | Cost calculation, formatting, aggregation |
| `discussion-helpers.ts` | Discussion data transformation |
| `model-helpers.ts` | Model/bandit data processing |
| `review-helpers.ts` | Review/issue data helpers |
| `session-filters.ts` | Session filtering and search |

## Dependencies

### Internal
- `@codeagora/core` — Types (SessionMetadata, ConfigSchema)
- `@codeagora/shared` — Utility types

### External
- `react` — UI library
- `react-router-dom` — Client-side routing
- `react-dom` — React DOM binding

## Patterns & Conventions

**Component Organization:**
- Shared components in `components/`.
- Page-specific layout in `pages/`.
- Props are typed via TypeScript interfaces.
- All components use React.JSX.Element return type.

**Styling:**
- Tailwind utility classes (no CSS modules).
- Responsive via Tailwind breakpoints (sm, md, lg, etc.).
- Color palette via Tailwind config.

**Error Handling:**
- `useApi` captures fetch errors.
- Render error state conditionally.
- Toast component for user notifications.

**Data Flow:**
- Pages fetch data via `useApi()` hook.
- Components receive data as props.
- Real-time updates via `usePipelineEvents()` hook.
- No global state (Redux, Zustand, etc.); keep component state local.

**Testing:**
- Component tests use @testing-library/react.
- Mock data fixtures in test setup.
- Hook tests mock API responses.

<!-- MANUAL: -->
