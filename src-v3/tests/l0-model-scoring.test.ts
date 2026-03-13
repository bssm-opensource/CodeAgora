import { describe, it, expect, beforeEach } from 'vitest';
import { ModelScorer } from '../l0/model-scorer.js';
import type { PerformanceMetrics } from '../l0/model-scorer.js';

describe('ModelScorer', () => {
  let scorer: ModelScorer;

  beforeEach(() => {
    scorer = new ModelScorer();
  });

  // Test 1: recordPerformance 후 getScore에 반영
  it('should reflect recorded performance in getScore', () => {
    const metrics: PerformanceMetrics = {
      specificity: 0.8,
      peerValidation: 0.7,
      headAcceptance: 0.9,
    };

    scorer.recordPerformance('llama-3.3-70b', 'groq', metrics);

    const score = scorer.getScore('llama-3.3-70b', 'groq');
    expect(score).toBeDefined();
    expect(score!.modelId).toBe('llama-3.3-70b');
    expect(score!.provider).toBe('groq');
    expect(score!.totalReviews).toBe(1);
    expect(score!.averageScore).toBeCloseTo(
      0.4 * 0.8 + 0.35 * 0.7 + 0.25 * 0.9,
      5
    );
  });

  // Test 2: 여러 record 후 averageScore 정확
  it('should compute accurate averageScore over multiple records', () => {
    const m1: PerformanceMetrics = { specificity: 1.0, peerValidation: 1.0, headAcceptance: 1.0 };
    const m2: PerformanceMetrics = { specificity: 0.0, peerValidation: 0.0, headAcceptance: 0.0 };

    scorer.recordPerformance('gpt-4o', 'openai', m1);
    scorer.recordPerformance('gpt-4o', 'openai', m2);

    const score = scorer.getScore('gpt-4o', 'openai');
    expect(score).toBeDefined();
    expect(score!.totalReviews).toBe(2);
    expect(score!.averageScore).toBeCloseTo(0.5, 5);
  });

  // Test 3: getRankings — 점수 순 정렬
  it('should return rankings sorted by score descending', () => {
    scorer.recordPerformance('low-model', 'provider-a', {
      specificity: 0.1,
      peerValidation: 0.1,
      headAcceptance: 0.1,
    });
    scorer.recordPerformance('high-model', 'provider-b', {
      specificity: 0.9,
      peerValidation: 0.9,
      headAcceptance: 0.9,
    });
    scorer.recordPerformance('mid-model', 'provider-c', {
      specificity: 0.5,
      peerValidation: 0.5,
      headAcceptance: 0.5,
    });

    const rankings = scorer.getRankings();
    expect(rankings).toHaveLength(3);
    expect(rankings[0].modelId).toBe('high-model');
    expect(rankings[1].modelId).toBe('mid-model');
    expect(rankings[2].modelId).toBe('low-model');
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].rank).toBe(2);
    expect(rankings[2].rank).toBe(3);
  });

  // Test 4: minReviews 미달 시 getRankings에서 제외
  it('should exclude models below minReviews threshold from rankings', () => {
    scorer.recordPerformance('model-a', 'prov', {
      specificity: 0.9,
      peerValidation: 0.9,
      headAcceptance: 0.9,
    });
    scorer.recordPerformance('model-b', 'prov', {
      specificity: 0.5,
      peerValidation: 0.5,
      headAcceptance: 0.5,
    });
    scorer.recordPerformance('model-b', 'prov', {
      specificity: 0.5,
      peerValidation: 0.5,
      headAcceptance: 0.5,
    });

    // model-a has 1 review, model-b has 2 reviews
    const rankings = scorer.getRankings(2);
    expect(rankings).toHaveLength(1);
    expect(rankings[0].modelId).toBe('model-b');
  });

  // Test 5: getHistory — 최근 N개 점수 반환
  it('should return recent N scores from getHistory', () => {
    const scorer2 = new ModelScorer({ historyLimit: 10 });

    for (let i = 0; i < 5; i++) {
      scorer2.recordPerformance('model-x', 'prov', {
        specificity: i * 0.1,
        peerValidation: 0.5,
        headAcceptance: 0.5,
      });
    }

    const history = scorer2.getHistory('model-x', 'prov', 3);
    expect(history).toHaveLength(3);
    // Should be the last 3 recorded scores
    // scores are: 0*0.4+0.5*0.35+0.5*0.25 = 0.3, 0.34, 0.38, 0.42, 0.46
    // last 3 are indices 2,3,4 => 0.38, 0.42, 0.46
    expect(history[0]).toBeCloseTo(0.4 * 0.2 + 0.35 * 0.5 + 0.25 * 0.5, 5);
    expect(history[1]).toBeCloseTo(0.4 * 0.3 + 0.35 * 0.5 + 0.25 * 0.5, 5);
    expect(history[2]).toBeCloseTo(0.4 * 0.4 + 0.35 * 0.5 + 0.25 * 0.5, 5);
  });

  // Test 6: computeScore — 가중 평균 계산 정확 (0.4 + 0.35 + 0.25 = 1.0)
  it('should compute weighted composite score correctly', () => {
    const metrics: PerformanceMetrics = {
      specificity: 1.0,
      peerValidation: 0.0,
      headAcceptance: 0.0,
    };
    expect(ModelScorer.computeScore(metrics)).toBeCloseTo(0.4, 5);

    const metrics2: PerformanceMetrics = {
      specificity: 0.0,
      peerValidation: 1.0,
      headAcceptance: 0.0,
    };
    expect(ModelScorer.computeScore(metrics2)).toBeCloseTo(0.35, 5);

    const metrics3: PerformanceMetrics = {
      specificity: 0.0,
      peerValidation: 0.0,
      headAcceptance: 1.0,
    };
    expect(ModelScorer.computeScore(metrics3)).toBeCloseTo(0.25, 5);

    const metricsAll: PerformanceMetrics = {
      specificity: 1.0,
      peerValidation: 1.0,
      headAcceptance: 1.0,
    };
    expect(ModelScorer.computeScore(metricsAll)).toBeCloseTo(1.0, 5);
  });

  // Test 7: getBanditReward — totalReviews가 0이면 undefined
  it('should return undefined from getBanditReward when model has no reviews', () => {
    const reward = scorer.getBanditReward('nonexistent', 'prov');
    expect(reward).toBeUndefined();
  });

  it('should return averageScore from getBanditReward when model has reviews', () => {
    const metrics: PerformanceMetrics = {
      specificity: 0.8,
      peerValidation: 0.6,
      headAcceptance: 0.7,
    };
    scorer.recordPerformance('model-z', 'prov', metrics);

    const reward = scorer.getBanditReward('model-z', 'prov');
    expect(reward).toBeCloseTo(ModelScorer.computeScore(metrics), 5);
  });

  // Test 8: reset 후 빈 상태
  it('should clear all data after reset', () => {
    scorer.recordPerformance('model-a', 'prov', {
      specificity: 0.9,
      peerValidation: 0.8,
      headAcceptance: 0.7,
    });

    scorer.reset();

    expect(scorer.getScore('model-a', 'prov')).toBeUndefined();
    expect(scorer.getRankings()).toHaveLength(0);
    expect(scorer.getHistory('model-a', 'prov')).toHaveLength(0);
  });
});
