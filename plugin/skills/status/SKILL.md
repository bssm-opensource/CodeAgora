---
name: status
description: Show recent review sessions and results
prefix: agora
user_invocable: true
---

# CodeAgora Status

최근 리뷰 세션을 조회합니다.

## Usage

- `/agora status` — 최근 5개 세션 요약
- `/agora status <session-id>` — 특정 세션 상세 결과 (예: `2026-03-03/004`)

## Workflow

### 최근 세션 목록 (기본)

### Step 1: 세션 디렉토리 스캔

`.ca/sessions/` 디렉토리를 스캔합니다.
각 세션의 `metadata.json`을 읽어 요약합니다.

### Step 2: 목록 출력

```
## Recent Review Sessions

| Date | ID | Status | Duration | Diff |
|------|-----|--------|----------|------|
| 2026-03-03 | 004 | completed | 76.6s | codeagora-self-review.diff |
| 2026-03-03 | 003 | completed | 45.2s | feature.diff |
| ...

총 {N}개 세션 | 마지막 리뷰: {date}
```

### 특정 세션 상세 (session-id 지정)

### Step 1: 세션 파일 읽기

인자 형식: `{date}/{id}` (예: `2026-03-03/004`)

다음 파일을 읽습니다:
- `.ca/sessions/{date}/{id}/metadata.json`
- `.ca/sessions/{date}/{id}/result.md`
- `.ca/sessions/{date}/{id}/report.md`
- `.ca/sessions/{date}/{id}/suggestions.md`

### Step 2: 상세 출력

```
## Session {date}/{id}

**Status:** {status}
**Diff:** {diffPath}
**Duration:** {duration}s

### Head Verdict
{result.md 내용}

### Moderator Report
{report.md 내용}

### Suggestions
{suggestions.md 내용}
```

## Error Handling

- 세션 디렉토리가 없으면: "아직 리뷰를 실행하지 않았습니다. `/agora review`로 시작하세요."
- 지정한 세션이 없으면: "세션을 찾을 수 없습니다. `/agora status`로 목록을 확인하세요."

## MCP Tool 사용

이 스킬의 기능은 MCP tool로도 사용 가능합니다:
- `agora_list_sessions` — 세션 목록
- `agora_get_result` — 세션 상세
