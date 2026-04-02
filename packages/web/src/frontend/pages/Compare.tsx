/**
 * Compare — Dedicated page for comparing two review sessions side by side.
 * URL: /compare/:dateA/:idA/:dateB/:idB
 *
 * Shows metadata, verdict comparison, config differences, and issue changes.
 */

import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { ConfigDiff } from '../components/ConfigDiff.js';
import type { SessionDetail, CompareResult } from '../utils/session-filters.js';
import { compareSessions, formatDuration } from '../utils/session-filters.js';

// ============================================================================
// Types
// ============================================================================

interface CompareParams {
  dateA: string;
  idA: string;
  dateB: string;
  idB: string;
}

// ============================================================================
// Helpers
// ============================================================================

const VERDICT_CLASS: Record<string, string> = {
  ACCEPT: 'verdict-badge--accept',
  REJECT: 'verdict-badge--reject',
  NEEDS_HUMAN: 'verdict-badge--needs-human',
};

const VERDICT_LABEL: Record<string, string> = {
  ACCEPT: 'Accept',
  REJECT: 'Reject',
  NEEDS_HUMAN: 'Needs Human',
};

const STATUS_CLASS: Record<string, string> = {
  in_progress: 'status-badge--in-progress',
  completed: 'status-badge--completed',
  failed: 'status-badge--failed',
};

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
};

/**
 * Count total issues from a session detail.
 */
function countIssues(detail: SessionDetail): number {
  let count = 0;
  if (detail.verdict?.issues) count += detail.verdict.issues.length;
  for (const review of detail.reviews) {
    if (review.issues) count += review.issues.length;
  }
  return count;
}

/**
 * Extract a config-like summary from a session for comparison.
 * Since the API does not return a config snapshot, we build one from
 * available metadata and review data.
 */
function extractConfigSummary(detail: SessionDetail): Record<string, unknown> {
  const meta = detail.metadata as unknown as Record<string, unknown>;
  const summary: Record<string, unknown> = {
    diffPath: detail.metadata.diffPath,
    status: detail.metadata.status,
  };

  if (meta['configHash']) {
    summary.configHash = meta['configHash'];
  }

  if (meta['diffHash']) {
    summary.diffHash = meta['diffHash'];
  }

  // Extract reviewer models and groups
  const reviewers: Record<string, string> = {};
  for (const review of detail.reviews) {
    const id = review.reviewerId ?? 'unknown';
    reviewers[id] = review.model ?? 'unknown';
  }
  if (Object.keys(reviewers).length > 0) {
    summary.reviewers = reviewers;
  }

  // Extract reviewer groups
  const groups = [...new Set(detail.reviews.map((r) => r.group).filter(Boolean))];
  if (groups.length > 0) {
    summary.reviewerGroups = groups;
  }

  return summary;
}

// ============================================================================
// Sub-components
// ============================================================================

function SessionMetadataCard({
  label,
  detail,
  date,
  id,
}: {
  label: string;
  detail: SessionDetail;
  date: string;
  id: string;
}): React.JSX.Element {
  const navigate = useNavigate();
  const duration = detail.metadata.completedAt
    ? detail.metadata.completedAt - detail.metadata.startedAt
    : 0;
  const issueCount = countIssues(detail);

  return (
    <div className="compare-page__meta-card">
      <div className="compare-page__meta-label">{label}</div>
      <button
        type="button"
        className="compare-page__session-link"
        onClick={() => void navigate(`/sessions/${date}/${id}`)}
      >
        {date}/{id}
      </button>
      <dl className="compare-page__meta-dl">
        <dt>Status</dt>
        <dd>
          <span className={`status-badge ${STATUS_CLASS[detail.metadata.status] ?? ''}`}>
            {STATUS_LABEL[detail.metadata.status] ?? detail.metadata.status}
          </span>
        </dd>
        <dt>Duration</dt>
        <dd>{formatDuration(duration)}</dd>
        <dt>Issues</dt>
        <dd>{issueCount}</dd>
        <dt>Reviewers</dt>
        <dd>{detail.reviews.length}</dd>
        <dt>Diff</dt>
        <dd className="compare-page__meta-path">{detail.metadata.diffPath}</dd>
      </dl>
    </div>
  );
}

function VerdictComparison({
  verdictA,
  verdictB,
}: {
  verdictA: SessionDetail['verdict'];
  verdictB: SessionDetail['verdict'];
}): React.JSX.Element {
  const decisionA = verdictA?.decision ?? 'N/A';
  const decisionB = verdictB?.decision ?? 'N/A';
  const same = decisionA === decisionB;

  return (
    <div className="compare-page__verdict-row">
      <h4 className="compare-page__section-title">Verdict Comparison</h4>
      <div className="compare-page__verdict-badges">
        <div className="compare-page__verdict-item">
          <span className="compare-page__verdict-label">Session A</span>
          <span className={`verdict-badge ${VERDICT_CLASS[decisionA] ?? 'verdict-badge--unknown'}`}>
            {VERDICT_LABEL[decisionA] ?? decisionA}
          </span>
        </div>
        <div className="compare-page__verdict-arrow">
          {same ? '=' : '->'}
        </div>
        <div className="compare-page__verdict-item">
          <span className="compare-page__verdict-label">Session B</span>
          <span className={`verdict-badge ${VERDICT_CLASS[decisionB] ?? 'verdict-badge--unknown'}`}>
            {VERDICT_LABEL[decisionB] ?? decisionB}
          </span>
        </div>
      </div>
      {!same && (
        <p className="compare-page__verdict-changed">Verdict changed between sessions.</p>
      )}
    </div>
  );
}

function IssueCompareSection({
  title,
  issues,
  className,
}: {
  title: string;
  issues: readonly { title: string; severity: string; file?: string }[];
  className: string;
}): React.JSX.Element {
  return (
    <div className={`compare-section ${className}`}>
      <h4 className="compare-section__title">
        {title} ({issues.length})
      </h4>
      {issues.length === 0 ? (
        <p className="compare-section__empty">None</p>
      ) : (
        <ul className="compare-section__list">
          {issues.map((issue, i) => (
            <li key={`${issue.severity}-${issue.file ?? ''}-${i}`} className="compare-section__item">
              <span className={`severity-badge severity-badge--${issue.severity.toLowerCase()}`}>
                {issue.severity}
              </span>
              <span className="compare-section__issue-title">{issue.title}</span>
              {issue.file && (
                <code className="compare-section__file">{issue.file}</code>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export function Compare(): React.JSX.Element {
  const params = useParams<Record<string, string>>();
  const navigate = useNavigate();
  const { dateA, idA, dateB, idB } = params as unknown as CompareParams;

  const sessionA = useApi<SessionDetail>(`/api/sessions/${dateA}/${idA}`);
  const sessionB = useApi<SessionDetail>(`/api/sessions/${dateB}/${idB}`);

  const comparison: CompareResult | null = useMemo(() => {
    if (!sessionA.data || !sessionB.data) return null;
    return compareSessions(sessionA.data, sessionB.data);
  }, [sessionA.data, sessionB.data]);

  const configA = useMemo(
    () => (sessionA.data ? extractConfigSummary(sessionA.data) : {}),
    [sessionA.data],
  );

  const configB = useMemo(
    () => (sessionB.data ? extractConfigSummary(sessionB.data) : {}),
    [sessionB.data],
  );

  // Loading state
  if (sessionA.loading || sessionB.loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>Session Comparison</h2>
        </div>
        <p>Loading session data...</p>
      </div>
    );
  }

  // Error state
  if (sessionA.error || sessionB.error) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>Comparison Error</h2>
        </div>
        <p className="error-text">
          {sessionA.error && <span>Session A: {sessionA.error}</span>}
          {sessionA.error && sessionB.error && <br />}
          {sessionB.error && <span>Session B: {sessionB.error}</span>}
        </p>
        <button
          type="button"
          className="retry-button"
          onClick={() => void navigate('/sessions')}
        >
          Back to Sessions
        </button>
      </div>
    );
  }

  // No data
  if (!sessionA.data || !sessionB.data) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>No Data</h2>
        </div>
        <p>One or both sessions could not be loaded.</p>
        <button
          type="button"
          className="retry-button"
          onClick={() => void navigate('/sessions')}
        >
          Back to Sessions
        </button>
      </div>
    );
  }

  return (
    <div className="page compare-page">
      <div className="page-header">
        <h2>Session Comparison</h2>
        <button
          type="button"
          className="compare-page__back"
          onClick={() => void navigate('/sessions')}
        >
          Back to Sessions
        </button>
      </div>

      {/* Side-by-side metadata */}
      <div className="compare-page__metadata">
        <SessionMetadataCard label="Session A" detail={sessionA.data} date={dateA} id={idA} />
        <SessionMetadataCard label="Session B" detail={sessionB.data} date={dateB} id={idB} />
      </div>

      {/* Verdict comparison */}
      <VerdictComparison
        verdictA={sessionA.data.verdict}
        verdictB={sessionB.data.verdict}
      />

      {/* Config differences */}
      <ConfigDiff configA={configA} configB={configB} />

      {/* Issue comparison */}
      {comparison && (
        <div className="compare-page__issues">
          <h4 className="compare-page__section-title">Issue Changes</h4>
          <div className="compare-view__results">
            <IssueCompareSection
              title="New Issues"
              issues={comparison.newIssues}
              className="compare-section--new"
            />
            <IssueCompareSection
              title="Resolved Issues"
              issues={comparison.resolvedIssues}
              className="compare-section--resolved"
            />
            <IssueCompareSection
              title="Unchanged Issues"
              issues={comparison.unchanged}
              className="compare-section--unchanged"
            />
          </div>
        </div>
      )}
    </div>
  );
}
