/**
 * StatCards — Grid of summary metric cards for the Dashboard.
 * Shows total sessions, status distribution, and total cost.
 */

import React from 'react';

interface SessionInfo {
  sessionId: string;
  date: string;
  status: 'in_progress' | 'completed' | 'failed';
}

interface CostInfo {
  totalCost: number;
  sessionCount: number;
}

interface StatCardsProps {
  sessions: readonly SessionInfo[];
  costs: CostInfo | null;
}

function formatCost(value: number): string {
  return `$${value.toFixed(4)}`;
}

export function StatCards({ sessions, costs }: StatCardsProps): React.JSX.Element {
  const total = sessions.length;
  const completed = sessions.filter((s) => s.status === 'completed').length;
  const inProgress = sessions.filter((s) => s.status === 'in_progress').length;
  const failed = sessions.filter((s) => s.status === 'failed').length;

  return (
    <div className="stat-cards-grid">
      <div className="stat-card">
        <div className="stat-card__label">Total Sessions</div>
        <div className="stat-card__value">{total}</div>
        <div className="stat-card__detail">
          {completed} completed, {inProgress} active
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__label">Completed</div>
        <div className="stat-card__value stat-card__value--success">{completed}</div>
        <div className="stat-card__detail">
          {total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%'} success rate
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__label">In Progress</div>
        <div className="stat-card__value stat-card__value--accent">{inProgress}</div>
      </div>

      <div className="stat-card">
        <div className="stat-card__label">Failed</div>
        <div className="stat-card__value stat-card__value--error">{failed}</div>
      </div>

      <div className="stat-card">
        <div className="stat-card__label">Total Cost</div>
        <div className="stat-card__value">
          {costs ? formatCost(costs.totalCost) : '--'}
        </div>
        <div className="stat-card__detail">
          {costs && costs.sessionCount > 0
            ? `${formatCost(costs.totalCost / costs.sessionCount)} avg per session`
            : ''}
        </div>
      </div>
    </div>
  );
}
