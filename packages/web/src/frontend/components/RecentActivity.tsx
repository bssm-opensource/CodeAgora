/**
 * RecentActivity — List of the most recent sessions with status badges.
 * Displayed on the Dashboard for quick overview of latest reviews.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SessionInfo {
  sessionId: string;
  date: string;
  status: 'in_progress' | 'completed' | 'failed' | 'interrupted';
  diffPath: string;
  timestamp: number;
}

interface RecentActivityProps {
  sessions: readonly SessionInfo[];
  limit?: number;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    case 'failed':
      return 'Failed';
    case 'interrupted':
      return 'Interrupted';
    default:
      return status;
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'status-badge--completed';
    case 'in_progress':
      return 'status-badge--in-progress';
    case 'failed':
      return 'status-badge--failed';
    case 'interrupted':
      return 'status-badge--interrupted';
    default:
      return '';
  }
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function extractFileName(diffPath: string): string {
  const parts = diffPath.split('/');
  return parts[parts.length - 1] ?? diffPath;
}

export function RecentActivity({ sessions, limit = 10 }: RecentActivityProps): React.JSX.Element {
  const navigate = useNavigate();

  const sorted = [...sessions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);

  if (sorted.length === 0) {
    return (
      <div className="recent-activity">
        <h3 className="recent-activity__title">Recent Activity</h3>
        <p className="recent-activity__empty">No sessions yet</p>
      </div>
    );
  }

  return (
    <div className="recent-activity">
      <h3 className="recent-activity__title">Recent Activity</h3>
      <ul className="recent-activity__list" role="list">
        {sorted.map((session) => (
          <li
            key={`${session.date}-${session.sessionId}`}
            className="recent-activity__item"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/sessions/${session.date}/${session.sessionId}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/sessions/${session.date}/${session.sessionId}`);
              }
            }}
          >
            <div className="recent-activity__item-left">
              <span className="recent-activity__date">
                {session.date} {formatTimestamp(session.timestamp)}
              </span>
              <span className="recent-activity__file">
                {extractFileName(session.diffPath)}
              </span>
            </div>
            <div className="recent-activity__item-right">
              <span className={`status-badge ${statusClass(session.status)}`}>
                {statusLabel(session.status)}
              </span>
              <span className="recent-activity__session-id">#{session.sessionId}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
