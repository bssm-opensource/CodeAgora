# 7. CodeAgora v3 — Next Steps Roadmap

> 작성일: 2026-03-09
> 기반: 4-agent 병렬 분석 (analyst, designer, test-engineer, architect)
> 현재 상태: Phase 1~4 구현 완료, L0~L3 전 레이어 코드 존재

---

## 핵심 발견: 3대 구조적 문제

### 1. Orchestrator가 L0를 호출하지 않음 (가장 심각)
- `pipeline/orchestrator.ts`가 `getEnabledReviewers(config)`로 정적 리뷰어만 가져옴
- `l0/index.ts`의 `resolveReviewers()`가 완전 구현되어 있지만 미호출
- **결과**: `auto: true` 리뷰어, `modelRouter`, Phase 4 선언적 config 모두 실제로 작동하지 않음
- `normalizeConfig()`도 미호출 → 선언적 config가 파싱은 되지만 expand 안 됨

### 2. CLI 자체가 없음
- `commander`, `chalk`, `@octokit/rest`가 package.json에 있지만 **모두 미사용**
- `run-test.ts`가 유일한 진입점 (수동 테스트용)
- `package.json`에 `bin` 필드 없음 → `npx codeagora` 불가
- `--help`, `--version`, `--config`, `--dry-run` 모두 없음

### 3. Dead Code / Placeholder 다수
- `l2/objection.ts`: 이의제기 프로토콜 완전 구현됨, moderator에서 미호출
- `l3/grouping.ts`: "simplified version" 주석 — 디렉토리 기반만
- `l3/verdict.ts`: "In production" 주석 — 규칙 기반만, LLM 미호출
- `HeadVerdict.codeChanges`: 타입 존재하나 절대 채워지지 않음

---

## Tier 1: 즉시 수정 (구조적 결함)

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| T1-1 | **Orchestrator ↔ L0 연결** | Med | `resolveReviewers()` 호출 + `normalizeConfig()` 적용. auto reviewer + 선언적 config가 실제로 작동하도록 |
| T1-2 | **objection.ts → moderator 통합** | Low | `checkForObjections()`를 consensus 확인 단계에 삽입 |
| T1-3 | **Promise.allSettled 전환** | Low | `moderator.ts:248`의 supporter 실행을 `allSettled`로. 1명 실패해도 라운드 진행 |

## Tier 2: CLI 기반 구축 (사용성 해제)

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| T2-1 | **commander CLI 엔트리포인트** | Low | `codeagora review <diff>`, `codeagora init`, `codeagora stats` 서브커맨드 |
| T2-2 | **package.json bin 필드** | Low | `"bin": { "codeagora": "./dist/cli.js" }` |
| T2-3 | **진행 상황 출력 (chalk)** | Low | L1 리뷰어 완료 카운터, L2 discussion 진행, L3 verdict 박스 |
| T2-4 | **최종 결과 터미널 요약** | Low | severity별 카운트, top N 이슈, ACCEPT/REJECT 색상 박스 |
| T2-5 | **exit code 연동** | Low | REJECT → `process.exit(1)`, ACCEPT → `process.exit(0)` |
| T2-6 | **codeagora init** | Low | 인터랙티브 또는 template config 생성 |

## Tier 3: 안정성 + 테스트 보강

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| T3-1 | **L1 concurrency limiter** | Low | `reviewer.ts`의 `Promise.all` → `p-limit(3)` 패턴. 429 방지 |
| T3-2 | **Pipeline checkpoint/resume** | Med | L1 완료 후 checkpoint → L2 실패 시 L1 결과 재사용 |
| T3-3 | **Pipeline timeout** | Low | 전체 파이프라인 타임아웃 (stuck moderator 방지) |
| T3-4 | **Session ID 원자성** | Low | `getNextSessionId` race condition 수정 (UUID 또는 lock) |
| T3-5 | **History pruning** | Low | `BanditStore` 무한 누적 방지 (`maxHistory` 설정) |

### 테스트 갭 (커버리지 ~55% → 목표 80%)

| 파일 | 리스크 | 누락 케이스 |
|------|--------|------------|
| `l3/verdict.ts` | High | REJECT/NEEDS_HUMAN/ACCEPT 3분기, scanUnconfirmedQueue |
| `l3/grouping.ts` | High | 빈 diff, 단일 파일, 다중 디렉토리, 대형 파일 |
| `l1/backend.ts` | High | CLI 커맨드 빌더 4개, timeout 처리, API 분기 |
| `l0/index.ts` | High | resolveReviewers 전체 경로, auto=true + enabled=false |
| `l2/moderator.ts` | Med | runDiscussion, HARSHLY_CRITICAL escalate, parseStance 엣지 |
| `l2/objection.ts` | Med | import만 있고 테스트 0개 |
| `pipeline/orchestrator.ts` | High | forfeit early exit, quality feedback persistence |

## Tier 4: 기능 확장

| # | 항목 | 난이도 | 가치 | 설명 |
|---|------|--------|------|------|
| T4-1 | **Ollama 로컬 모델** | Low | High | `@ai-sdk/openai-compatible`로 `localhost:11434` 연결. API 키 불필요 |
| T4-2 | **GitHub PR 코멘트** | Med | High | `@octokit/rest` 활용 (이미 설치됨). verdict → PR review comment |
| T4-3 | **SARIF 출력** | Med | High | EvidenceDocument → SARIF Result 매핑. GitHub Code Scanning 연동 |
| T4-4 | **GitHub Action** | Med | High | `action.yml` + REJECT → CI 차단 |
| T4-5 | **리뷰 캐싱** | Med | High | `hash(diff+model+prompt)` → `.ca/cache/` |
| T4-6 | **Quality Report (codeagora stats)** | Low | High | model-quality.json 읽어서 모델별 Q score, reward rate 출력 |
| T4-7 | **--format json/sarif** | Med | Med | CI 파이프라인용 structured output |
| T4-8 | **.reviewignore** | Low | Med | PRD에 명시, v1 테스트 존재, v3 미구현 |
| T4-9 | **OpenAI/Anthropic/Google provider** | Low | Med | provider-registry 패턴 동일, 패키지 추가만 |
| T4-10 | **Cost-aware model selection** | Med | Med | model-rankings.json의 price 데이터 활용 |

## Tier 5: 장기 로드맵

| # | 항목 | 난이도 | 설명 |
|---|------|--------|------|
| T5-1 | **VS Code Extension** | High | 파이프라인 래핑, SARIF 연동 |
| T5-2 | **Web Dashboard** | High | 세션 히스토리, 모델 성능 차트 |
| T5-3 | **Bradley-Terry 글로벌 랭킹** | Med | 50+ 리뷰 데이터 축적 후 |
| T5-4 | **Incremental Review** | High | 수정 후 변경분만 재리뷰 |
| T5-5 | **Streaming LLM 응답** | Med | `generateText` → `streamText` 전환 |
| T5-6 | **Discord 실시간 시각화** | High | PRD Phase 3에 예약됨 |
| T5-7 | **프롬프트 파일 시스템** | Low | reviewer.ts 하드코딩 → `prompts/*.md` 분리 |
| T5-8 | **Context window 기반 diff 분할** | Med | 모델별 context 데이터로 토큰 수 맞춤 |

---

## 추천 실행 순서

```
Phase 5A (기반 수정, ~1일):
  T1-1 Orchestrator ↔ L0 연결
  T1-2 objection 통합
  T1-3 Promise.allSettled
  T3-1 concurrency limiter

Phase 5B (CLI, ~1일):
  T2-1~T2-6 전체 CLI 구축

Phase 5C (안정성, ~1일):
  T3-2~T3-5 checkpoint, timeout, session, pruning
  테스트 갭 6개 모듈

Phase 5D (외부 연동, ~2일):
  T4-1 Ollama
  T4-2 GitHub PR 코멘트
  T4-3 SARIF
  T4-4 GitHub Action
  T4-6 Quality Report
```

---

## 미사용 의존성 정리

| 패키지 | 상태 | 조치 |
|--------|------|------|
| `commander` | tools/에서만 사용, src 미사용 | T2-1에서 활용 |
| `chalk` | 어디서도 미사용 | T2-3에서 활용 |
| `@octokit/rest` | 어디서도 미사용 | T4-2에서 활용 |

---

*Generated by 4-agent parallel analysis (analyst, designer, test-engineer, architect), 2026-03-09*
