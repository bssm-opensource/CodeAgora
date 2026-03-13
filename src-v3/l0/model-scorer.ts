/**
 * Model Scorer
 * Tracks per-model performance metrics and computes composite scores.
 * Outputs are compatible with bandit arm updates (continuous reward in [0,1]).
 */

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetrics {
  specificity: number;     // 0-1, 이슈 구체성
  peerValidation: number;  // 0-1, 다른 리뷰어와의 일치도
  headAcceptance: number;  // 0-1, head agent 최종 수용률
}

export interface ModelScore {
  modelId: string;
  provider: string;
  totalReviews: number;
  averageScore: number;
  recentScores: number[];   // 최근 N개 세션 점수
}

export interface ModelRanking {
  rank: number;
  modelId: string;
  provider: string;
  score: number;
  reviews: number;
}

interface ModelEntry {
  modelId: string;
  provider: string;
  scores: number[];
}

interface ModelScorerOptions {
  minReviews?: number;
  historyLimit?: number;
}

// ============================================================================
// ModelScorer
// ============================================================================

export class ModelScorer {
  private readonly minReviews: number;
  private readonly historyLimit: number;
  private entries: Map<string, ModelEntry>;

  constructor(options?: ModelScorerOptions) {
    this.minReviews = options?.minReviews ?? 1;
    this.historyLimit = options?.historyLimit ?? 100;
    this.entries = new Map();
  }

  private key(modelId: string, provider: string): string {
    return `${provider}/${modelId}`;
  }

  recordPerformance(modelId: string, provider: string, metrics: PerformanceMetrics): void {
    const k = this.key(modelId, provider);
    const score = ModelScorer.computeScore(metrics);

    const existing = this.entries.get(k);
    if (existing) {
      existing.scores.push(score);
      // Trim to historyLimit
      if (existing.scores.length > this.historyLimit) {
        existing.scores = existing.scores.slice(-this.historyLimit);
      }
    } else {
      this.entries.set(k, { modelId, provider, scores: [score] });
    }
  }

  getScore(modelId: string, provider: string): ModelScore | undefined {
    const entry = this.entries.get(this.key(modelId, provider));
    if (!entry || entry.scores.length === 0) return undefined;

    const total = entry.scores.reduce((sum, s) => sum + s, 0);
    const averageScore = total / entry.scores.length;

    return {
      modelId: entry.modelId,
      provider: entry.provider,
      totalReviews: entry.scores.length,
      averageScore,
      recentScores: [...entry.scores],
    };
  }

  getRankings(minReviews?: number): ModelRanking[] {
    const threshold = minReviews ?? this.minReviews;

    const eligible: Array<{ entry: ModelEntry; avg: number }> = [];
    for (const entry of this.entries.values()) {
      if (entry.scores.length >= threshold) {
        const avg = entry.scores.reduce((sum, s) => sum + s, 0) / entry.scores.length;
        eligible.push({ entry, avg });
      }
    }

    eligible.sort((a, b) => b.avg - a.avg);

    return eligible.map(({ entry, avg }, idx) => ({
      rank: idx + 1,
      modelId: entry.modelId,
      provider: entry.provider,
      score: avg,
      reviews: entry.scores.length,
    }));
  }

  getHistory(modelId: string, provider: string, limit?: number): number[] {
    const entry = this.entries.get(this.key(modelId, provider));
    if (!entry) return [];

    if (limit !== undefined) {
      return entry.scores.slice(-limit);
    }
    return [...entry.scores];
  }

  static computeScore(metrics: PerformanceMetrics): number {
    return 0.4 * metrics.specificity
      + 0.35 * metrics.peerValidation
      + 0.25 * metrics.headAcceptance;
  }

  getBanditReward(modelId: string, provider: string): number | undefined {
    const score = this.getScore(modelId, provider);
    if (!score || score.totalReviews === 0) return undefined;
    return score.averageScore;
  }

  reset(): void {
    this.entries = new Map();
  }
}
