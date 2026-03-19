<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# l0 — Model Intelligence

## Purpose
Model Intelligence Layer selects reviewers dynamically based on model capabilities and health, tracks performance using multi-armed bandits, monitors health metrics, and scores specificity of models for different issue types.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Public API: resolveReviewers, getBanditStore, initHealthMonitor |
| `model-selector.ts` | Bandit-based model selection (UCB1), state management |
| `model-registry.ts` | Registry of available models, capability detection |
| `health-monitor.ts` | Tracks model health: success rate, timeouts, errors, auto-blocking |
| `bandit-store.ts` | Persistent bandit arm state (reward tracking for each model) |
| `quality-tracker.ts` | Tracks review quality metrics: specificity, relevance, duplicate rate |
| `specificity-scorer.ts` | Scores model specificity (how well model matches issue type) |
| `family-classifier.ts` | Classifies issue family (security, performance, style, etc.) |

## Subdirectories
None (single layer, no sub-organization)

## For AI Agents

### Working In This Directory

**Key Concepts:**
- **Multi-armed Bandit (UCB1):** Each model is an "arm"; bandits track reward (success rate) and confidence
- **Health Monitoring:** Tracks timeouts, failures, error rates; auto-blocks repeated failures
- **Specificity Scoring:** Maps model capabilities to issue types (e.g., security models → security issues)
- **Quality Tracking:** Learns which models produce better reviews over time

**API Entry Point:**
- `resolveReviewers()` — given ReviewerEntry[] (auto/concrete), returns AgentConfig[] with selected models
- `getBanditStore()` — access current bandit state for testing/debugging
- `initHealthMonitor()` — initialize health tracking

**State Management:**
- Bandit state loaded from disk on first access
- Health metrics tracked in-memory during session
- Quality scores updated after each review round

### Testing Requirements

**Model Registry:**
- Verify all supported providers/models are registered
- Test missing provider handling (graceful skip)

**Bandit Selection:**
- UCB1 formula: reward mean + confidence bonus
- Verify arms with high success + high plays are selected frequently
- Verify arms with low data get exploration bonus
- Test arm blocking after repeated failures

**Health Monitoring:**
- Success/timeout/error rate tracking
- Auto-block threshold (typically 3+ consecutive failures)
- Circuit breaker integration (prevents blocked models from executing)

**Quality Tracking:**
- Specificity scores increase for models matching issue types
- Duplicate rate detection (models producing redundant findings)

**Integration:**
- Full model selection given a config with auto reviewers
- Fallback to concrete models when auto fails
- Combined concrete + auto reviewer lists

### Common Patterns

**Model Selection Flow:**
1. Config specifies reviewers (auto/concrete/mix)
2. Auto reviewers expanded using bandit selection
3. Duplicates removed, concrete reviewers added
4. Health status checked (skip blocked models)
5. Return final AgentConfig[] to L1

**Bandit State Persistence:**
- Loaded from `.ca/bandit-state.json` (or memory if not exists)
- Updated after each review round
- Persisted on shutdown

**Health Metric Collection:**
- Each L1 reviewer result feeds back to health monitor
- Success → reward, timeout → failure, error → failure
- Exponential moving average for recent emphasis

**Specificity Scoring:**
- Issue family classified first (security, perf, style, etc.)
- Model specialty matched against family
- Score used as tie-breaker in bandit selection

## Dependencies

### Internal (Core)
- `types/l0.ts` — ModelRouterConfig, BanditArm, ModelMetrics
- `types/config.ts` — ReviewerEntry, AgentConfig

### External
- `@codeagora/shared` — logger, utils

<!-- MANUAL: -->
