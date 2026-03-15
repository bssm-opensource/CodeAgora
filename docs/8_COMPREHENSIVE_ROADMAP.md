# 8. CodeAgora v3 — Comprehensive Feature Roadmap

> 작성일: 2026-03-09
> 기반: 10-iteration Ralph deep analysis (9 parallel agents + independent V1 gap analysis + PRD mapping)
> 현재 상태: Phase 1~4 구현 완료, L0~L3 전 레이어 코드 존재

---

## 분석 방법론

이 로드맵은 3가지 독립 분석의 종합 결과:

1. **4-agent 병렬 분석** (iteration 3): architect, analyst, designer, test-engineer
2. **9-agent 딥다이브** (iterations 4-7): orchestrator 배선, CLI 설계, 테스트 전략, 경쟁 분석, GitHub 통합, 성능/캐싱, 데이터 모델, 플러그인 시스템, 프롬프트 엔지니어링
3. **V1→V3 이전 격차 분석** (iteration 8): v1 테스트에서 발견된 구현 완료 후 v3에 미이전된 기능들

---

## I. 구조적 결함 (즉시 수정 필수)

### 1. Orchestrator ↔ L0 미연결 [CRITICAL]
- `orchestrator.ts`가 `getEnabledReviewers(config)`로 정적 리뷰어만 사용
- `resolveReviewers()`, `normalizeConfig()` 모두 구현 완료 상태지만 미호출
- **영향**: auto reviewer, modelRouter, 선언적 config, Thompson Sampling 전부 미작동
- **수정**: `normalizeConfig()` → `resolveReviewers()` → `executeReviewers()` 순서로 연결

### 2. Dead Code 활성화
- `l2/objection.ts`: 이의제기 프로토콜 구현 완료, moderator에서 미호출
- `l3/verdict.ts`: 규칙 기반만 (LLM 미호출), `HeadVerdict.codeChanges` 미활용
- `l3/grouping.ts`: 디렉토리 기반 스텁만

### 3. Graceful Degradation 부재
- `moderator.ts:248` supporter `Promise.all` → 1명 실패 시 전체 라운드 실패
- `reviewer.ts:88` 무제한 `Promise.all` → 429 storm

---

## II. PRD 약속 vs 현재 구현 격차

| PRD 약속 | 현재 상태 | 우선순위 |
|----------|-----------|----------|
| GitHub PR inline comment 자동 게시 | ❌ 미구현 | **High** |
| GitHub Action 통합 | ❌ 미구현 | **High** |
| Discord 실시간 토론 시각화 | ❌ 미구현 | Med |
| CLI 엔트리포인트 (`npx codeagora`) | ❌ 미구현 | **High** |
| 리뷰 대시보드 | ❌ 미구현 | Low |
| PR당 비용 추적 ($0.07 이하 목표) | ❌ 미구현 | Med |
| 리뷰 정확도 측정 (70% 목표) | ❌ 미구현 | Med |

---

## III. V1→V3 이전 격차 (V1 테스트로 확인)

V1에는 구현+테스트되어 있지만 V3에 이전되지 않은 기능들:

| V1 기능 | V1 테스트 위치 | V3 상태 | 난이도 |
|---------|---------------|---------|--------|
| `.reviewignore` 글로브 필터링 | `tests/diff/filter.test.ts` (14 tests) | 미구현 | Low |
| GitHub PR 코멘트 + URL 파싱 | `tests/github/client.test.ts` (8 tests) | 미구현 | Med |
| Discord 임베드 (리뷰, 토론, 통계) | `tests/discord/formatter.test.ts` (10 tests) | 미구현 | Med |
| 통계 생성기 + 리뷰어 사용률 | `tests/stats/generator.test.ts` (6 tests) | 미구현 | Low |
| CLI init + 기본 config 생성 | `tests/cli/index.test.ts` (20 tests) | 미구현 | Low |
| 리뷰 히스토리 저장소 | `tests/storage/history.test.ts` (8 tests) | 미구현 | Low |
| Health Check (사전 점검) | `tests/cli/health.test.ts` (3 tests) | 미구현 | Low |

### V1 패턴 중 재사용 가치 높은 것:
- **ReviewHistoryStorage**: atomic write (temp→rename), write queue, max 1000 rotation, `getByFile()`, `getLast(n)`, corrupted file graceful handling
- **GitHubClient**: `parseGitHubRepo()` — URL형식(`github.com/owner/repo/pull/123`) + 단축형식(`owner/repo#123`) 지원
- **Discord formatter**: severity별 색상 코딩 (🔴🟠🟡💡), Discord embed 1024자 제한 자동 truncation

---

## IV. 기능 로드맵 (통합 정리)

### Phase 5A: 구조 수정 (~0.5일)

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| 5A-1 | Orchestrator ↔ L0 연결 | Med | `normalizeConfig()` + `resolveReviewers()` 호출 배선 |
| 5A-2 | objection.ts → moderator 통합 | Low | `checkForObjections()` consensus 단계에 삽입 |
| 5A-3 | Promise.allSettled 전환 | Low | supporter 실행 graceful degradation |
| 5A-4 | L1 concurrency limiter | Low | `p-limit(3)` 패턴, per-provider rate limit |

### Phase 5B: CLI 구축 (~1일)

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| 5B-1 | commander CLI 엔트리포인트 | Low | `codeagora review <diff>`, `init`, `stats`, `ping` |
| 5B-2 | package.json bin 필드 | Low | `"bin": { "codeagora": "./dist/cli.js" }` |
| 5B-3 | 진행 상황 출력 (chalk) | Low | L1 완료 카운터, L2 토론 진행, L3 verdict 박스 |
| 5B-4 | 최종 결과 터미널 요약 | Low | severity별 카운트, top N 이슈, ACCEPT/REJECT 색상 |
| 5B-5 | exit code 연동 | Low | REJECT → exit(1), ACCEPT → exit(0), NEEDS_HUMAN → exit(2) |
| 5B-6 | codeagora init | Low | 인터랙티브 config 생성 (V1 `generateDefaultConfig` 패턴 활용) |
| 5B-7 | stdin diff 지원 | Low | `git diff \| codeagora review -` |
| 5B-8 | config 자동 탐색 | Low | cwd → parent → ~/.ca/ → error |
| 5B-9 | health check | Low | V1 패턴: enabled reviewers >= min_reviewers 사전 검증 |

### Phase 5C: 핵심 기능 복원 (~1일)

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| 5C-1 | .reviewignore | Low | V1 `filterIgnoredFiles` 패턴 포팅. 글로브, 주석, 부정 패턴 |
| 5C-2 | 리뷰 히스토리 저장소 | Low | V1 `ReviewHistoryStorage` 패턴. atomic write, rotation |
| 5C-3 | codeagora stats | Low | 히스토리 + model-quality.json 읽어 통합 리포트 |
| 5C-4 | History pruning | Low | BanditStore + ReviewHistory maxHistory 설정 |
| 5C-5 | Session ID 원자성 | Low | UUID 기반 또는 lock file |

### Phase 5D: 테스트 보강 (~1일, 커버리지 55%→80%)

**High 우선순위 (0 tests → 기본 커버리지):**

| 테스트 파일 | 대상 모듈 | 예상 테스트 수 |
|------------|-----------|-------------|
| `l0-index.test.ts` | `resolveReviewers()` 전체 경로 | ~10 |
| `l1-backend.test.ts` | CLI 커맨드 빌더 4개 + timeout | ~12 |
| `l3-grouping.test.ts` | 빈 diff, 단일 파일, 다중 디렉토리 | ~8 |
| `l3-verdict.test.ts` | REJECT/NEEDS_HUMAN/ACCEPT 3분기 | ~8 |
| `l2-objection.test.ts` | checkForObjections 전체 경로 | ~6 |

**Medium 우선순위 (부분 커버리지 보강):**

| 테스트 파일 | 누락 케이스 | 예상 테스트 수 |
|------------|-----------|-------------|
| `l2-moderator.test.ts` 확장 | runDiscussion, HARSHLY_CRITICAL escalate | ~8 |
| `l1-parser.test.ts` 확장 | HARSHLY_CRITICAL, fuzzy fallback | ~6 |
| `l2-threshold.test.ts` 확장 | 혼합 severity, 빈 입력 | ~4 |
| `orchestrator-integration.test.ts` | forfeit early exit, L0 reward persistence | ~6 |

**예상 총 추가 테스트: ~68개 (현재 151 → 목표 ~220)**

### Phase 5E: GitHub 통합 (~2일)

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| 5E-1 | GitHub PR 코멘트 | Med | V1 `GitHubClient` 패턴 + EvidenceDocument → inline comment 매핑 |
| 5E-2 | PR URL/단축형 파서 | Low | V1 `parseGitHubRepo()` 포팅 (URL + `owner/repo#123`) |
| 5E-3 | SARIF 출력 | Med | EvidenceDocument → SARIF Result. GitHub Code Scanning 연동 |
| 5E-4 | GitHub Action | Med | `action.yml` + REJECT → CI fail |
| 5E-5 | --format json/sarif | Med | CI 파이프라인용 structured output |
| 5E-6 | 코멘트 중복 방지 | Low | re-run 시 기존 코멘트 업데이트 (not 재게시) |

### Phase 5F: 모델 확장 (~0.5일)

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| 5F-1 | Ollama 로컬 모델 | Low | `@ai-sdk/openai-compatible` → `localhost:11434`. 무료, 프라이버시 |
| 5F-2 | OpenAI/Anthropic/Google provider | Low | `provider-registry.ts` 패턴 동일, 패키지만 추가 |
| 5F-3 | Provider auto-discovery | Low | 환경변수에서 API 키 스캔 → 자동 등록 |
| 5F-4 | Cost tracking per review | Med | model-rankings.json price 데이터 × 토큰 수 |

### Phase 5G: 성능 & 안정성 (~1일)

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| 5G-1 | 리뷰 캐싱 | Med | `hash(diff+model+prompt)` → `.ca/cache/`, `--no-cache` 플래그 |
| 5G-2 | Pipeline checkpoint/resume | Med | 레이어별 checkpoint → `--resume {session-id}` |
| 5G-3 | Pipeline timeout | Low | 전체 타임아웃 (stuck moderator 방지) |
| 5G-4 | Health monitor persistence | Low | circuit breaker 상태 `.ca/health-state.json` 저장 |
| 5G-5 | Structured error classification | Low | regex → HTTP status code 기반 retry 판단 |

### Phase 5H: 프롬프트 & 리뷰 품질 (~1일)

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| 5H-1 | 프롬프트 파일 시스템 | Low | 하드코딩 → `prompts/*.md` with `{{VARIABLE}}` 보간 |
| 5H-2 | 리뷰 포커스 템플릿 | Med | security, performance, api-design, testing 프리셋 |
| 5H-3 | 언어 감지 → 프롬프트 조정 | Low | diff 파일 확장자 → 언어별 리뷰 포인트 추가 |
| 5H-4 | Structured output (generateObject) | Med | regex 파싱 → Zod 스키마 + generateObject 전환 |
| 5H-5 | LLM Head Verdict (하이브리드) | Med | 규칙 기반 fast path + 경계 케이스 LLM 판단 |

### Phase 5I: 장기 로드맵

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| 5I-1 | Discord 실시간 시각화 | High | PRD Phase 3 약속. V1 formatter 패턴 활용 |
| 5I-2 | VS Code Extension | High | SARIF 연동, 인라인 이슈 표시 |
| 5I-3 | Web Dashboard | High | 세션 히스토리, 모델 성능 차트 |
| 5I-4 | Incremental Review | High | 수정 후 변경분만 재리뷰 |
| 5I-5 | Streaming LLM | Med | `generateText` → `streamText` 전환 |
| 5I-6 | Bradley-Terry 글로벌 랭킹 | Med | 50+ 리뷰 데이터 축적 후 |
| 5I-7 | Plugin/Extension 시스템 | Med | 커스텀 리뷰어, 출력 포맷, provider 플러그인 |
| 5I-8 | Project-level learning | Med | 프로젝트 패턴 학습 → 프롬프트 자동 조정 |
| 5I-9 | Context window 기반 diff 분할 | Med | 모델별 context 데이터로 토큰 수 맞춤 |
| 5I-10 | Cost-aware model selection | Med | Thompson Sampling에 비용 가중치 추가 |

---

## V. 경쟁 우위 분석

### CodeAgora만의 차별점

| 차별점 | 경쟁사 현황 | CodeAgora 강점 |
|--------|------------|---------------|
| **다중 모델 토론** | CodeRabbit/Copilot: 단일 모델 | 여러 LLM이 독립 리뷰 후 토론. 더 높은 탐지율 |
| **Thompson Sampling** | 없음 | 자동으로 최고 성능 모델 학습. 시간이 갈수록 개선 |
| **품질 피드백 루프** | 없음 | 3-signal composite Q로 자기 개선 |
| **로컬 모델 (Ollama)** | SaaS only | 프라이버시 보장, API 키 불필요 |
| **오픈소스 CLI** | 대부분 SaaS | 자체 호스팅, 커스터마이징 가능 |

### 제안: MOAT 기능 (경쟁사가 따라하기 어려운 것)

1. **Cross-Model Debate Consensus**: 토론 과정 자체가 리뷰 품질 메타데이터
2. **Adaptive Model Roster**: Thompson Sampling으로 프로젝트별 최적 모델 조합 자동 발견
3. **Review Memory**: 프로젝트별 리뷰 히스토리 → 반복 이슈 자동 감지
4. **Cost-Quality Pareto Frontier**: 예산 내 최적 모델 조합 자동 탐색
5. **Debate Provenance**: 각 이슈가 "왜" 중요한지 토론 근거 함께 제공 (단일 모델은 불가)

---

## VI. 추천 실행 순서

```
Sprint 1 (구조 수정 + CLI, ~2일):
  5A-1~4  Orchestrator 배선, objection 통합, allSettled, concurrency
  5B-1~9  CLI 전체 구축
  5C-1    .reviewignore 포팅

Sprint 2 (핵심 기능 + 테스트, ~2일):
  5C-2~5  리뷰 히스토리, stats, pruning, session ID
  5D 전체  테스트 커버리지 55% → 80%

Sprint 3 (GitHub 통합, ~2일):
  5E-1~6  PR 코멘트, SARIF, GitHub Action, --format
  5F-1~3  Ollama, 추가 provider, auto-discovery

Sprint 4 (성능 + 품질, ~2일):
  5G-1~5  캐싱, checkpoint, timeout
  5H-1~3  프롬프트 파일 시스템, 템플릿, 언어 감지

Sprint 5 (고급 기능, ~3일):
  5H-4~5  Structured output, LLM Head Verdict
  5F-4    Cost tracking
  5I 선별  Discord, Plugin 시스템
```

---

## VII. 미사용 의존성 현황

| 패키지 | 현재 상태 | 활용 시점 |
|--------|----------|----------|
| `commander` | tools/에서만 사용 | Sprint 1 (5B-1) |
| `chalk` | 미사용 | Sprint 1 (5B-3) |
| `@octokit/rest` | 미사용 | Sprint 3 (5E-1) |
| `p-limit` | 미설치 | Sprint 1 (5A-4) — 추가 필요 |

---

## VIII. 성공 지표 (PRD 기준)

| 지표 | PRD 목표 | 현재 | 달성 방법 |
|------|---------|------|----------|
| 리뷰 정확도 | 인간 대비 70% | 측정 불가 | Review history + human feedback 루프 |
| 응답 시간 | PR당 60초 이내 | 측정 불가 | CLI에 duration 출력 추가 |
| 비용 | PR당 $0.07 이하 | 추적 안 됨 | Cost tracking (5F-4) |
| 파싱 성공률 | 90% 이상 | 파서 존재, 측정 안 됨 | Stats에 파싱 성공률 추가 |

---

## IX. 에이전트 딥다이브에서 발견된 버그 & 결정 사항

### 발견된 버그 (9-agent 분석)

| # | 버그 | 위치 | 심각도 |
|---|------|------|--------|
| B1 | **BanditStore 이중 인스턴스화** — orchestrator가 `new BanditStore()` 생성, L0도 자체 생성. 동일 파일 동시 읽기/쓰기로 데이터 유실 가능 | `orchestrator.ts:183` + `l0/index.ts:38` | High |
| B2 | **빈 diff → division-by-zero** — `groupDiff("")` → 빈 배열 → `fileGroups[i % 0]` 크래시 | `orchestrator.ts` | High |
| B3 | **선언적 config 런타임 크래시** — `{ count: 5 }` 객체에 `.filter()` 호출 → TypeError | `config/loader.ts:47` | High |
| B4 | **Moderator forced-decision에 서포터 reasoning 누락** — 스탠스 라벨만 전달, 실제 논증 텍스트 미포함 | `moderator.ts:341-352` | Med |
| B5 | **Korean section headers 단일 장애점** — 파서가 `### 문제`, `### 근거` 정확 매칭. 모델이 영어로 출력 시 이슈 무시됨 | `parser.ts:57` | Med |
| B6 | **Logger stdout 오염** — `--format json` 사용 시 console.log와 JSON 출력이 stdout에서 혼합 | `logger.ts:62` | Med |
| B7 | **E2E 테스트 CI 위험** — `.ca/` 디렉토리를 CWD에 생성. 동시 실행 시 충돌 | `e2e-pipeline.test.ts` | Low |

### 필수 결정 사항 (구현 전 확정 필요)

| # | 결정 | 선택지 | 권장 |
|---|------|--------|------|
| D1 | **CLI 위치** | root `src/cli/` vs `src/cli/` | `src/cli/` (v3 모듈과 같은 빌드 파이프라인) |
| D2 | **독립 실행 vs Claude Code 의존** | V3 설계문서 "Claude Code only" vs 실제 구현 | 독립 실행 (L3은 이미 규칙 기반) |
| D3 | **JSON vs SQLite** (데이터 저장) | JSON 파일 vs SQLite (native dep) | JSON (v1 호환, zero dep, SQLite는 추후) |
| D4 | **diffId 정의** | sessionId vs SHA-256(diff content) | SHA-256 (캐싱, 중복 제거 전제조건) |
| D5 | **v2 prompts/ 디렉토리** | 아카이브 vs 삭제 vs v3 네임스페이스 | `prompts/v2/`로 이동 + `prompts/v3/` 신규 |
| D6 | **BackendInput 인터페이스** | 단일 prompt vs system+user 분리 | system+user 분리 (프롬프트 시스템 전제조건) |
| D7 | **바이너리 이름** | `codeagora` vs `ca` vs 둘 다 | `codeagora` (명확성) + `ca` (편의 alias) |
| D8 | **PipelineResult 확장** | 타입 확장 vs CLI가 세션 파일 읽기 | 타입 확장 (verdict, issueCounts, duration 추가) |

### 에이전트별 핵심 인사이트

**Architect (Orchestrator 배선):**
- `resolveReviewers()`가 이미 `modelRouter.enabled=false` 폴백 내장 → 안전한 drop-in
- `getBanditStore()` 사용으로 이중 인스턴스 방지

**Analyst (CLI 설계):**
- stdin TTY 감지 필수 (`process.stdin.isTTY`)
- `--dry-run` 의미 확정 필요 (config 검증? diff 파싱 미리보기? 비용 추정?)
- `ping`, `export` 커맨드는 Phase 2로 미루기 권장

**Test Engineer:**
- 73개 추가 테스트로 80% 커버리지 달성 가능
- `parseStance`, `checkConsensus` 등 미export 함수 → export 후 단위 테스트 권장
- `slice5.test.ts`에 dead import 존재 (`checkForObjections` import하고 미사용)

**Analyst (경쟁 분석):**
- CodeAgora 5대 MOAT: 적대적 합의, 모델 자연선택, 증거 감사 추적, 심각도 에스컬레이션, 이종 앙상블
- 포지셔닝: "신뢰성, 비용, 프라이버시, 감사 가능성" vs CodeRabbit의 "편의성"
- **토론 과정이 사용자에게 보이지 않음** — 킬러 피처의 가시성 부재

**Designer (GitHub 통합):**
- `docs/5_GITHUB_INTEGRATION.md` 전체 설계 문서 작성됨
- 핵심 난제: 절대 라인 번호 → GitHub diff hunk position 변환
- `createReview` 단일 호출로 모든 코멘트 게시 (N개 개별 호출 대신)
- `NEEDS_HUMAN` → GitHub pending status (failure 아님)

**Architect (성능):**
- ConcurrencyLimiter: global + per-provider 2계층, ~100 lines
- 캐시 키: `SHA-256(diff + modelId + provider + promptTemplateHash)` → 프롬프트 변경 시 자동 무효화
- Diff 청킹: directory → file → hunk 3단계, 4chars/token 추정

**Analyst (데이터 모델):**
- `ReviewOutput`에 `durationMs` + `tokenUsage` 필드 추가 필수 (비용 추적 전제)
- Vercel AI SDK가 토큰 데이터 반환하지만 현재 버려지고 있음
- CLI 백엔드는 토큰 사용량 보고 불가 → API 백엔드에서만 수집

**Architect (플러그인):**
- Pipeline Hooks = 가장 낮은 노력 (~30분), 가장 높은 활용도
- Provider Plugins = `PROVIDER_FACTORIES` 열기 → `registerProvider()` + dynamic import
- 모든 플러그인은 `dynamic import()` → 런타임 에러만 가능 (적절한 trade-off)

**Analyst (프롬프트):**
- v2 `prompts/`와 v3 severity 체계 충돌 (critical/major vs HARSHLY_CRITICAL/CRITICAL)
- `generateObject` (structured output)는 `api` 백엔드에서만 가능 — regex 파서 영구 유지 필수
- 영어 헤더 폴백 (`### Problem` alongside `### 문제`) 파서 확장 필요

---

## X. 최종 우선순위 매트릭스 (Top 15)

| 순위 | 항목 | 난이도 | 가치 | 근거 |
|------|------|--------|------|------|
| 1 | **B3 수정: normalizeConfig() 호출** | Low | Critical | 선언적 config 런타임 크래시 방지 |
| 2 | **5A-1: Orchestrator ↔ L0 연결** | Med | Critical | L0 전체 (Thompson Sampling, 건강 모니터링, 다양성) 활성화 |
| 3 | **B1 수정: getBanditStore() 사용** | Low | High | 데이터 유실 방지 |
| 4 | **B2 수정: 빈 diff 가드** | Low | High | 크래시 방지 |
| 5 | **5A-3: Promise.allSettled** | Low | High | 서포터 1명 실패 시 전체 라운드 보호 |
| 6 | **5A-4: Concurrency limiter** | Low | High | 429 storm 방지 |
| 7 | **5B-1~9: CLI 전체** | Med | Critical | 사용 불가 → 사용 가능 전환 |
| 8 | **5A-2: objection 통합** | Low | High | MOAT 1 (적대적 합의) 완성 |
| 9 | **D8: PipelineResult 확장** | Low | High | CLI 출력, stats, 비용 추적 전제조건 |
| 10 | **5C-1: .reviewignore** | Low | Med | V1 코드 재사용 가능 |
| 11 | **5D: 테스트 73개 추가** | Med | High | 55% → 80% 커버리지 |
| 12 | **B5 수정: 영어 헤더 폴백** | Low | Med | 크로스 모델 안정성 |
| 13 | **5E-1~2: GitHub PR 코멘트** | Med | High | PRD 핵심 약속 이행 |
| 14 | **5F-1: Ollama** | Low | High | 무료+프라이버시 사용자 유치 |
| 15 | **5H-1: 프롬프트 파일 시스템** | Low | Med | 비개발자 프롬프트 편집 가능 |

---

*Generated by 10-iteration Ralph deep analysis, 2026-03-09*
*Sources: 4-agent initial analysis, 9 deep-dive specialist agents (architect×3, analyst×4, designer×1, test-engineer×1), V1→V3 gap analysis, PRD mapping*
