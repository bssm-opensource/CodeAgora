---
name: review
description: Run multi-agent code review on current changes or a specific diff
prefix: agora
user_invocable: true
---

# CodeAgora Review

Multi-agent 코드 리뷰 파이프라인을 실행합니다. 5개 LLM이 병렬로 리뷰하고, 토론을 거쳐 최종 판결을 내립니다.

## Usage

- `/agora review` — 현재 staged changes를 리뷰
- `/agora review <path>` — 특정 diff 파일을 리뷰

## Workflow

### Step 1: Diff 확보

인자가 없으면:
1. `git diff --staged` 실행
2. staged changes가 없으면 `git diff HEAD~1` 실행
3. 그래도 없으면 사용자에게 diff 경로를 요청

인자가 있으면:
- 해당 경로의 파일을 diff로 사용

### Step 2: Diff 저장

diff 내용을 임시 파일에 저장:
```bash
git diff --staged > /tmp/codeagora-review-$(date +%s).diff
```

### Step 3: 리뷰 실행

core CLI를 실행:
```bash
node {PROJECT_ROOT}/src-v3/dist/cli/index.js review <diff-path>
```

이 명령은 다음 파이프라인을 실행합니다:
- L0: 모델 선택 (Thompson Sampling)
- L1: 5개 리뷰어 병렬 리뷰
- L2: 모더레이터 토론 (최대 3라운드)
- L3: 최종 판결

### Step 4: 결과 출력

실행 완료 후 `.ca/sessions/` 디렉토리에서 최신 세션을 찾아 결과를 읽습니다.

결과 파일 위치: `.ca/sessions/{date}/{sessionId}/`
- `result.md` — 최종 판결 (ACCEPT / REJECT / NEEDS_HUMAN)
- `report.md` — 모더레이터 리포트 (토론 요약)
- `suggestions.md` — SUGGESTION 수준 이슈 모음

### Step 5: 포맷팅

결과를 다음 형식으로 사용자에게 표시:

```
## CodeAgora Review Result

**Verdict:** ACCEPT / REJECT / NEEDS_HUMAN

### Critical Issues
- (HARSHLY_CRITICAL / CRITICAL 이슈 목록)

### Warnings
- (WARNING 이슈 목록)

### Suggestions
- (SUGGESTION 이슈 목록)

### Discussion Summary
- (토론이 발생한 경우 요약)

**Session:** {date}/{sessionId} | **Duration:** Xs
```

## Error Handling

- diff가 비어있으면: "리뷰할 변경사항이 없습니다" 출력
- core CLI가 실패하면: stderr 내용을 사용자에게 표시
- config 파일이 없으면: "`.ca/config.json`을 먼저 설정하세요" 안내

## Notes

- 리뷰에는 외부 LLM API 호출이 포함되므로 시간이 걸릴 수 있습니다 (1~3분)
- `--dry-run` 옵션으로 실제 API 호출 없이 설정만 확인 가능
- 리뷰어 설정은 `/agora config`로 확인
