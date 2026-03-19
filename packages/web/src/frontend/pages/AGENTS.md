<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# src/frontend/pages/ — Page Components

## Purpose

8 full-page components that define the main navigation and views:
1. **Dashboard** — Overview with key metrics and recent activity
2. **Sessions** — List of all review sessions with filtering
3. **ReviewDetail** — Detailed view of a single review session
4. **Models** — Model intelligence and Thompson Sampling data
5. **Costs** — Cost analytics, trends, and breakdown
6. **Discussions** — Debate history and discussion threads
7. **Config** — Configuration UI for editing settings
8. **Pipeline** — Real-time pipeline execution status and progress

Each page is mounted via a route in `App.tsx`.

## Key Files

| File | Description |
|------|-------------|
| `Dashboard.tsx` | Homepage with metrics overview |
| `Sessions.tsx` | Session list view with search/filter |
| `ReviewDetail.tsx` | Single session detail page |
| `Models.tsx` | Model leaderboard and bandit data |
| `Costs.tsx` | Cost analytics dashboard |
| `Discussions.tsx` | Discussion thread list and detail |
| `Config.tsx` | Configuration editor UI |
| `Pipeline.tsx` | Real-time pipeline status view |

## Pages Overview

### Dashboard (`/`)
**Purpose:** Homepage with key metrics and overview.
**Components:**
- Cost summary
- Recent sessions
- Quality trends
- Model leaderboard snippet
**Data Source:** `/api/costs`, `/api/sessions`, `/api/models`

### Sessions (`/sessions`)
**Purpose:** Browse and filter all review sessions.
**Features:**
- Session list with sorting/pagination
- Filter by date, status, cost range
- Link to `/sessions/:date/:id` for detail view
**Data Source:** `/api/sessions`
**Components:** SessionList, SessionFilters

### ReviewDetail (`/sessions/:date/:id`)
**Purpose:** Detailed view of a single review.
**Features:**
- Full issue list with findings
- Diff viewer
- Cost breakdown
- Discussion thread
- Reviewer stance visualization
**Data Source:** `/api/sessions/:date/:id`
**Components:** IssueCard, DiffViewer, CostBreakdown, DebateTimeline, VerdictBanner

### Models (`/models`)
**Purpose:** Thompson Sampling model intelligence and selection metrics.
**Features:**
- Model leaderboard (accuracy, success rate)
- Selection frequency chart
- Provider reliability stats
**Data Source:** `/api/models`
**Components:** ModelLeaderboard, SelectionFrequency, ProviderReliability

### Costs (`/costs`)
**Purpose:** Cost analytics and trends across all sessions.
**Features:**
- Cost summary card
- Cost trend chart
- Cost breakdown by reviewer/layer
- Filtering by date range, provider
**Data Source:** `/api/costs`
**Components:** CostSummary, CostTrend, CostBreakdown, ReviewerCosts

### Discussions (`/discussions`)
**Purpose:** Browse debate history and discussion threads.
**Features:**
- Discussion list with filtering
- Discussion detail with message thread
- Stance visualization for each round
**Data Source:** `/api/sessions` (discussions embedded)
**Components:** DiscussionList, LiveDiscussion, StanceVisualization

### Config (`/config`)
**Purpose:** View and edit CodeAgora configuration.
**Features:**
- Config field editors (text, select, multi-select)
- Config section grouping
- Preview and validation
- Save to `.ca/config.json`
**Data Source:** `/api/config`
**Components:** ConfigSection, ConfigField, ConfigPreview, ReviewerEditor

### Pipeline (`/pipeline`)
**Purpose:** Real-time view of pipeline execution.
**Features:**
- Pipeline stage progress
- Current stage details
- Event log stream
- Consensus progress meter
**Data Source:** WebSocket `/ws` (ProgressEvent, DiscussionEvent)
**Components:** PipelineStages, ConsensusProgress, EventLog
**Hooks:** usePipelineEvents

## For AI Agents

### Working In This Directory

**Page Creation:**
1. Create a new `.tsx` file with the page component.
2. Fetch data via `useApi()` or `usePipelineEvents()` hook.
3. Render conditional loading/error states.
4. Compose page layout using components from `components/`.
5. Export as named function: `export function PageName()`.
6. Add route in `App.tsx`: `<Route path="/path" element={<PageName />} />`.

**Page Template:**
```typescript
import React from 'react';
import { useApi } from '../hooks/useApi.js';
import { MyComponent } from '../components/MyComponent.js';

interface PageData {
  title: string;
  items: unknown[];
}

export function MyPage(): React.JSX.Element {
  const { data, loading, error } = useApi<PageData>('/api/path');

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{data?.title}</h1>
      <MyComponent data={data?.items ?? []} />
    </div>
  );
}
```

**Routing:**
In `App.tsx`, add the route:
```typescript
<Route path="/mypage" element={<MyPage />} />
```

Then add a navigation link in `components/Sidebar.tsx`:
```typescript
<Link to="/mypage">My Page</Link>
```

**Data Fetching:**
```typescript
// Simple API call
const { data, loading, error, refetch } = useApi<DataType>('/api/endpoint');

// With refetch button
<button onClick={refetch}>Refresh</button>
```

**Real-Time Events (Pipeline page only):**
```typescript
const { pipeline, connected } = usePipelineEvents();

if (!connected) {
  return <div>Disconnected from server...</div>;
}

return <PipelineStages stage={pipeline.currentStage} />;
```

### Common Patterns

**Fetch & Display:**
```typescript
const { data, loading, error } = useApi<SessionList>('/api/sessions');

if (loading) return <Spinner />;
if (error) return <ErrorBanner message={error} />;

return <SessionList sessions={data?.sessions ?? []} />;
```

**Filter & Sort:**
```typescript
const [filter, setFilter] = React.useState<FilterOptions>({});
const { data } = useApi<SessionList>('/api/sessions');

const filtered = data?.sessions.filter(s => matchesFilter(s, filter)) ?? [];
const sorted = filtered.sort((a, b) => a.date.localeCompare(b.date));

return (
  <div>
    <SessionFilters onChange={setFilter} />
    <SessionList sessions={sorted} />
  </div>
);
```

**Nested Routes (detail page):**
```typescript
// App.tsx
<Route path="/sessions/:date/:id" element={<ReviewDetail />} />

// ReviewDetail.tsx
import { useParams } from 'react-router-dom';

export function ReviewDetail(): React.JSX.Element {
  const { date, id } = useParams<{ date: string; id: string }>();
  const { data } = useApi(`/api/sessions/${date}/${id}`);

  return <div>{/* detail content */}</div>;
}
```

**Tabs or Sections:**
```typescript
const [tab, setTab] = React.useState<'overview' | 'details'>('overview');

return (
  <div>
    <div className="border-b">
      <button onClick={() => setTab('overview')}>Overview</button>
      <button onClick={() => setTab('details')}>Details</button>
    </div>
    {tab === 'overview' && <OverviewSection />}
    {tab === 'details' && <DetailsSection />}
  </div>
);
```

## Page Routing Map

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Dashboard | Overview |
| `/sessions` | Sessions | Session list |
| `/sessions/:date/:id` | ReviewDetail | Session detail |
| `/models` | Models | Model intelligence |
| `/costs` | Costs | Cost analytics |
| `/discussions` | Discussions | Discussion browser |
| `/config` | Config | Configuration editor |
| `/pipeline` | Pipeline | Real-time status |

## Dependencies

### Internal (same package)
- `../hooks/` — useApi, useWebSocket, usePipelineEvents
- `../components/` — All reusable components
- `../utils/` — Data formatters and helpers
- `react-router-dom` — useParams, Link, etc.

### External
- `react` — Component library
- `react-router-dom` — Routing and navigation

## Patterns & Conventions

**Naming:** PascalCase for component names, match filename (Config.tsx exports ConfigPage or Config).

**Data Fetching:** Always handle loading and error states gracefully.

**Props:** Pages receive no props; use URL params via `useParams()` for routing parameters.

**Composition:** Use components from `components/` for UI building blocks.

**Testing:** Test page rendering with mock API data; verify route parameters are used correctly.

<!-- MANUAL: -->
