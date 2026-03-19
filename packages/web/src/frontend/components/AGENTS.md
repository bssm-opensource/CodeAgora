<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# src/frontend/components/ — Reusable Components

## Purpose

31 reusable React components for building the dashboard UI across all pages.
- **Layout & Navigation:** Layout, Sidebar
- **Data Visualization:** Charts (trends, leaderboards, frequency)
- **Panels & Cards:** Issue cards, cost summaries, severity breakdowns
- **Real-Time Display:** Pipeline stages, event logs, live discussions
- **Forms & Configuration:** Config fields, reviewers editor, preview panels
- **Tables & Lists:** Sessions, discussions with filters
- **Analytics:** Debate timeline, provider reliability, verdicts
- **UI Elements:** Badges, tooltips, toasts, diff viewers

## Key Files

| File | Description |
|------|-------------|
| `Layout.tsx` | Page container with sidebar, header, and main content area |
| `Sidebar.tsx` | Navigation menu with routes to all pages |
| `Toast.tsx` | Toast notification system for alerts/confirmations |

## Component Categories

### Layout & Navigation (2)
- `Layout.tsx` — Page container with navigation
- `Sidebar.tsx` — Sidebar menu with route links

### Data Visualization (7)
- `TrendChart.tsx` — Generic line/area chart
- `CostTrend.tsx` — Cost over time visualization
- `QualityTrend.tsx` — Quality metrics over time
- `ModelLeaderboard.tsx` — Thompson Sampling model rankings
- `SelectionFrequency.tsx` — Model selection frequency chart
- `StanceVisualization.tsx` — Reviewer stance visualization
- `ProviderReliability.tsx` — Provider success rate stats

### Panels & Cards (5)
- `IssueCard.tsx` — Single issue/finding card
- `CostSummary.tsx` — Total cost aggregation panel
- `SeveritySummary.tsx` — Severity distribution summary
- `CostBreakdown.tsx` — Cost by reviewer/layer breakdown
- `ReviewerCosts.tsx` — Per-reviewer cost breakdown

### Real-Time & Status (4)
- `PipelineStages.tsx` — Pipeline stage progress visualization
- `ConsensusProgress.tsx` — Discussion consensus progress meter
- `ProgressBar.tsx` — Generic progress bar component
- `EventLog.tsx` — Real-time event stream display

### Forms & Input (4)
- `ConfigField.tsx` — Single configuration field (text, select, etc.)
- `ConfigSection.tsx` — Multi-field config section with title
- `ConfigPreview.tsx` — Config validation and preview
- `ReviewerEditor.tsx` — Reviewer configuration editor panel

### Tables & Lists (4)
- `SessionList.tsx` — Paginated session list with sorting
- `DiscussionList.tsx` — Discussion thread list
- `SessionFilters.tsx` — Filter controls (date, status, etc.)
- `SessionCompare.tsx` — Side-by-side session comparison

### Analytics & Reporting (2)
- `DebateTimeline.tsx` — Timeline of debate/discussion rounds
- `VerdictBanner.tsx` — Final verdict display with styling

### UI Elements (5)
- `SeverityBadge.tsx` — Colored severity badge (critical, warning, etc.)
- `DiffViewer.tsx` — Syntax-highlighted diff display
- `LiveDiscussion.tsx` — Live discussion thread with messages
- `Toast.tsx` — Toast notification component
- (others as needed)

## For AI Agents

### Working In This Directory

**Component Creation:**
1. Create a new `.tsx` file with the component name.
2. Define props interface at top of file.
3. Implement component as React functional component.
4. Return `React.JSX.Element`.
5. Export as named export.

**Example Component:**
```typescript
import React from 'react';

interface MyComponentProps {
  title: string;
  items: string[];
  onSelect?: (item: string) => void;
}

export function MyComponent({ title, items, onSelect }: MyComponentProps): React.JSX.Element {
  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li
            key={item}
            className="cursor-pointer hover:bg-gray-100 p-1 rounded"
            onClick={() => onSelect?.(item)}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Component Reusability Guidelines:**
- Accept all configuration via props.
- Avoid hardcoded strings/styles; parameterize them.
- Keep component scope narrow (single responsibility).
- Export a clean, documented props interface.

**Using Components in Pages:**
```typescript
import { MyComponent } from '../components/MyComponent.js';

export function MyPage(): React.JSX.Element {
  return (
    <div>
      <MyComponent
        title="My List"
        items={['a', 'b', 'c']}
        onSelect={(item) => console.log(item)}
      />
    </div>
  );
}
```

**Styling Patterns:**
- Use Tailwind utility classes directly on elements.
- Combine utilities for responsive design: `className="p-2 md:p-4 lg:p-6"`.
- Color palette: `bg-red-500`, `text-blue-600`, `border-gray-300`, etc.
- No CSS modules; keep styling in JSX.

**Props Design:**
- Define `Props` interface for each component.
- Use optional props for customization (`title?: string`).
- Avoid prop drilling; use component composition instead.

**Event Handlers:**
- Accept callbacks via props: `onClick`, `onSelect`, `onSubmit`, etc.
- Avoid side effects in render; use hooks if needed.

### Common Patterns

**Conditional Rendering:**
```typescript
{isLoading && <Spinner />}
{error && <ErrorBanner message={error} />}
{data && <MyComponent data={data} />}
```

**List Rendering:**
```typescript
<div className="space-y-2">
  {items.map((item) => (
    <ItemComponent key={item.id} item={item} />
  ))}
</div>
```

**Styled Container:**
```typescript
<div className="p-4 bg-white rounded-lg shadow border border-gray-200">
  {/* content */}
</div>
```

**Badge Component:**
```typescript
<span className={`px-2 py-1 rounded text-sm font-medium ${
  severity === 'critical' ? 'bg-red-100 text-red-800' :
  severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
  'bg-gray-100 text-gray-800'
}`}>
  {severity}
</span>
```

## Dependencies

### Internal (same package)
- `../hooks/` — useApi, useWebSocket, usePipelineEvents
- `../utils/` — Formatting and helper functions
- Other components (composition)

### External
- `react` — Component library
- Tailwind CSS — Styling (imported via globals.css)

## Patterns & Conventions

**Naming:** Use PascalCase for component files and exports.

**Props:** Always define a Props interface, use destructuring in function signature.

**Return Type:** All components return `React.JSX.Element`.

**Children Prop:** Use `children?: React.ReactNode` for flexible composition.

**Styling:** Tailwind classes only; no inline styles unless necessary.

**Comments:** Document props interface and non-obvious logic.

**Testing:** Render components with mock data in tests; test user interactions and conditional rendering.

<!-- MANUAL: -->
