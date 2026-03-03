# frouter × CodeAgora 통합 리서치

> 작성일: 2026-03-03
> 상태: 리서치 완료, 구현 미착수

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [frouter 기술 분석](#2-frouter-기술-분석)
3. [모델 라우터 생태계](#3-모델-라우터-생태계)
4. [무료 모델 Provider 현황](#4-무료-모델-provider-현황)
5. [SWE-bench와 코드 리뷰 품질](#5-swe-bench와-코드-리뷰-품질)
6. [모델 패밀리 다양성](#6-모델-패밀리-다양성)
7. [품질 피드백 루프 설계](#7-품질-피드백-루프-설계)
8. [백엔드 아키텍처 결정](#8-백엔드-아키텍처-결정)
9. [최종 통합 설계](#9-최종-통합-설계)
10. [열린 질문들](#10-열린-질문들)
11. [참고 문헌](#11-참고-문헌)

---

## 1. 프로젝트 개요

### frouter란?

- **저장소**: https://github.com/jyoung105/frouter
- **npm**: `frouter-cli@1.1.10`
- **라이선스**: MIT
- **설명**: Free model router CLI — 무료 AI 모델을 발견하고, 핑/지연시간을 측정하며, OpenCode CLI용으로 설정하는 도구
- **제작자**: Tony Lee (jyoung105)

### 통합 동기

CodeAgora는 멀티 LLM 코드 리뷰 파이프라인. 리뷰어 모델이 config에 하드코딩되어 있어 모델이 죽거나 느려져도 대응 불가. frouter의 실시간 모델 발견 + 헬스체크를 결합하면 동적 모델 선택이 가능.

---

## 2. frouter 기술 분석

### 기본 정보

| 항목 | 값 |
|------|-----|
| 런타임 | Node.js >=18.0.0 (Bun은 패키지 매니저로만 사용) |
| 의존성 | **zero** production dependencies |
| 빌드 | TypeScript → dist/ (ESM only) |
| Provider | NVIDIA NIM, OpenRouter |
| 모델 수 | 168개 (NIM 140 + OpenRouter 28) |

### Node.js 호환성

- Bun 전용 API (`Bun.file`, `Bun.serve` 등) **사용하지 않음**
- 모든 I/O: `node:fs`, `node:https`, `node:http`, `node:path`, `node:os` 표준 빌트인
- `package.json`에 `"engines": { "node": ">=18.0.0" }` 명시
- Bun 관련 코드는 설치 도구 감지 로직뿐 (런타임 아님)

### 핑 프로토콜

frouter의 핑은 단순 health check가 아닌 **실제 chat completion 요청**:

```
POST {provider_base_url}/chat/completions
{
  "model": "{model_id}",
  "messages": [{ "role": "user", "content": "hi" }],
  "max_tokens": 1
}
```

- 측정값: TTFB (Time-to-First-Byte) — `performance.now()`로 추론 지연시간 측정
- 초기 타임아웃: 2.5초, 정상 상태: 6초
- 동시성: 초기 64개, 정상 20개 병렬 핑
- Keep-alive 연결로 TCP 재사용

### --best 알고리즘

**가중 점수가 아닌 순차 우선순위 캐스케이드**:

```
1. status: up > 나머지
2. tier: S+ > S > A+ > A > A- > B+ > B > C
3. avg latency: 낮을수록
4. uptime %: 높을수록
5~7. provider/display name/model ID (알파벳)
```

낮은 tier 모델은 latency가 아무리 좋아도 높은 tier를 이길 수 없음.

실행 흐름:
1. 최대 4라운드 핑
2. 2라운드 후 평균 <500ms인 명확한 승자가 있으면 조기 종료
3. stdout으로 `providerKey/modelId` 출력

### 429 (Rate Limit) 처리

- `429`는 "alive but busy"로 분류 (fatal이 아님)
- `consecutiveFails` 카운터 증가
- 3회 연속 실패 시 exponential backoff: `2^(fails-3)` 라운드 스킵, 최대 32라운드
- 429 응답은 latency 평균에 포함되지 않음 (HTTP 200만 집계)

### 데이터 파일

#### model-rankings.json (168개 모델)

```json
{
  "source": "https://artificialanalysis.ai",
  "models": [
    {
      "source": "nim",
      "model_id": "z-ai/glm5",
      "name": "GLM 5",
      "swe_bench": "77.8%",
      "tier": "S+",
      "context": "128k",
      "aa_intelligence": 50,
      "aa_speed_tps": 63.2,
      "aa_price_input": 1,
      "aa_price_output": 3.2
    }
  ]
}
```

Tier 분포: S+(12), S(10), A+(4), A(18), A-(10), B+(23), B(27), C(64)

#### model-support.json

```json
{
  "source": "https://models.dev/api.json",
  "providers": { "nvidia": [], "openrouter": [] }
}
```

### npm 패키지 구조

```
dist/
  bin/frouter.js          ← CLI 엔트리포인트
  lib/config.js           ← API 키 관리
  lib/models.js           ← 모델 발견/분류
  lib/ping.js             ← TTFB 측정
  lib/targets.js          ← OpenCode/OpenClaw config 쓰기
  lib/utils.js            ← 정렬/랭킹
  model-rankings.json     ← 168개 모델 메타데이터
  model-support.json      ← provider별 모델 목록
```

`"exports"` 필드 없음 (bin만 선언). 라이브러리 import는 `frouter-cli/dist/lib/*.js` deep path로 가능하지만 안정성 보장 없음.

---

## 3. 모델 라우터 생태계

### 경쟁 제품 비교

| 도구 | 유형 | 무료 모델 발견 | CLI/TUI | 실시간 핑 | 자체 호스팅 |
|------|------|------------|---------|----------|----------|
| **frouter** | CLI TUI | Yes | Yes | Yes | No |
| **freerouter** | 로컬 프록시 | No | No | No | Yes |
| **LiteLLM** | 프록시/게이트웨이 | No | No | No | Yes |
| **RouteLLM** | 비용 라우터 | No | No | No | Yes |
| **LLMRouter** | 연구 라이브러리 | No | Yes | No | Yes |
| **Mastra Router** | SDK | No | No | No | SaaS |
| **llm-openrouter** | CLI 플러그인 | 부분 | Yes | No | N/A |

**frouter의 고유 포지션**: 실시간 핑 + TUI + 무료 모델 우선 발견을 합친 유일한 도구.

### 프로덕션 LLM 라우팅 패턴

**3계층 신뢰성 모델**:

| 메커니즘 | 용도 | 동작 |
|----------|------|------|
| Retry + backoff | 일시적 오류 | Exponential: 2s, 4s, 8s... + jitter |
| Fallback | Provider 과부하 | 보조/3차 전환; 주 provider를 매번 탐색 (latency 추가) |
| **Circuit Breaker** | 시스템 장애 | Provider를 풀에서 제거, cooldown 후 복귀 |

**핵심**: 무료 endpoint에는 fallback보다 **circuit breaker**가 적합. Fallback은 죽은 endpoint를 매번 찔러보지만, circuit breaker는 cooldown 동안 아예 트래픽을 차단.

### LiteLLM 라우팅 전략

| 전략 | 동작 | 적합한 상황 |
|------|------|-----------|
| simple-shuffle | RPM/TPM 기반 가중 랜덤 | 대부분의 프로덕션 |
| latency-based | p95 지연시간 기준 라우팅 | 지연 민감 UX |
| usage-based | 분당 TPM 사용량 기준 (Redis 필요) | 토큰 쿼터 관리 |
| cost-based | 최저 비용 선택 | 비용 최소화 |
| least-busy | 진행 중 요청 최소 | 긴 스트리밍 |
| **custom** | 커스텀 클래스 구현 | **CodeAgora: diff 크기별 라우팅** |

---

## 4. 무료 모델 Provider 현황

### Provider 비교표

| Provider | 모델 수 | RPM | 일일 한도 | 지연시간 | 프로덕션 가능 |
|----------|---------|-----|----------|---------|------------|
| **Groq** | ~20+ | 30 | 1,000~14,400 | 매우 빠름 (LPU) | No (SLA 없음) |
| **NVIDIA NIM** | ~4-8 frontier | 40 | 미명시 | 가변 | No (체험판) |
| **OpenRouter** | 28-29 :free | 20 | 50 (크레딧 없이) | 가변 | No |
| Together AI | 다수 | — | $25 크레딧만 | 빠름 | No |

### Groq 상세

- **하드웨어**: LPU (Language Processing Unit) — GPU 대비 5-10x 빠른 추론
- **API**: OpenAI 100% 호환 (`https://api.groq.com/openai/v1`)
- **OpenCode 공식 지원**: `/connect` → "Groq" 선택으로 설정 가능
- **주요 무료 모델**:

| 모델 | ID | Context | RPM | RPD | 특징 |
|------|-----|---------|-----|-----|------|
| Llama 3.3 70B | `llama-3.3-70b-versatile` | 131K | 30 | 1,000 | 범용 워크호스 |
| DeepSeek R1 Distill 70B | `deepseek-r1-distill-llama-70b` | 128K | 30 | — | 최고 reasoning |
| Qwen 2.5 Coder 32B | `qwen-2.5-coder-32b-instruct` | 128K | 30 | — | 코드 특화 |
| QwQ 32B | `qwq-32b` | 128K | 30 | — | hybrid reasoning |
| Kimi K2 | `moonshotai/kimi-k2-instruct` | 256K | 60 | 1,000 | 대형 context |
| GPT-OSS 120B | `openai/gpt-oss-120b` | 131K | 30 | 1,000 | MoE reasoning |

- **Rate limit 초과 시**: HTTP 429 hard reject (큐잉 없음), `retry-after` 헤더 제공
- **CLI**: 공식 CLI 없음. API 직접 호출 또는 OpenCode 경유

### OpenRouter 무료 모델 현실

- 크레딧 없이: **50 req/day** (사실상 프로덕션 불가)
- $10+ 크레딧 구매 시: 1,000 req/day
- 무료 모델은 예고 없이 제거/변경 가능
- 피크 시 무료 요청은 유료 뒤로 밀림
- 일부 무료 모델은 프롬프트를 학습 데이터로 사용

### NVIDIA NIM 무료 티어

- 40 RPM (OpenRouter보다 나음)
- 일일 한도 미명시
- 10개 요청의 빠른 연속에서도 429 발생 보고
- SLA/uptime 보장 없음

---

## 5. SWE-bench와 코드 리뷰 품질

### 핵심 결론: SWE-bench는 코드 리뷰 품질 지표로 부적절

- **SWE-bench**: 코드 **작성**(패치 생성) 능력 측정
- **코드 리뷰**: 코드 **읽기 + 결함 발견** 능력 → 완전히 다른 역량
- 60.83%의 해결 이슈에 "solution leakage" (답 힌트) 존재
- 47.93%가 약한 테스트 스위트로 인한 오판 (SWE-Bench+ 논문)
- "SWE-Bench Illusion" 논문: 모델이 추론이 아닌 학습 데이터 기억으로 해결할 가능성

### 코드 리뷰에 적합한 벤치마크

| 벤치마크 | 측정 대상 | 리뷰 관련성 |
|----------|----------|-----------|
| **SWR-Bench** | PR 레벨 코드 리뷰, F1 vs 인간 판단 | 높음 — 리뷰 전용 |
| **CodeReviewer** | 코드 리뷰 생성 및 정제 | 높음 |
| **CodeReviewQA** | 코드 리뷰 결정에 대한 Q&A | 높음 |
| **CodeFuse-CR-Bench** | 엔드투엔드 Python 코드 리뷰 | 높음 |
| SWE-bench | 이슈 해결, 패치 생성 | **낮음** |

### Reasoning 모델의 우위

- DeepSeek-R1, QwQ가 같은 크기의 일반 모델보다 리뷰 성능 우수
- RLVR 학습은 **언제 추론할지**를 가르침 (추론 능력 자체는 base 모델도 보유)
- Reasoning 모델: 보안, 동시성, 논리 결함 깊은 분석에 적합
- Non-reasoning 모델: 스타일, 네이밍, API 오용 같은 패턴 기반 이슈에 적합

### 멀티 리뷰어 앙상블 연구

- 최고 모델(Gemini 2.5 Pro)도 SWR-Bench에서 F1 19.38%만 달성
- 5개 LLM 파이프라인이 단일 LLM보다 유의미하게 우수 (ICLR 2025)
- Claude Sonnet이 인간 리뷰와 가장 높은 상관관계 (특정 연구)
- **멀티 리뷰어 집계가 성능을 크게 향상** → CodeAgora의 설계가 학술적으로 검증됨

---

## 6. 모델 패밀리 다양성

### 교차 패밀리 앙상블 효과 (학술 근거)

#### arXiv:2510.21513 — "Wisdom and Delusion of LLM Ensembles for Code"

- 10개 모델, 5개 패밀리 (CodeLlama, DeepSeek, Gemma, Mistral, Qwen) 테스트
- 교차 패밀리 앙상블이 최고 단일 모델 대비 **최대 83% 향상**
- 다양성 기반 선택이 이론적 상한의 **95%** 달성
- **약한 모델도 고유한 해결책 기여**: DeepSeek 6B가 다른 모델이 못 찾는 26개 고유 버그 발견

#### arXiv:2512.12536 — "Diverse LLMs vs. Vulnerabilities"

- "다른 모델 패밀리가 **다른 취약점 유형**에서 뛰어남"
- 교차 패밀리 앙상블이 개별 평균 대비 **10-12% 높은 탐지 정확도**
- 코드 복잡도가 높을수록 이점 증가

#### arXiv:2602.08003 — "Don't Always Pick the Highest-Performing Model"

- Greedy MI (Mutual Information) 앙상블 선택 알고리즘 제안
- **핵심**: 높은 정확도 + 교차 패밀리 > 약한 다양한 모델
- 같은 패밀리 모델은 상관된 오류 → 앙상블 크기를 늘려도 오류 하한 개선 불가

### 주요 모델 패밀리 분류

| 패밀리 | 조직 | 아키텍처 | Attention | 특징 |
|--------|------|---------|-----------|------|
| **DeepSeek** | DeepSeek AI | MoE (671B/37B active) | MLA | KV cache 압축, 수학/코드 강점 |
| **Qwen** | Alibaba | Dense + MoE | GQA | 하이브리드 thinking 모드, 119개 언어 |
| **Llama** | Meta | Dense + alternating MoE | GQA | 최대 오픈 생태계 |
| **Mistral** | Mistral AI | Dense | GQA | 유럽 데이터, sliding window |
| **Gemma** | Google | Dense | GQA + sliding window (5:1) | 로컬+글로벌 attention |
| **Phi** | Microsoft | Dense, SLM | GQA | 합성 데이터 강조 |
| **GLM** | Zhipu AI | MoE (355B) | GQA + QK-Norm | 에이전틱/코딩 강점 |

### 패밀리 추출 로직

```typescript
const FAMILY_PATTERNS: [RegExp, string][] = [
  [/deepseek/i,                "deepseek"],
  [/qwen|qwq/i,               "qwen"],
  [/llama/i,                   "llama"],
  [/mistral|mixtral|codestral/i, "mistral"],
  [/gemma/i,                   "gemma"],
  [/phi/i,                     "phi"],
  [/glm/i,                     "glm"],
];

function extractFamily(modelId: string): string {
  const slug = modelId.split("/").pop() ?? modelId;
  for (const [pattern, family] of FAMILY_PATTERNS) {
    if (pattern.test(slug)) return family;
  }
  return "unknown";
}
```

**주의**: `deepseek-r1-distill-qwen3-8b`는 DeepSeek R1이 Qwen3에 증류된 것. 다양성 목적으로는 **base 아키텍처**(Qwen)가 더 중요.

### Reasoning 모델 현황 (패밀리별)

| 패밀리 | Base | Reasoning 변형 |
|--------|------|---------------|
| DeepSeek | V3 | R1, R1-0528 (순수 RL, SFT 없음) |
| Qwen | Qwen3 전 사이즈 | 내장 `/think` 토큰 (하이브리드) |
| Qwen | Qwen2.5 | QwQ-32B (전용 reasoning) |
| GLM | GLM-4.5/4.7 | thinking mode 토글 |
| Llama | 3.3 | 직접 없음 (R1-Distill-Llama로 간접) |
| Mistral | — | 공식 없음 |
| Gemma | — | 오픈 웨이트 없음 |

### 최적 앙상블 구성 (연구 기반)

**5-reviewer** (최대 다양성):

| Slot | 역할 | 패밀리 | 추천 모델 (Groq 무료) |
|------|------|--------|---------------------|
| 1 | Deep reasoning | DeepSeek | `deepseek-r1-distill-llama-70b` |
| 2 | Code specialist | Qwen | `qwen-2.5-coder-32b-instruct` |
| 3 | General balanced | Llama | `llama-3.3-70b-versatile` |
| 4 | Hybrid reasoning | Qwen | `qwq-32b` |
| 5 | Fast pattern | Meta | `llama-4-scout-17b-16e` |

**3-reviewer** (최소 구성):

1. DeepSeek-R1 (reasoning) + 2. Qwen-Coder (code specialist) + 3. Llama-70B (general)

**원칙**: reasoning 1-2개 + non-reasoning 2-3개 혼합. 같은 패밀리 최대 2개, 최소 3개 패밀리 보장.

---

## 7. 품질 피드백 루프 설계

### 리뷰 품질 자동 측정

#### Signal 1: Peer Validation Rate (L2 토론 후)

```
peer_validation_score(model) = confirmed_issues / (confirmed + challenged)
```

#### Signal 2: Head Agent Acceptance Rate (L3 verdict 후)

```
acceptance_rate(model) = accepted_issues / total_issues_raised
```

#### Signal 3: Specificity/Actionability Score (즉시 계산)

```typescript
interface SpecificityScore {
  hasLineRef: boolean;          // +0.2
  hasCodeToken: boolean;        // +0.2
  hasActionVerb: boolean;       // +0.2
  wordCount: number;            // log-scaled, +0.0–0.2
  hasSeverityRationale: boolean; // +0.2
  total: number;                // 0.0–1.0
}
```

#### 복합 품질 점수

```
Q(model) = 0.45 × head_acceptance + 0.35 × peer_validation + 0.20 × specificity
```

### Thompson Sampling (MAB)

```
각 모델 arm: Beta(α, β)
  α = 좋은 리뷰 수 (Q >= threshold)
  β = 나쁜 리뷰 수 (Q < threshold)

선택 시:
  θ_i ~ Beta(α_i + 1, β_i + 1)
  select = argmax(θ_i) + diversity constraint + 10% 강제 탐색

업데이트:
  Q >= threshold → α += 1
  Q <  threshold → β += 1
```

- ~40회 관찰 후 95% 최적 arm 수렴 (Stanford TS Tutorial)
- UCB1 대안: `score = Q̄ + sqrt(2 × log(total) / N)` — 결정적, 디버깅 용이

### Bradley-Terry 글로벌 랭킹

같은 diff를 리뷰한 두 모델을 "매치업"으로 취급:

```
P(model_i beats model_j) = exp(β_i) / (exp(β_i) + exp(β_j))
```

- 전체 이력에 대해 MLE 추정 (ELO의 K-factor 튜닝 불필요)
- 부트스트래핑으로 신뢰구간 계산
- 50회 리뷰 이후부터 의미 있는 분리

### 데이터 스키마

```typescript
interface ReviewRecord {
  reviewId: string;
  diffId: string;
  modelId: string;
  modelVersion: string;
  provider: string;
  timestamp: number;
  issuesRaised: number;
  rawOutput: string;
  specificityScore: number;
  peerValidationRate: number | null;
  headAcceptanceRate: number | null;
  compositeQ: number | null;
  rewardSignal: 0 | 1;
}
```

### 모델 버전 관리

- `modelId + modelVersion`으로 키 구성
- 새 버전 출시 시 새 arm 생성
- 이전 arm의 prior를 50% decay로 warm-start:

```typescript
function warmStartNewVersion(oldArm: BanditArm, decay = 0.5): BanditArm {
  return {
    alpha: Math.round(oldArm.alpha * decay) + 1,
    beta: Math.round(oldArm.beta * decay) + 1,
    reviewCount: 0,
  };
}
```

### 콜드 스타트 프로토콜

1. **낙관적 초기화**: `α=2, β=1` (약간 양성 prior)
2. **10% 강제 탐색**: 최소 사용 모델에 슬롯 할당
3. **변별적 diff 평가**: 기존 모델 간 Q 분산이 큰 20-50개 diff로 빠른 평가
4. **점진적 신뢰**: 30회 리뷰 전까지 L2 토론에서 가중치 감소

---

## 8. 백엔드 아키텍처 결정

### OpenCode CLI subprocess vs Vercel AI SDK 직접 호출

| 기준 | OpenCode subprocess | Vercel AI SDK |
|------|-------------------|---------------|
| 호출 오버헤드 | ~200-500ms/회 (Go 바이너리 cold start) | 0ms |
| 429 처리 | 프로세스 hang (GitHub issue #4506) | `APICallError` + `isRetryable` |
| 에러 타입 | stderr 텍스트 파싱 | TypeScript 타입 에러 클래스 |
| NIM/OpenRouter/Groq | 전부 지원 | 전부 지원 (공식 provider) |
| 스트리밍 | ndjson 파싱 필요 (불안정) | `streamText()` 깔끔 |
| 병렬 실행 | `Promise.all` + exec | `Promise.all` + generateText |

### 결정: 하이브리드 백엔드

CLI subprocess와 직접 API 호출 **모두 지원**. 유저가 config에서 선택.

```typescript
type Backend = 'opencode' | 'codex' | 'gemini' | 'claude'  // CLI subprocess (기존)
             | 'api';                                        // AI SDK 직접호출 (신규)
```

```typescript
async function executeBackend(input: BackendInput): Promise<string> {
  if (input.backend === 'api') {
    return executeViaAISDK(input);    // 신규: generateText()
  }
  return executeViaCLI(input);         // 기존: child_process.exec()
}
```

### API 백엔드의 provider 매핑

| provider | AI SDK 패키지 | 비고 |
|----------|-------------|------|
| `nvidia-nim` | `@ai-sdk/openai-compatible` | baseURL: integrate.api.nvidia.com |
| `openrouter` | `@openrouter/ai-sdk-provider` | 공식 커뮤니티 provider |
| `groq` | `@ai-sdk/groq` | 공식 1st-party |
| `openai` | `@ai-sdk/openai` | 공식 1st-party |
| `anthropic` | `@ai-sdk/anthropic` | 공식 1st-party |
| `google` | `@ai-sdk/google` | 공식 1st-party |

### Config 예시

```json
// CLI로 돌리기 (기존 방식)
{ "backend": "opencode", "model": "deepseek-r1", "provider": "nvidia-nim" }

// API로 돌리기 (신규)
{ "backend": "api", "model": "deepseek-r1", "provider": "nvidia-nim" }
```

동일 모델이라도 유저가 backend를 선택 가능.

---

## 9. 최종 통합 설계

### 아키텍처

```
L0  Model Intelligence Layer (NEW)
    ├── ProviderRegistry    — NIM, OpenRouter, Groq 통합 관리
    ├── HealthMonitor       — frouter ping 아이디어 + circuit breaker
    ├── FamilyClassifier    — 모델 ID → 패밀리 추출 (regex)
    ├── ModelSelector       — Thompson Sampling + diversity constraint
    └── QualityTracker      — 리뷰 결과 → bandit reward 피드백

L1  Reviewers (기존, 약간 수정)
    ├── backend.ts          — 'api' 백엔드 분기 추가
    └── reviewer.ts         — L0에서 받은 config로 실행

L2  Moderator + Supporters (기존)
    └── 모델 품질 가중치 반영 (optional)

L3  Head Agent (기존)
    └── verdict 후 QualityTracker에 피드백
```

### frouter에서 가져오는 것

```
✅ model-rankings.json (168개 모델 메타데이터)
✅ 핑 프로토콜 아이디어 (chat completion TTFB 측정)
✅ tier 시스템 (S+~C 등급)
✅ backoff/circuit breaker 컨셉

❌ TUI 렌더링
❌ targets.ts (OpenCode config 쓰기)
❌ config.ts (~/.frouter.json 관리)
❌ --best 알고리즘 (자체 Thompson Sampling으로 대체)
```

**핵심 판단**: frouter의 진짜 가치 = 코드가 아니라 **데이터** (model-rankings.json). 핑/랭킹 로직은 ~150줄로 재구현 가능.

### Config 진화 (3단계)

**Phase 1** — Backward compatible:

```json
{
  "reviewers": [
    { "id": "r1", "model": "deepseek-chat", "backend": "opencode", "provider": "nvidia-nim" }
  ],
  "modelRouter": { "enabled": false }
}
```

**Phase 2** — Hybrid (정적 + 동적 혼합):

```json
{
  "reviewers": [
    { "id": "r1", "model": "deepseek-chat", "backend": "opencode", "provider": "nvidia-nim" },
    { "id": "auto-1", "auto": true },
    { "id": "auto-2", "auto": true }
  ],
  "modelRouter": {
    "enabled": true,
    "providers": {
      "groq": { "apiKey": "{env:GROQ_API_KEY}" },
      "nvidia": { "apiKey": "{env:NVIDIA_API_KEY}" }
    },
    "constraints": {
      "familyDiversity": true,
      "includeReasoning": true
    }
  }
}
```

**Phase 3** — Fully declarative:

```json
{
  "reviewers": {
    "count": 5,
    "constraints": {
      "minFamilies": 3,
      "reasoning": { "min": 1, "max": 2 },
      "contextMin": "32k"
    }
  },
  "modelRouter": {
    "providers": { "groq": {}, "nvidia": {}, "openrouter": {} },
    "strategy": "thompson-sampling",
    "circuitBreaker": { "failureThreshold": 3, "cooldownMs": 60000 }
  }
}
```

### Circuit Breaker 설계

```
Closed (정상) → Open (차단) → Half-Open (탐색) → Closed

Closed:
  성공 → 카운터 리셋
  실패 (429/502/503/timeout) → failCount++
  failCount >= 3 → Open

Open:
  모든 요청 즉시 거부 (다른 모델로 라우팅)
  cooldown 60초 후 → Half-Open

Half-Open:
  1개 요청만 허용
  성공 → Closed, 실패 → Open (cooldown 2배)
```

### Provider 전략 (3-tier)

| Tier | Provider | RPM | 용도 |
|------|----------|-----|------|
| Primary | Groq | 30 | 주력. LPU 속도 |
| Secondary | NVIDIA NIM | 40 | Groq에 없는 모델 |
| Tertiary | OpenRouter | 20 | 최후 fallback |

---

## 10. 열린 질문들

1. **frouter 데이터 갱신**: `model-rankings.json`을 npm에서 가져오면 frouter가 업데이트할 때마다 자동 반영. 별도 갱신 파이프라인이 필요한지?

2. **Quality feedback 저장 위치**: `.ca/model-quality.json`을 git에 커밋(팀 공유)할지, `.gitignore`(개인별 누적)할지?

3. **Phase 순서**: Phase 1 (backward compatible)부터 할지, Phase 2 (hybrid)로 바로 갈지?

4. **Groq provider 추가**: frouter는 현재 NIM + OpenRouter만 지원. Groq를 추가 provider로 자체 구현해야 함.

5. **토큰 예산 관리**: 무료 tier의 일일 한도(Groq 1,000 RPD, OpenRouter 50 RPD)를 파이프라인에서 추적/관리하는 로직 필요?

6. **Context window 매칭**: diff 크기에 따라 모델 context window를 고려한 자동 매칭의 우선순위는?

---

## 11. 참고 문헌

### frouter 관련

- [frouter GitHub](https://github.com/jyoung105/frouter)
- [frouter-cli npm](https://www.npmjs.com/package/frouter-cli)

### 모델 라우터 / 게이트웨이

- [LiteLLM Routing Docs](https://docs.litellm.ai/docs/routing)
- [RouteLLM — LMSYS](https://lmsys.org/blog/2024-07-01-routellm/) | [GitHub](https://github.com/lm-sys/RouteLLM)
- [LLMRouter — UIUC](https://github.com/ulab-uiuc/LLMRouter)
- [freerouter](https://github.com/openfreerouter/freerouter)
- [Portkey AI Gateway](https://github.com/Portkey-AI/gateway)
- [Portkey — Retries, Fallbacks, Circuit Breakers](https://portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps/)

### SWE-bench / 코드 리뷰 벤치마크

- [SWE-bench GitHub](https://github.com/SWE-bench/SWE-bench)
- [SWE-Bench+ Enhanced Benchmark — arXiv:2410.06992](https://arxiv.org/abs/2410.06992)
- [SWE-Bench Illusion — arXiv:2506.12286](https://arxiv.org/abs/2506.12286)
- [SWR-Bench (코드 리뷰 전용) — arXiv:2509.01494](https://arxiv.org/abs/2509.01494)
- [Survey of Code Review Benchmarks — arXiv:2602.13377](https://arxiv.org/abs/2602.13377)
- [Evaluating LLMs for Code Review — arXiv:2505.20206](https://arxiv.org/abs/2505.20206)
- [Can LLM feedback enhance review quality? ICLR 2025 — arXiv:2504.09737](https://arxiv.org/abs/2504.09737)

### 모델 다양성 / 앙상블

- [Wisdom and Delusion of LLM Ensembles — arXiv:2510.21513](https://arxiv.org/abs/2510.21513)
- [Diverse LLMs vs. Vulnerabilities — arXiv:2512.12536](https://arxiv.org/abs/2512.12536)
- [Ensembling LLMs for Code Vulnerability — arXiv:2509.12629](https://arxiv.org/abs/2509.12629)
- [Don't Always Pick the Highest-Performing Model (Greedy MI) — arXiv:2602.08003](https://arxiv.org/abs/2602.08003)
- [LLM-TOPLA: Efficient LLM Ensemble — EMNLP 2024 — arXiv:2410.03953](https://arxiv.org/abs/2410.03953)
- [Enhancing LLM Code Generation with Ensembles — arXiv:2503.15838](https://arxiv.org/abs/2503.15838)
- [Big LLM Architecture Comparison — Sebastian Raschka](https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison)

### MAB / 피드백 루프

- [BaRP: Bandit-feedback LLM Routing — arXiv:2510.07429](https://arxiv.org/abs/2510.07429)
- [LLM Bandit with IRT — arXiv:2502.02743](https://arxiv.org/abs/2502.02743)
- [RouteLLM — arXiv:2406.18665](https://arxiv.org/abs/2406.18665)
- [Stanford Thompson Sampling Tutorial](https://web.stanford.edu/~bvr/pubs/TS_Tutorial.pdf)
- [Lilian Weng — Multi-Armed Bandit](https://lilianweng.github.io/posts/2018-01-23-multi-armed-bandit/)
- [IBM Research — KDD 2024 MAB for LLMs](https://research.ibm.com/publications/a-tutorial-on-multi-armed-bandit-applications-for-large-language-models)
- [LMSYS Chatbot Arena — Bradley-Terry Model](https://lmsys.org/blog/2023-12-07-leaderboard/)
- [Too Noisy To Learn (리뷰 품질) — arXiv:2502.02757](https://arxiv.org/abs/2502.02757)
- [Detecting AI Peer Reviews — arXiv:2502.19614](https://arxiv.org/abs/2502.19614)

### Provider / API

- [Groq API Overview](https://console.groq.com/docs/overview)
- [Groq Supported Models](https://console.groq.com/docs/models)
- [Groq Rate Limits](https://console.groq.com/docs/rate-limits)
- [OpenCode + Groq](https://console.groq.com/docs/coding-with-groq/opencode)
- [OpenRouter Free Models](https://openrouter.ai/collections/free-models)
- [OpenRouter Rate Limits](https://openrouter.ai/docs/api/reference/limits)
- [NVIDIA NIM Developer](https://developer.nvidia.com/nim)
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction)
- [AI SDK — Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- [AI SDK — Google Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)
- [AI SDK — Groq Provider](https://ai-sdk.dev/providers/ai-sdk-providers/groq)
- [AI SDK — OpenAI-Compatible Providers](https://ai-sdk.dev/providers/openai-compatible-providers)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)

### Context Window / 토큰

- [Code to Tokens Conversion — 16x Prompt](https://prompt.16x.engineer/blog/code-to-tokens-conversion)
- [Augment Code — Context Engine vs Context Windows](https://www.augmentcode.com/guides/context-engine-vs-context-windows)
- [Agenta — Top Techniques to Manage Context Length](https://agenta.ai/blog/top-6-techniques-to-manage-context-length-in-llms)

### 기타

- [OpenCode CLI subprocess hang — GitHub #4506](https://github.com/sst/opencode/issues/4506)
- [OpenCode CLI error suppression — GitHub #752](https://github.com/sst/opencode/issues/752)
- [Codex CLI AI SDK Provider](https://github.com/ben-vargas/ai-sdk-provider-codex-cli)
- [Node.js spawn performance — val.town](https://blog.val.town/blog/node-spawn-performance/)
- [Base Models Know How to Reason — arXiv:2510.07364](https://arxiv.org/abs/2510.07364)
