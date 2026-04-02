/**
 * WeeklyTrend — CSS-only 7-day bar chart showing sessions per day.
 * No chart library required. Uses CSS custom properties for bar heights.
 */

import React from 'react';

interface SessionInfo {
  date: string;
  timestamp: number;
}

interface WeeklyTrendProps {
  sessions: readonly SessionInfo[];
}

interface DayBucket {
  label: string;
  shortLabel: string;
  count: number;
}

function buildWeekBuckets(sessions: readonly SessionInfo[]): DayBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets: DayBucket[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    buckets.push({
      label: dateStr,
      shortLabel: dayNames[d.getDay()]!,
      count: 0,
    });
  }

  for (const session of sessions) {
    const bucket = buckets.find((b) => b.label === session.date);
    if (bucket) {
      bucket.count += 1;
    }
  }

  return buckets;
}

export function WeeklyTrend({ sessions }: WeeklyTrendProps): React.JSX.Element {
  const buckets = buildWeekBuckets(sessions);
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="weekly-trend">
      <h3 className="weekly-trend__title">7-Day Activity</h3>
      <div className="weekly-trend__chart" role="img" aria-label="Sessions per day for the last 7 days">
        {buckets.map((bucket) => {
          const heightPercent = (bucket.count / maxCount) * 100;
          return (
            <div key={bucket.label} className="weekly-trend__column">
              <div className="weekly-trend__bar-container">
                <span className="weekly-trend__count" aria-hidden="true">
                  {bucket.count > 0 ? bucket.count : ''}
                </span>
                <div
                  className="weekly-trend__bar"
                  style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  title={`${bucket.label}: ${bucket.count} session${bucket.count !== 1 ? 's' : ''}`}
                />
              </div>
              <span className="weekly-trend__day-label">{bucket.shortLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
