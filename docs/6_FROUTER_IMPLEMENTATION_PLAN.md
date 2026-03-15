# 6. frouter x CodeAgora 통합 구현 계획

> 작성일: 2026-03-03
> 기반 문서: [5_FROUTER_INTEGRATION_RESEARCH.md](./5_FROUTER_INTEGRATION_RESEARCH.md)
> 브랜치: `feat/frouter-integration`
> 상태: 계획 수립 완료, 구현 미착수

---

## 목차

1. [개요](#1-개요)
2. [브랜치 전략](#2-브랜치-전략)
3. [의존성 변경](#3-의존성-변경)
4. [Phase 1 — 하이브리드 백엔드](#4-phase-1--하이브리드-백엔드)
5. [Phase 2 — L0 Model Intelligence Layer](#5-phase-2--l0-model-intelligence-layer)
6. [Phase 3 — 품질 피드백 루프](#6-phase-3--품질-피드백-루프)
7. [Phase 4 — Config 진화 (Fully Declarative)](#7-phase-4--config-진화-fully-declarative)
8. [테스트 전략](#8-테스트-전략)
9. [마이그레이션 가이드](#9-마이그레이션-가이드)
10. [위험 요소 및 대응](#10-위험-요소-및-대응)
11. [Phase별 체크리스트](#11-phase별-체크리스트)

---

## 1. 개요

### 목표

CodeAgora v3의 정적 리뷰어 설정을 **하이브리드 백엔드(CLI + API) + 동적 모델 선택**으로 진화시킨다.

### 핵심 원칙

- **하위 호환성 우선**: 기존 `opencode`/`codex`/`gemini`/`claude` 백엔드는 그대로 동작
- **점진적 도입**: 각 Phase는 독립 배포 가능, 이전 Phase 없이도 동작
- **데이터 > 코드**: frouter에서 가져오는 것은 `model-rankings.json` 데이터이지 코드가 아님
- **Phase별 브랜치**: 각 Phase를 독립 PR로 리뷰 후 머지

### 아키텍처 변화 요약

```
현재 (v3):
  Config(정적) → L1 Backend(CLI only) → L2 → L3

Phase 1:
  Config(정적) → L1 Backend(CLI + API) → L2 → L3

Phase 2:
  Config(정적+동적) → L0(모델 선택) → L1 Backend(CLI + API) → L2 → L3

Phase 3:
  Config(정적+동적) → L0(모델 선택 + 품질 피드백) → L1 → L2 → L3

Phase 4:
  Config(선언적) → L0(완전 자동) → L1 → L2 → L3
```

---

## 2. 브랜치 전략

### 메인 브랜치

```
main
 └── feat/frouter-integration          ← 통합 브랜치 (이 문서가 여기에 있음)
      ├── feat/frouter-phase1-hybrid    ← Phase 1: 하이브리드 백엔드
      ├── feat/frouter-phase2-l0        ← Phase 2: L0 Model Intelligence
      ├── feat/frouter-phase3-feedback  ← Phase 3: 품질 피드백 루프
      └── feat/frouter-phase4-config    ← Phase 4: Config 진화
```

### 머지 흐름

```
1. feat/frouter-phase1-hybrid → feat/frouter-integration → main
2. feat/frouter-phase2-l0     → feat/frouter-integration → main
3. feat/frouter-phase3-feedback → feat/frouter-integration → main
4. feat/frouter-phase4-config   → feat/frouter-integration → main
```

### 규칙

- 각 Phase 브랜치는 **독립 PR**로 리뷰
- Phase N+1은 Phase N 머지 후 시작
- `feat/frouter-integration`은 통합 브랜치로만 사용 (직접 커밋 금지, 문서 제외)
- 각 Phase PR에는 해당 Phase의 테스트가 모두 포함

---

## 3. 의존성 변경

### Phase 1에서 추가

```json
{
  "dependencies": {
    "ai": "^4.x",
    "@ai-sdk/openai-compatible": "^0.x",
    "@ai-sdk/groq": "^1.x",
    "@openrouter/ai-sdk-provider": "^0.x"
  }
}
```

### Phase 2에서 추가 (선택적)

```json
{
  "dependencies": {
    "@ai-sdk/openai": "^1.x",
    "@ai-sdk/anthropic": "^1.x",
    "@ai-sdk/google": "^1.x"
  }
}
```

> **참고**: Phase 1에서는 무료 provider(Groq, NIM, OpenRouter)만 필수. 유료 provider는 Phase 2 이후 유저가 필요할 때 optional peer dependency로 제공.

### 버전 고정 전략

- `ai` (Vercel AI SDK core): major 버전 고정 (`^4.x`)
- provider 패키지: minor까지 고정 (breaking change 빈번)
- `pnpm-lock.yaml` 커밋 필수

---

## 4. Phase 1 — 하이브리드 백엔드

> **목표**: 기존 CLI 백엔드를 유지하면서 `'api'` 백엔드 타입을 추가. 유저가 config에서 같은 모델이라도 CLI/API를 선택 가능.

### 4.1 수정 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/types/config.ts` | **수정** | `Backend` enum에 `'api'` 추가 |
| `src/l1/backend.ts` | **수정** | `executeBackend()`에 API 분기 추가 |
| `src/l1/api-backend.ts` | **신규** | Vercel AI SDK 기반 API 실행기 |
| `src/l1/provider-registry.ts` | **신규** | AI SDK provider 매핑 + 초기화 |
| `src/tests/l1-api-backend.test.ts` | **신규** | API 백엔드 유닛 테스트 |
| `src/tests/l1-provider-registry.test.ts` | **신규** | Provider 레지스트리 테스트 |
| `package.json` | **수정** | AI SDK 의존성 추가 |

### 4.2 상세 구현

#### 4.2.1 `src/types/config.ts` 수정

```typescript
// 변경 전
export const BackendSchema = z.enum(['opencode', 'codex', 'gemini', 'claude']);

// 변경 후
export const BackendSchema = z.enum(['opencode', 'codex', 'gemini', 'claude', 'api']);
```

`AgentConfigSchema` refinement 추가 + `AutoReviewerConfigSchema` 도입:

```typescript
// 기존 AgentConfigSchema에 'api' provider 필수 refinement 추가
export const AgentConfigSchema = z
  .object({
    id: z.string(),
    label: z.string().optional(),
    model: z.string(),
    backend: BackendSchema,
    provider: z.string().optional(),
    persona: z.string().optional(),
    timeout: z.number().default(120),
    enabled: z.boolean().default(true),
    auto: z.literal(false).optional(),   // 명시적으로 false 또는 미지정
  })
  .refine(
    (data) => data.backend !== 'opencode' || data.provider !== undefined,
    { message: "provider is required when backend is 'opencode'", path: ['provider'] }
  )
  .refine(
    (data) => data.backend !== 'api' || data.provider !== undefined,
    { message: "provider is required when backend is 'api'", path: ['provider'] }
  );

// Phase 2에서 추가: L0가 모델을 자동 배정하는 리뷰어
export const AutoReviewerConfigSchema = z.object({
  id: z.string(),
  auto: z.literal(true),
  label: z.string().optional(),
  persona: z.string().optional(),
  enabled: z.boolean().default(true),
  // model, backend, provider는 L0가 런타임에 채움
});
export type AutoReviewerConfig = z.infer<typeof AutoReviewerConfigSchema>;

// 통합: 정적 리뷰어 또는 자동 리뷰어
export const ReviewerEntrySchema = z.union([
  AgentConfigSchema,
  AutoReviewerConfigSchema,
]);
export type ReviewerEntry = z.infer<typeof ReviewerEntrySchema>;
```

**Phase 2에서 `ConfigSchema.reviewers` 변경**:

```typescript
// 변경 전 (Phase 1까지)
reviewers: z.array(AgentConfigSchema).min(1),

// 변경 후 (Phase 2)
reviewers: z.array(ReviewerEntrySchema).min(1)
  .refine(
    (arr) => arr.some((r) => !('auto' in r && r.auto === true)),
    { message: "At least one non-auto reviewer is required as fallback" }
  ),
```

> **설계 결정**: `auto: true` 리뷰어는 `model`, `backend`, `provider`가 없다. L0 `resolveReviewers()`가 런타임에 이 필드들을 채워 `AgentConfig`로 변환한 후 L1에 전달한다. 따라서 L1 이하 코드는 항상 완전한 `AgentConfig`만 받으므로 수정 불필요.

#### 4.2.2 `src/l1/provider-registry.ts` (신규)

```typescript
/**
 * Provider Registry
 * AI SDK provider 인스턴스를 생성하고 캐싱한다.
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createGroq } from '@ai-sdk/groq';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// Provider 설정 (baseURL, API 키 환경변수 매핑)
const PROVIDER_CONFIG = {
  'nvidia-nim': {
    factory: createOpenAICompatible,
    options: {
      name: 'nvidia-nim',
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKeyEnvVar: 'NVIDIA_API_KEY',
    },
  },
  'groq': {
    factory: createGroq,
    options: {
      apiKeyEnvVar: 'GROQ_API_KEY',
    },
  },
  'openrouter': {
    factory: createOpenRouter,
    options: {
      apiKeyEnvVar: 'OPENROUTER_API_KEY',
    },
  },
} as const;

type ProviderName = keyof typeof PROVIDER_CONFIG;

// 싱글톤 캐시
const providerCache = new Map<string, unknown>();

export function getProvider(providerName: string): LanguageModelV1Provider {
  // 캐시 히트
  if (providerCache.has(providerName)) {
    return providerCache.get(providerName);
  }

  // Provider 설정 조회
  const config = PROVIDER_CONFIG[providerName as ProviderName];
  if (!config) {
    throw new Error(
      `Unknown API provider: '${providerName}'. ` +
      `Supported: ${Object.keys(PROVIDER_CONFIG).join(', ')}`
    );
  }

  // API 키 확인
  const apiKey = process.env[config.options.apiKeyEnvVar];
  if (!apiKey) {
    throw new Error(
      `API key not found. Set ${config.options.apiKeyEnvVar} environment variable.`
    );
  }

  // Provider 인스턴스 생성
  const provider = config.factory({ ...config.options, apiKey });
  providerCache.set(providerName, provider);
  return provider;
}

export function getSupportedProviders(): string[] {
  return Object.keys(PROVIDER_CONFIG);
}

export function clearProviderCache(): void {
  providerCache.clear();
}
```

#### 4.2.3 `src/l1/api-backend.ts` (신규)

```typescript
/**
 * API Backend Executor
 * Vercel AI SDK를 사용한 직접 API 호출 백엔드
 */

import { generateText } from 'ai';
import { getProvider } from './provider-registry.js';
import type { BackendInput } from './backend.js';

export async function executeViaAISDK(input: BackendInput): Promise<string> {
  const { model, provider, prompt, timeout } = input;

  if (!provider) {
    throw new Error('API backend requires provider parameter');
  }

  const aiProvider = getProvider(provider);
  const timeoutMs = timeout * 1000;

  const { text } = await generateText({
    model: aiProvider(model),
    prompt,
    abortSignal: AbortSignal.timeout(timeoutMs),
  });

  return text;
}
```

#### 4.2.4 `src/l1/backend.ts` 수정

```typescript
// executeBackend 함수 수정
export async function executeBackend(input: BackendInput): Promise<string> {
  const { backend, model, provider, prompt, timeout } = input;

  // API 백엔드: AI SDK 직접 호출
  if (backend === 'api') {
    const { executeViaAISDK } = await import('./api-backend.js');
    return executeViaAISDK(input);
  }

  // CLI 백엔드: 기존 로직 (변경 없음)
  const tmpFile = path.join('/tmp', `prompt-${randomUUID()}.txt`);
  // ... (기존 코드 유지)
}
```

> **주의**: `api-backend.ts`는 dynamic import로 로딩. AI SDK 패키지가 설치되지 않은 환경에서도 CLI 백엔드는 정상 동작.

### 4.3 Config 예시 (Phase 1)

```jsonc
{
  "reviewers": [
    // 기존 CLI 방식 (변경 없음)
    { "id": "r1", "model": "deepseek-chat", "backend": "opencode", "provider": "nvidia-nim" },

    // 새로운 API 방식 (동일 모델, 다른 백엔드)
    { "id": "r2", "model": "deepseek-r1-distill-llama-70b", "backend": "api", "provider": "groq" },
    { "id": "r3", "model": "qwen-2.5-coder-32b-instruct", "backend": "api", "provider": "groq" },

    // NIM API
    { "id": "r4", "model": "deepseek-r1", "backend": "api", "provider": "nvidia-nim" },

    // 기존 Gemini CLI
    { "id": "r5", "model": "gemini-2.5-flash", "backend": "gemini" }
  ],
  "modelRouter": { "enabled": false }
}
```

### 4.4 에러 처리

| 에러 유형 | AI SDK 에러 클래스 | 처리 |
|----------|-------------------|------|
| Rate limit (429) | `APICallError` + `isRetryable: true` | 기존 retry 로직에 통합 |
| 인증 실패 (401) | `APICallError` + `isRetryable: false` | 즉시 실패, 환경변수 안내 |
| 타임아웃 | `AbortError` | `Backend timeout after ${timeout}s` |
| 모델 미지원 | `APICallError` (404) | `Unsupported model: ${model}` |
| 네트워크 오류 | `Error` | 기존 retry 로직에 통합 |

### 4.5 Phase 1 완료 기준

- [ ] `backend: 'api'` 설정으로 Groq, NIM, OpenRouter 모델 호출 성공
- [ ] 기존 CLI 백엔드(`opencode`, `codex`, `gemini`, `claude`) 동작 무변경
- [ ] API 백엔드 에러 시 retry + forfeit 기존 로직과 동일하게 동작
- [ ] 유닛 테스트: provider-registry, api-backend, config validation
- [ ] 통합 테스트: API 백엔드로 실제 리뷰 파이프라인 1회 실행

---

## 5. Phase 2 — L0 Model Intelligence Layer

> **목표**: 모델 메타데이터 관리, 헬스체크, 패밀리 분류, 동적 모델 선택을 담당하는 L0 레이어 추가.

### 5.1 신규 파일 목록

| 파일 | 설명 |
|------|------|
| `src/l0/model-registry.ts` | 모델 메타데이터 관리 (frouter 데이터 기반) |
| `src/l0/health-monitor.ts` | Circuit breaker + 핑 프로토콜 |
| `src/l0/family-classifier.ts` | 모델 ID → 패밀리 추출 |
| `src/l0/model-selector.ts` | Thompson Sampling + diversity constraint |
| `src/l0/index.ts` | L0 public API |
| `src/data/model-rankings.json` | frouter에서 복사한 168개 모델 메타데이터 |
| `src/data/groq-models.json` | Groq 무료 모델 목록 (frouter에 없음) |
| `src/types/l0.ts` | L0 전용 타입 정의 |
| `src/tests/l0-model-registry.test.ts` | 모델 레지스트리 테스트 |
| `src/tests/l0-health-monitor.test.ts` | 서킷 브레이커 테스트 |
| `src/tests/l0-family-classifier.test.ts` | 패밀리 분류 테스트 |
| `src/tests/l0-model-selector.test.ts` | 모델 선택 테스트 |

### 5.2 수정 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/types/config.ts` | **수정** | `modelRouter` 설정 스키마 추가 |
| `src/pipeline/orchestrator.ts` | **수정** | L0 모델 선택 단계 삽입 |
| `src/l1/reviewer.ts` | **수정** | `auto` 리뷰어 처리 로직 |
| `src/config/loader.ts` | **수정** | `modelRouter` 설정 로딩 |

### 5.3 상세 구현

#### 5.3.1 `src/types/l0.ts` (신규)

```typescript
/**
 * L0 Model Intelligence Layer Types
 */

import { z } from 'zod';

// 모델 메타데이터 (frouter model-rankings.json 기반)
export const ModelMetadataSchema = z.object({
  source: z.enum(['nim', 'openrouter', 'groq']),
  modelId: z.string(),
  name: z.string(),
  tier: z.enum(['S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'C']),
  context: z.string(),            // "128k" 등
  family: z.string(),             // 추출된 패밀리명
  isReasoning: z.boolean(),
  sweBench: z.string().optional(),
  aaIntelligence: z.number().optional(),
  aaSpeedTps: z.number().optional(),
});
export type ModelMetadata = z.infer<typeof ModelMetadataSchema>;

// Circuit Breaker 상태
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerState {
  state: CircuitState;
  failCount: number;
  lastFailure: number | null;
  cooldownMs: number;
  successCount: number;            // half-open에서의 성공 카운터
}

// 핑 결과
export interface PingResult {
  modelId: string;
  provider: string;
  status: 'up' | 'down' | 'rate-limited';
  latencyMs: number | null;
  timestamp: number;
}

// 모델 선택 결과
export interface ModelSelection {
  selections: Array<{
    modelId: string;
    provider: string;
    family: string;
    isReasoning: boolean;
    selectionReason: 'thompson-sampling' | 'exploration' | 'diversity-fill' | 'static';
  }>;
  metadata: {
    familyCount: number;
    reasoningCount: number;
    explorationSlots: number;
  };
}

// Model Router 설정
export const ModelRouterConfigSchema = z.object({
  enabled: z.boolean().default(false),
  strategy: z.enum(['thompson-sampling']).default('thompson-sampling'),
  // 현재 thompson-sampling만 지원. 향후 'ucb1', 'round-robin' 등 추가 가능.
  providers: z.record(z.string(), z.object({
    apiKey: z.string().optional(),  // "{env:VAR_NAME}" 패턴 지원
    enabled: z.boolean().default(true),
  })).optional(),
  constraints: z.object({
    familyDiversity: z.boolean().default(true),
    includeReasoning: z.boolean().default(true),
    minFamilies: z.number().default(3),
    reasoningMin: z.number().default(1),
    reasoningMax: z.number().default(2),
    contextMin: z.string().default('32k'),
  }).optional(),
  circuitBreaker: z.object({
    failureThreshold: z.number().default(3),
    cooldownMs: z.number().default(60000),
    maxCooldownMs: z.number().default(300000),
  }).optional(),
  dailyBudget: z.record(z.string(), z.number()).optional(),
  // provider별 일일 요청 한도. 예: { "groq": 1000, "openrouter": 50 }
  // 미설정 시 해당 provider의 RPD 추적 비활성화
  explorationRate: z.number().default(0.1),  // 10% 강제 탐색
});
export type ModelRouterConfig = z.infer<typeof ModelRouterConfigSchema>;
```

#### 5.3.2 `src/l0/model-registry.ts` (신규)

**책임**: frouter의 `model-rankings.json` + Groq 모델 데이터를 로드하고, 통합 모델 카탈로그를 제공.

```
[설계]
1. 앱 시작 시 data/*.json 로드 → Map<modelId, ModelMetadata> 구축
2. FamilyClassifier로 각 모델에 family 태깅
3. provider별 필터링, tier별 필터링, reasoning 필터링 API 제공
4. 향후 runtime 데이터 갱신을 위한 refresh() 메서드 예약

[핵심 API]
- getModel(modelId: string): ModelMetadata | undefined
- getModelsByProvider(provider: string): ModelMetadata[]
- getModelsByFamily(family: string): ModelMetadata[]
- getModelsByTier(minTier: string): ModelMetadata[]
- getReasoningModels(): ModelMetadata[]
- getAvailableModels(providers: string[]): ModelMetadata[]
- refresh(): Promise<void>  // 데이터 리로드
```

#### 5.3.3 `src/l0/health-monitor.ts` (신규)

**책임**: 모델 endpoint 헬스체크 + circuit breaker 상태 관리.

```
[설계]
1. 핑 프로토콜: frouter 방식 (실제 chat completion, max_tokens: 1, TTFB 측정)
2. Circuit Breaker: Closed → Open → Half-Open → Closed
   - Closed: failCount >= 3 → Open
   - Open: cooldown 후 Half-Open (cooldown은 exponential: 60s, 120s, 240s, 최대 300s)
   - Half-Open: 1개 요청 허용. 성공 → Closed, 실패 → Open (cooldown 2배)
3. AI SDK의 generateText()로 핑 (CLI subprocess 아님)
4. 상태 메모리 저장 (세션 간 비공유)

[핵심 API]
- ping(modelId: string, provider: string): Promise<PingResult>
- pingAll(models: ModelMetadata[]): Promise<PingResult[]>
- getCircuitState(provider: string, modelId: string): CircuitBreakerState
- isAvailable(provider: string, modelId: string): boolean
- recordSuccess(provider: string, modelId: string): void
- recordFailure(provider: string, modelId: string): void

[핑 동시성]
- 초기 (세션 시작): 최대 20개 병렬
- 이후 (개별 체크): 직렬 또는 소수 병렬
- 타임아웃: 3초 (frouter보다 약간 여유)

[일일 RPD 예산 추적]
무료 tier의 일일 요청 한도(Groq 1,000 RPD, OpenRouter 50 RPD, NIM 미명시)를
초과하면 모든 요청이 429로 실패한다. 이를 사전 방지하기 위해:

- 인메모리 카운터: provider별 당일 요청 수 추적
- 80% 경고: RPD의 80% 도달 시 logger.warn 출력
- 100% 차단: RPD 초과 시 해당 provider를 circuit breaker open과 동일하게 처리
  → 다른 provider로 자동 fallback
- 리셋: 자정(UTC) 또는 세션 시작 시 카운터 초기화
- 설정:
  dailyBudget: z.record(z.string(), z.number()).optional()
  // 예: { "groq": 1000, "openrouter": 50 }
  // 미설정 시 추적 비활성화 (NIM처럼 한도 미명시인 경우)

핵심 API 추가:
- recordRequest(provider: string): void
- getRemainingBudget(provider: string): number | null
- isWithinBudget(provider: string): boolean
```

#### 5.3.4 `src/l0/family-classifier.ts` (신규)

**책임**: 모델 ID에서 패밀리를 추출하고, reasoning 여부를 판정.

```
[설계]
1. Regex 패턴 매칭으로 7개 주요 패밀리 분류
2. 증류 모델 처리: "deepseek-r1-distill-qwen3" → base는 Qwen (다양성 목적)
3. Reasoning 판정: 모델명 패턴 + 알려진 reasoning 모델 목록

[패밀리 패턴]
deepseek → "deepseek"
qwen|qwq → "qwen"
llama → "llama"
mistral|mixtral|codestral → "mistral"
gemma → "gemma"
phi → "phi"
glm → "glm"
gpt-oss|gpt → "openai"
kimi → "moonshot"
기타 → "unknown"

[Reasoning 판정]
- /r1|reasoning|think|qwq/i → true
- 알려진 목록: deepseek-r1*, qwq-32b, glm-4.7 (thinking mode)
- 기본값: false

[증류 모델 규칙]
- "distill-{family}" 패턴 감지 시 → base family로 분류
- 예: deepseek-r1-distill-llama-70b → family: "llama" (not "deepseek")
- reasoning은 원래 모델 기준: → isReasoning: true (R1 증류이므로)
```

#### 5.3.5 `src/l0/model-selector.ts` (신규)

**책임**: Thompson Sampling + diversity constraint로 최적 모델 조합 선택.

```
[설계]

1. 입력
   - count: 선택할 모델 수 (config.reviewers에서 auto: true인 수)
   - constraints: 패밀리 다양성, reasoning 비율, context 최소 등
   - availableModels: 현재 사용 가능한 모델 목록 (circuit breaker 통과)
   - banditState: 각 모델의 Beta(α, β) 상태

2. 선택 알고리즘
   a. 강제 탐색 슬롯 배정 (count × explorationRate, 최소 0)
      → 가장 적게 사용된 모델에서 랜덤 선택
   b. 나머지 슬롯: Thompson Sampling
      → 각 모델의 Beta(α+1, β+1)에서 θ 샘플링
      → 상위 모델 선택 (greedy)
   c. 다양성 제약 적용:
      → 같은 패밀리 최대 2개
      → 최소 minFamilies개 패밀리
      → reasoning 모델 min~max개
   d. 제약 위반 시: 위반 모델을 제거하고 차순위로 교체

3. 콜드 스타트 (banditState가 없거나 불충분할 때)
   a. 낙관적 초기화: α=2, β=1
   b. Tier 기반 가중치: S+ 모델 선호
   c. 다양성 우선: 가능한 많은 패밀리에서 1개씩

[핵심 API]
- selectModels(request: SelectionRequest): ModelSelection
- getBanditState(): Map<string, BanditArm>
- updateBandit(modelId: string, reward: 0 | 1): void

[BanditArm 타입]
interface BanditArm {
  alpha: number;
  beta: number;
  reviewCount: number;
  lastUsed: number;
}
```

#### 5.3.6 `src/l1/reviewer.ts` 수정

`auto` 리뷰어가 L0에서 해소된 후 L1에 도달하므로, `ReviewerInput` 자체는 변경 불필요. 변경은 orchestrator의 `resolveReviewers()`에서 처리.

단, `executeReviewer()`의 에러 메시지에 auto 리뷰어 출처 정보를 포함:

```typescript
// reviewer.ts의 executeReviewer() 내부
// 기존: error message에 config.id만 표시
// 변경: selectionReason이 있으면 함께 표시 (디버깅 용이)

export interface ReviewerInput {
  config: AgentConfig;
  groupName: string;
  diffContent: string;
  prSummary: string;
  selectionMeta?: {                    // Phase 2 추가 (optional)
    selectionReason: string;           // 'thompson-sampling' | 'exploration' | 'static'
    family: string;
    isReasoning: boolean;
  };
}

// executeReviewer 에러 로깅에서:
logger.error(
  `Reviewer ${input.config.id} failed` +
  (input.selectionMeta ? ` [${input.selectionMeta.selectionReason}, ${input.selectionMeta.family}]` : '')
);
```

> **핵심**: L0 → orchestrator → L1 경계에서 `AutoReviewerConfig`는 이미 `AgentConfig`로 변환된 상태. L1은 auto/static 구분 없이 동일하게 처리. `selectionMeta`는 순수 로깅/디버깅 목적.

#### 5.3.7 `src/pipeline/orchestrator.ts` 수정

L0 모델 선택을 `executeReviewers()` 전에 삽입:

```typescript
import { resolveReviewers } from '../l0/index.js';

// === L0 MODEL SELECTION (Phase 2) ===
// auto: true 리뷰어를 L0가 해소하여 완전한 AgentConfig로 변환
const { resolvedReviewers, autoCount } = await resolveReviewers(
  config.reviewers,
  config.modelRouter
);

// resolveReviewers 로직:
// 1. ReviewerEntry[] 순회
// 2. auto !== true → AgentConfig 그대로 반환 (selectionMeta 없음)
// 3. auto === true → L0 ModelSelector.selectModels() 호출
//    → HealthMonitor.isAvailable()로 필터링
//    → 선택된 모델로 AgentConfig 생성 (backend: 'api')
//    → selectionMeta 첨부
// 4. 최종 AgentConfig[] 반환

// 이후 기존 코드에서 config.reviewers 대신 resolvedReviewers 사용:
const enabledReviewers = resolvedReviewers.filter(r => r.config.enabled);
```

### 5.4 Config 예시 (Phase 2)

```jsonc
{
  "reviewers": [
    // 정적 리뷰어 (변경 없음)
    { "id": "r1", "model": "deepseek-chat", "backend": "api", "provider": "nvidia-nim" },

    // 동적 리뷰어 (L0가 모델 배정)
    { "id": "auto-1", "auto": true },
    { "id": "auto-2", "auto": true },
    { "id": "auto-3", "auto": true }
  ],
  "modelRouter": {
    "enabled": true,
    "providers": {
      "groq": { "apiKey": "{env:GROQ_API_KEY}" },
      "nvidia-nim": { "apiKey": "{env:NVIDIA_API_KEY}" },
      "openrouter": { "apiKey": "{env:OPENROUTER_API_KEY}" }
    },
    "constraints": {
      "familyDiversity": true,
      "includeReasoning": true,
      "minFamilies": 3,
      "reasoningMin": 1,
      "reasoningMax": 2,
      "contextMin": "32k"
    },
    "circuitBreaker": {
      "failureThreshold": 3,
      "cooldownMs": 60000
    },
    "explorationRate": 0.1
  }
}
```

### 5.5 frouter 데이터 통합

```
[frouter에서 가져오는 것]
1. model-rankings.json → src/data/model-rankings.json (직접 복사)
2. Tier 시스템 (S+~C)
3. 모델 메타데이터 (context, AA Intelligence, AA Speed TPS)

[자체 추가]
1. groq-models.json: Groq 무료 모델 (frouter에 없음)
2. family 태깅 (FamilyClassifier로 자동)
3. isReasoning 태깅

[데이터 갱신]
- frouter npm 업데이트 시 model-rankings.json 수동 복사
- 자동 갱신 파이프라인은 Phase 4 이후 로드맵
```

### 5.6 Phase 2 완료 기준

- [ ] `auto: true` 리뷰어가 L0에서 모델을 자동 배정받음
- [ ] circuit breaker가 3회 실패 후 모델을 차단하고 cooldown 후 복구
- [ ] 5개 리뷰어 선택 시 최소 3개 패밀리 보장
- [ ] reasoning 모델 1-2개 포함 보장
- [ ] 핑 프로토콜로 TTFB 측정
- [ ] 유닛 테스트: 모든 L0 모듈
- [ ] 통합 테스트: auto 리뷰어 + 정적 리뷰어 혼합 파이프라인

---

## 6. Phase 3 — 품질 피드백 루프

> **목표**: 리뷰 결과를 바탕으로 모델 품질을 추적하고 Thompson Sampling의 reward signal로 피드백.

### 6.1 신규 파일 목록

| 파일 | 설명 |
|------|------|
| `src/l0/quality-tracker.ts` | 리뷰 품질 측정 + 복합 Q 점수 계산 |
| `src/l0/specificity-scorer.ts` | 즉시 계산 가능한 구체성 점수 |
| `src/l0/bandit-store.ts` | Bandit 상태 영속 저장 |
| `src/data/model-quality.json` | 모델별 품질 이력 (런타임 생성) |
| `src/tests/l0-quality-tracker.test.ts` | 품질 추적 테스트 |
| `src/tests/l0-specificity-scorer.test.ts` | 구체성 점수 테스트 |
| `src/tests/l0-bandit-store.test.ts` | Bandit 저장소 테스트 |

### 6.2 수정 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/l0/model-selector.ts` | **수정** | bandit-store에서 상태 로드/저장 |
| `src/l2/moderator.ts` | **수정** | 토론 결과 → quality-tracker에 피드백 |
| `src/l3/verdict.ts` | **수정** | Head verdict → quality-tracker에 피드백 |
| `src/pipeline/orchestrator.ts` | **수정** | 파이프라인 끝에서 품질 피드백 수집 |

### 6.3 상세 구현

#### 6.3.1 `src/l0/specificity-scorer.ts` (신규)

L1 리뷰어 출력을 즉시 평가 (L2/L3 결과 불필요):

```
[점수 항목 (각 0.0~0.2, 합계 0.0~1.0)]
1. hasLineRef: evidence에 라인 번호 참조 존재? (+0.2)
2. hasCodeToken: evidence에 코드 토큰(변수명, 함수명) 포함? (+0.2)
3. hasActionVerb: suggestion에 행동 동사 포함? (+0.2)
4. wordCount: problem + evidence 합산 단어 수 (log scaled, +0.0~0.2)
5. hasSeverityRationale: severity 선택 근거가 명시적? (+0.2)
```

#### 6.3.2 `src/l0/quality-tracker.ts` (신규)

3가지 signal을 수집하여 복합 Q 점수 계산:

```
[Signal 수집 시점]
1. Specificity (L1 직후): 즉시 계산
2. Peer Validation (L2 토론 후): moderator report에서 추출
3. Head Acceptance (L3 verdict 후): head verdict에서 추출

[복합 Q 점수]
Q(model) = 0.45 × head_acceptance + 0.35 × peer_validation + 0.20 × specificity

[Reward Signal]
Q >= 0.5 → reward = 1 (α += 1)
Q <  0.5 → reward = 0 (β += 1)

[데이터 스키마]
interface ReviewRecord {
  reviewId: string;
  diffId: string;         // session ID
  modelId: string;
  modelVersion: string;   // 모델 버전 (provider API 응답 또는 data/*.json 기준)
  provider: string;
  timestamp: number;
  issuesRaised: number;
  specificityScore: number;
  peerValidationRate: number | null;   // L2 후 채움
  headAcceptanceRate: number | null;   // L3 후 채움
  compositeQ: number | null;           // 전부 채워지면 계산
  rewardSignal: 0 | 1 | null;         // compositeQ 계산 후 결정
}
```

#### 6.3.3 `src/l0/bandit-store.ts` (신규)

Bandit 상태를 파일 시스템에 영속 저장:

```
[저장 위치]
.ca/model-quality.json

[스키마]
{
  "version": 1,
  "lastUpdated": "2026-03-03T...",
  "arms": {
    "groq/deepseek-r1-distill-llama-70b": {
      "alpha": 15,
      "beta": 3,
      "reviewCount": 18,
      "lastUsed": 1709424000000
    },
    ...
  },
  "history": [
    { ReviewRecord }
  ]
}

[모델 버전 관리]
- key: "{provider}/{modelId}@{modelVersion}"
  (modelVersion 미확인 시 "unknown"으로 fallback, 다음 핑에서 갱신)
- 새 버전 출시 시 → 새 arm 생성
- 이전 arm의 prior를 50% decay로 warm-start:
  newAlpha = round(oldAlpha × 0.5) + 1
  newBeta = round(oldBeta × 0.5) + 1

[콜드 스타트]
- 새 모델: α=2, β=1 (낙관적)
- 30회 리뷰 전까지 L2 토론에서 가중치 감소 (정규화)
```

### 6.4 피드백 흐름

```
L1 리뷰어 실행
  ↓
specificity-scorer: 즉시 점수 계산 → ReviewRecord.specificityScore
  ↓
L2 토론 진행
  ↓
quality-tracker: 토론 결과에서 peer_validation 추출 → ReviewRecord.peerValidationRate
  ↓
L3 Head 판정
  ↓
quality-tracker: verdict에서 acceptance 추출 → ReviewRecord.headAcceptanceRate
  ↓
compositeQ 계산 → rewardSignal 결정
  ↓
bandit-store: arm 업데이트 (α 또는 β 증가)
  ↓
다음 세션의 model-selector에서 반영
```

### 6.5 향후 확장: Bradley-Terry 글로벌 랭킹 (Phase 3 이후 로드맵)

Thompson Sampling은 각 모델의 독립적 성능을 추적하지만, **모델 간 상대 비교**는 하지 않는다.
같은 diff를 리뷰한 두 모델의 Q 점수를 "매치업"으로 취급하여 글로벌 랭킹을 추정할 수 있다:

```
P(model_i beats model_j) = exp(β_i) / (exp(β_i) + exp(β_j))
```

- 전체 이력에 대해 MLE 추정 (ELO의 K-factor 튜닝 불필요)
- 부트스트래핑으로 신뢰구간 계산
- **50회 리뷰 이후**부터 의미 있는 분리 → Phase 3 데이터 축적 후 구현이 자연스러움
- 구현 시 `bandit-store.ts`의 history 데이터를 활용하여 별도 `bradley-terry.ts` 모듈로 분리

> **현재 Phase 3 범위에서 제외**. Thompson Sampling으로 충분한 모델 선택 품질을 확보한 뒤, 데이터가 축적되면 추가 구현.

### 6.6 Phase 3 완료 기준

- [ ] 리뷰 완료 후 specificity score 자동 계산
- [ ] L2 토론 결과에서 peer validation rate 추출
- [ ] L3 verdict에서 head acceptance rate 추출
- [ ] 복합 Q 점수 계산 및 bandit arm 업데이트
- [ ] `.ca/model-quality.json`에 이력 영속 저장
- [ ] 새 모델 warm-start (50% decay) 동작
- [ ] 유닛 테스트: specificity-scorer, quality-tracker, bandit-store
- [ ] 통합 테스트: 파이프라인 2회 실행 후 bandit 상태 변화 검증

---

## 7. Phase 4 — Config 진화 (Fully Declarative)

> **목표**: 리뷰어를 개별 지정하지 않고 "5개 리뷰어, 3+ 패밀리, reasoning 1-2개"처럼 선언적으로 설정.

### 7.1 수정/신규 파일

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/types/config.ts` | **수정** | `reviewers` 필드가 배열 또는 선언적 객체 허용 |
| `src/config/loader.ts` | **수정** | 선언적 config → 내부 AgentConfig 배열 변환 |
| `src/l0/model-selector.ts` | **수정** | 선언적 constraints 직접 수용 |
| `src/tests/config-declarative.test.ts` | **신규** | 선언적 config 파싱/변환 테스트 |

### 7.2 Config 스키마 (Phase 4)

```typescript
// reviewers 필드가 두 가지 형태 허용
const ReviewersSchema = z.union([
  // 기존: 배열 방식
  z.array(AgentConfigSchema).min(1),

  // 신규: 선언적 방식
  z.object({
    count: z.number().int().min(1).max(10),
    constraints: z.object({
      minFamilies: z.number().default(3),
      reasoning: z.object({
        min: z.number().default(1),
        max: z.number().default(2),
      }).optional(),
      contextMin: z.string().default('32k'),
      tierMin: z.string().default('B'),       // 최소 tier
      preferProviders: z.array(z.string()).optional(),
    }).optional(),
    static: z.array(AgentConfigSchema).optional(),  // 고정 리뷰어 (선택)
  }),
]);
```

### 7.3 Config 예시 (Phase 4)

```jsonc
{
  "reviewers": {
    "count": 5,
    "constraints": {
      "minFamilies": 3,
      "reasoning": { "min": 1, "max": 2 },
      "contextMin": "32k",
      "tierMin": "A-"
    },
    "static": [
      // 항상 포함할 고정 리뷰어 (선택)
      { "id": "r-fixed", "model": "deepseek-chat", "backend": "api", "provider": "nvidia-nim" }
    ]
  },
  "modelRouter": {
    "providers": {
      "groq": {},
      "nvidia-nim": {},
      "openrouter": {}
    },
    "strategy": "thompson-sampling",
    "circuitBreaker": { "failureThreshold": 3, "cooldownMs": 60000 }
  }
}
```

### 7.4 변환 로직

```
선언적 config 입력
  ↓
static 리뷰어 추출 (있으면)
  ↓
remaining = count - static.length
  ↓
L0 ModelSelector에 remaining개 요청 + constraints
  ↓
선택된 모델 → AgentConfig 배열로 변환
  ↓
static + dynamic 합쳐서 최종 reviewers 배열
```

### 7.5 Phase 4 완료 기준

- [ ] 선언적 config(`{ count: 5, constraints: {} }`)가 정상 파싱
- [ ] 기존 배열 config도 동일하게 동작 (하위 호환)
- [ ] `static` + 자동 선택 혼합 동작
- [ ] tier 최소 제한 동작
- [ ] 유닛 테스트: 선언적 config 파싱, 변환, 제약 위반 검증

---

## 8. 테스트 전략

### 8.1 테스트 레벨

| 레벨 | 대상 | 도구 | mock 여부 |
|------|------|------|----------|
| Unit | 개별 함수/클래스 | vitest | AI SDK mock |
| Integration | 모듈 간 연동 | vitest | 외부 API mock |
| E2E (수동) | 전체 파이프라인 | CLI 직접 실행 | 실제 API 호출 |

### 8.2 Phase별 테스트

#### Phase 1 테스트

```
l1-api-backend.test.ts
├── generateText 성공 시 텍스트 반환
├── generateText 실패 시 에러 전파
├── 타임아웃 처리 (AbortSignal)
├── provider 미지정 시 에러
└── 알 수 없는 provider 시 에러

l1-provider-registry.test.ts
├── Groq provider 생성 성공
├── NIM provider 생성 성공
├── OpenRouter provider 생성 성공
├── 캐시 히트 검증 (같은 provider 2회 요청)
├── API 키 미설정 시 에러
└── 지원하지 않는 provider 시 에러

config-api-backend.test.ts
├── backend: 'api' + provider 있음 → 유효
├── backend: 'api' + provider 없음 → 에러
├── 기존 backend 타입 → 기존 동작 유지
```

#### Phase 2 테스트

```
l0-model-registry.test.ts
├── model-rankings.json 로드 성공
├── groq-models.json 로드 성공
├── provider별 필터링
├── family별 필터링
├── tier별 필터링
└── reasoning 모델 필터링

l0-health-monitor.test.ts
├── 핑 성공 → latency 반환
├── 핑 실패 → down 반환
├── 429 응답 → rate-limited 반환
├── circuit breaker: 3회 실패 → open
├── circuit breaker: cooldown 후 → half-open
├── circuit breaker: half-open 성공 → closed
├── circuit breaker: half-open 실패 → open (cooldown 2배)
└── isAvailable: open 상태 → false

l0-family-classifier.test.ts
├── deepseek → "deepseek"
├── qwen/qwq → "qwen"
├── llama → "llama"
├── mistral/mixtral → "mistral"
├── gemma → "gemma"
├── phi → "phi"
├── glm → "glm"
├── 증류 모델: deepseek-r1-distill-llama → "llama"
├── 증류 모델: deepseek-r1-distill-qwen → "qwen"
├── reasoning 판정: r1 → true
├── reasoning 판정: qwq → true
├── reasoning 판정: llama-3.3 → false
└── 알 수 없는 모델 → "unknown"

l0-model-selector.test.ts
├── 콜드 스타트: tier 기반 선택
├── Thompson Sampling: 높은 α 모델 선호
├── 다양성 제약: 같은 패밀리 최대 2개
├── 다양성 제약: 최소 3개 패밀리
├── reasoning 제약: min 1, max 2
├── 강제 탐색: explorationRate 반영
├── circuit breaker 차단 모델 제외
└── 사용 가능한 모델 부족 시 제약 완화
```

#### Phase 3 테스트

```
l0-specificity-scorer.test.ts
├── 라인 참조 있음 → +0.2
├── 코드 토큰 있음 → +0.2
├── 행동 동사 있음 → +0.2
├── 단어 수 기반 점수
├── severity 근거 있음 → +0.2
├── 완전한 evidence → 1.0
└── 빈 evidence → 0.0

l0-quality-tracker.test.ts
├── specificity score 기록
├── peer validation rate 기록
├── head acceptance rate 기록
├── 복합 Q 계산 (3개 signal 모두 있을 때)
├── 부분 signal만 있을 때 → null
├── reward signal 결정 (Q >= 0.5 → 1)
└── reward signal 결정 (Q < 0.5 → 0)

l0-bandit-store.test.ts
├── 빈 상태에서 초기화
├── arm 업데이트 (α 증가)
├── arm 업데이트 (β 증가)
├── 파일 저장/로드 round-trip
├── warm-start (50% decay)
└── history 추가
```

### 8.3 AI SDK Mocking 전략

```typescript
// vitest에서 AI SDK mock
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: 'mocked response' }),
}));

// Provider mock
vi.mock('@ai-sdk/groq', () => ({
  createGroq: vi.fn().mockReturnValue(
    (model: string) => ({ modelId: model, provider: 'groq' })
  ),
}));
```

---

## 9. 마이그레이션 가이드

### Phase 1 마이그레이션 (CLI → API)

기존 config:
```json
{ "id": "r1", "model": "deepseek-chat", "backend": "opencode", "provider": "nvidia-nim" }
```

API로 전환:
```json
{ "id": "r1", "model": "deepseek-chat", "backend": "api", "provider": "nvidia-nim" }
```

필요 환경변수:
```bash
export NVIDIA_API_KEY="nvapi-..."
export GROQ_API_KEY="gsk_..."
export OPENROUTER_API_KEY="sk-or-..."
```

### Phase 2 마이그레이션 (정적 → 동적 혼합)

기존 정적 리뷰어에 동적 리뷰어 추가:
```json
{
  "reviewers": [
    { "id": "r1", "model": "deepseek-chat", "backend": "api", "provider": "nvidia-nim" },
    { "id": "auto-1", "auto": true },
    { "id": "auto-2", "auto": true }
  ],
  "modelRouter": { "enabled": true, "providers": { "groq": {} } }
}
```

---

## 10. 위험 요소 및 대응

| 위험 | 영향 | 확률 | 대응 |
|------|------|------|------|
| 무료 API rate limit 초과 | 리뷰 실패 | 높음 | circuit breaker + multi-provider fallback |
| frouter 데이터 오래됨 | 죽은 모델 선택 | 중간 | 핑 프로토콜로 런타임 검증 |
| AI SDK breaking change | 빌드 실패 | 낮음 | minor 버전 고정 + lockfile |
| Groq 무료 정책 변경 | provider 사용 불가 | 중간 | 3-tier provider fallback |
| Thompson Sampling 수렴 느림 | 서브옵티멀 선택 | 낮음 | 콜드 스타트 프로토콜 + 10% 탐색 |
| 증류 모델 패밀리 오분류 | 다양성 착각 | 낮음 | base architecture 기준 분류 규칙 |

### 의도적 Deferred 항목 (리서치에서 언급되었으나 현재 범위 밖)

| 항목 | 리서치 위치 | 결정 | 비고 |
|------|-----------|------|------|
| Bradley-Terry 글로벌 랭킹 | S7 | Phase 3 이후 로드맵 | 50회+ 리뷰 데이터 필요 (Section 6.5 참고) |
| 변별적 diff 평가 (콜드 스타트) | S7 | Phase 3 이후 | Q 분산 큰 diff 20-50개로 새 모델 빠른 평가. 데이터 축적 전제 |
| model-quality.json git 정책 | S10 Q2 | Phase 3 구현 시 결정 | `.gitignore` 추천 (개인별 누적이 자연스러움). 팀 공유 시 별도 export 명령 |
| Context window × diff 크기 매칭 | S10 Q6 | Phase 2 이후 | `contextMin` 정적 제약은 존재. 런타임 diff 토큰 수 계산 → 모델 필터링은 추후 |
| UCB1 전략 대안 | S7 | 향후 strategy enum 확장 | 현재 Thompson Sampling만 지원. 결정적 디버깅이 필요할 때 추가 |

### 성능 영향

| 항목 | CLI 백엔드 | API 백엔드 | 차이 |
|------|-----------|-----------|------|
| Cold start | ~200-500ms (Go binary) | 0ms | API 우위 |
| 요청 지연 | CLI overhead + API | API only | API 우위 |
| 429 처리 | 프로세스 hang 가능 | 타입된 에러 | API 우위 |
| 디버깅 | stderr 텍스트 파싱 | 타입된 에러 객체 | API 우위 |

---

## 11. Phase별 체크리스트

### Phase 1 (하이브리드 백엔드) — 예상 규모: ~400줄

- [ ] `BackendSchema`에 `'api'` 추가
- [ ] `AgentConfigSchema` refinement 추가
- [ ] `provider-registry.ts` 구현
- [ ] `api-backend.ts` 구현
- [ ] `backend.ts`에 API 분기 추가
- [ ] AI SDK 의존성 추가 (`ai`, `@ai-sdk/groq`, `@ai-sdk/openai-compatible`, `@openrouter/ai-sdk-provider`)
- [ ] 유닛 테스트 3개 파일
- [ ] 기존 테스트 통과 확인
- [ ] 통합 테스트 (Groq API로 1회 리뷰)

### Phase 2 (L0 Model Intelligence) — 예상 규모: ~800줄

- [ ] `types/l0.ts` 타입 정의
- [ ] `data/model-rankings.json` 복사
- [ ] `data/groq-models.json` 작성
- [ ] `l0/model-registry.ts` 구현
- [ ] `l0/health-monitor.ts` 구현
- [ ] `l0/family-classifier.ts` 구현
- [ ] `l0/model-selector.ts` 구현
- [ ] `l0/index.ts` public API
- [ ] `types/config.ts`에 `ModelRouterConfig` 추가
- [ ] `config/loader.ts` 수정
- [ ] `pipeline/orchestrator.ts`에 L0 삽입
- [ ] `l1/reviewer.ts`에 auto 리뷰어 처리
- [ ] 유닛 테스트 4개 파일
- [ ] 통합 테스트 (auto 리뷰어 혼합 파이프라인)

### Phase 3 (품질 피드백) — 예상 규모: ~500줄

- [ ] `l0/specificity-scorer.ts` 구현
- [ ] `l0/quality-tracker.ts` 구현
- [ ] `l0/bandit-store.ts` 구현
- [ ] `l2/moderator.ts` 피드백 연동
- [ ] `l3/verdict.ts` 피드백 연동
- [ ] `pipeline/orchestrator.ts` 피드백 수집 추가
- [ ] `.ca/model-quality.json` 스키마 설계
- [ ] 유닛 테스트 3개 파일
- [ ] 통합 테스트 (2회 실행 후 bandit 변화)

### Phase 4 (선언적 Config) — 예상 규모: ~300줄

- [ ] `types/config.ts` 선언적 스키마 추가
- [ ] `config/loader.ts` 변환 로직
- [ ] `l0/model-selector.ts` 선언적 제약 수용
- [ ] 유닛 테스트 1개 파일
- [ ] 기존 config 하위 호환 검증

### 총 예상 규모

| Phase | 신규 코드 | 테스트 코드 | 합계 |
|-------|----------|-----------|------|
| Phase 1 | ~250줄 | ~150줄 | ~400줄 |
| Phase 2 | ~550줄 | ~250줄 | ~800줄 |
| Phase 3 | ~350줄 | ~150줄 | ~500줄 |
| Phase 4 | ~200줄 | ~100줄 | ~300줄 |
| **합계** | **~1,350줄** | **~650줄** | **~2,000줄** |

---

*Generated from frouter integration research (docs/5_FROUTER_INTEGRATION_RESEARCH.md), 2026-03-03*
