/**
 * L3 Head - Final Verdict
 * LLM-based verdict with rule-based fallback.
 * When head config is provided and enabled, the LLM evaluates reasoning quality
 * rather than just counting severities. Falls back to rule-based logic on failure.
 */

import type { ModeratorReport, HeadVerdict, EvidenceDocument } from '../types/core.js';
import type { HeadConfig } from '../types/config.js';

// ============================================================================
// LLM-Based Verdict
// ============================================================================

/**
 * Head makes final verdict based on moderator report.
 * If headConfig is provided and enabled, uses LLM for reasoning-quality evaluation.
 * Falls back to rule-based logic if LLM fails or headConfig is not provided.
 */
export async function makeHeadVerdict(
  report: ModeratorReport,
  headConfig?: HeadConfig,
): Promise<HeadVerdict> {
  // Try LLM-based verdict if configured
  if (headConfig?.enabled !== false && headConfig?.model) {
    try {
      return await llmVerdict(report, headConfig);
    } catch {
      // Fallback to rule-based on any LLM failure
    }
  }

  return ruleBasedVerdict(report);
}

async function llmVerdict(report: ModeratorReport, config: HeadConfig): Promise<HeadVerdict> {
  const { executeBackend } = await import('../l1/backend.js');

  const prompt = buildHeadPrompt(report);
  const response = await executeBackend({
    backend: config.backend,
    model: config.model,
    provider: config.provider,
    prompt,
    timeout: 120,
  });

  return parseHeadResponse(response, report);
}

function buildHeadPrompt(report: ModeratorReport): string {
  const discussionSummary = report.discussions.map((d) => {
    const consensus = d.consensusReached ? 'consensus reached' : 'no consensus';
    return `- [${d.finalSeverity}] ${d.discussionId} (${d.filePath}:${d.lineRange[0]}) — ${consensus}, ${d.rounds} round(s): ${d.reasoning}`;
  }).join('\n');

  const unconfirmedSummary = report.unconfirmedIssues.length > 0
    ? `\nUnconfirmed issues (single reviewer): ${report.unconfirmedIssues.length}`
    : '';

  const suggestionsSummary = report.suggestions.length > 0
    ? `\nSuggestions: ${report.suggestions.length}`
    : '';

  return `You are the Head Judge in a multi-agent code review system. Multiple AI reviewers independently reviewed a code change, then debated their findings. You must now deliver the final verdict.

## Discussion Results

Total discussions: ${report.summary.totalDiscussions}
Resolved (consensus): ${report.summary.resolved}
Escalated (no consensus): ${report.summary.escalated}
${unconfirmedSummary}
${suggestionsSummary}

### Discussion Details
${discussionSummary || '(no discussions)'}

## Your Task

Evaluate the quality of reasoning in each discussion, not just severity counts. Consider:
1. Are the CRITICAL/HARSHLY_CRITICAL findings well-evidenced or speculative?
2. Did the debate reveal false positives that should be dismissed?
3. Are escalated issues genuinely ambiguous or just under-discussed?
4. Is the overall code change safe to merge?

## Response Format

Respond with EXACTLY this format:

DECISION: ACCEPT | REJECT | NEEDS_HUMAN
REASONING: <one paragraph explaining your decision based on the evidence quality>
QUESTIONS: <comma-separated list of open questions for human reviewers, or "none">
`;
}

function parseHeadResponse(response: string, report: ModeratorReport): HeadVerdict {
  const decisionMatch = response.match(/DECISION:\s*(ACCEPT|REJECT|NEEDS_HUMAN)/i);
  const reasoningMatch = response.match(/REASONING:\s*(.+?)(?=\nQUESTIONS:|$)/is);
  const questionsMatch = response.match(/QUESTIONS:\s*(.+)/is);

  if (!decisionMatch) {
    // Can't parse — fallback
    return ruleBasedVerdict(report);
  }

  const decision = decisionMatch[1].toUpperCase() as HeadVerdict['decision'];
  const reasoning = reasoningMatch?.[1]?.trim() || 'LLM verdict without detailed reasoning.';

  let questionsForHuman: string[] | undefined;
  if (questionsMatch) {
    const raw = questionsMatch[1].trim();
    if (raw.toLowerCase() !== 'none' && raw.length > 0) {
      questionsForHuman = raw.split(/[,\n]/).map((q) => q.trim()).filter((q) => q.length > 0);
    }
  }

  return {
    decision,
    reasoning,
    questionsForHuman: questionsForHuman?.length ? questionsForHuman : undefined,
  };
}

// ============================================================================
// Rule-Based Verdict (Fallback)
// ============================================================================

function ruleBasedVerdict(report: ModeratorReport): HeadVerdict {
  const criticalIssues = report.discussions.filter(
    (d) => d.finalSeverity === 'CRITICAL' || d.finalSeverity === 'HARSHLY_CRITICAL'
  );

  const escalatedIssues = report.discussions.filter((d) => !d.consensusReached);

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

// ============================================================================
// Unconfirmed Queue Scanner
// ============================================================================

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
  // Promote CRITICAL/HARSHLY_CRITICAL, dismiss others
  const promoted = unconfirmed.filter(
    (doc) => doc.severity === 'CRITICAL' || doc.severity === 'HARSHLY_CRITICAL'
  );
  const dismissed = unconfirmed.filter(
    (doc) => doc.severity !== 'CRITICAL' && doc.severity !== 'HARSHLY_CRITICAL'
  );

  return { promoted, dismissed };
}
