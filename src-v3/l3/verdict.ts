/**
 * L3 Head - Final Verdict (Bookend End)
 * Reads moderator report, makes final decision, applies code changes
 */

import type { ModeratorReport, HeadVerdict, EvidenceDocument } from '../types/core.js';

/**
 * Head makes final verdict based on moderator report
 * In production, this is Claude Code analyzing the report
 */
export function makeHeadVerdict(report: ModeratorReport): HeadVerdict {
  const criticalIssues = report.discussions.filter(
    (d) => d.finalSeverity === 'CRITICAL' || d.finalSeverity === 'HARSHLY_CRITICAL'
  );

  const escalatedIssues = report.discussions.filter((d) => !d.consensusReached);

  // Decision logic
  if (criticalIssues.length > 0) {
    return {
      decision: 'REJECT',
      reasoning: `Found ${criticalIssues.length} critical issue(s) that must be fixed before merging.`,
      questionsForHuman: escalatedIssues.length > 0
        ? [`${escalatedIssues.length} issue(s) need human judgment`]
        : undefined,
    };
  }

  if (escalatedIssues.length > 0) {
    return {
      decision: 'NEEDS_HUMAN',
      reasoning: 'Moderator could not reach consensus on some issues.',
      questionsForHuman: escalatedIssues.map(
        (d) => `${d.discussionId}: ${d.finalSeverity} - Review needed`
      ),
    };
  }

  return {
    decision: 'ACCEPT',
    reasoning: 'All issues resolved or deemed acceptable. Code is ready to merge.',
  };
}

/**
 * Scan unconfirmed queue - issues flagged by only 1 reviewer
 * Head decides if these are real issues
 */
export function scanUnconfirmedQueue(
  unconfirmed: EvidenceDocument[]
): {
  promoted: EvidenceDocument[];
  dismissed: EvidenceDocument[];
} {
  // Simplified: In production, Head (Claude Code) analyzes each one
  // For now, promote CRITICAL, dismiss others
  const promoted = unconfirmed.filter(
    (doc) => doc.severity === 'CRITICAL' || doc.severity === 'HARSHLY_CRITICAL'
  );
  const dismissed = unconfirmed.filter(
    (doc) => doc.severity !== 'CRITICAL' && doc.severity !== 'HARSHLY_CRITICAL'
  );

  return { promoted, dismissed };
}
