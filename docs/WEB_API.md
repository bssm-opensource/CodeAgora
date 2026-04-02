# Web Dashboard API Reference

CodeAgora 웹 대시보드의 REST API 레퍼런스입니다.

**기본 URL:** `http://localhost:6274/api`
**인증:** `Authorization: Bearer <token>` (토큰은 `CODEAGORA_DASHBOARD_TOKEN` 환경변수 또는 서버 시작 시 자동 생성)

## Health

### `GET /api/health`

서버 상태 확인. 인증 불필요.

```json
{
  "status": "ok",
  "version": "2.2.1",
  "uptime": 3600
}
```

---

## Sessions

### `GET /api/sessions`

모든 리뷰 세션 목록 반환. `.ca/sessions/` 디렉토리 스캔.

**응답:** `SessionMetadata[]`

```json
[
  {
    "sessionId": "001",
    "date": "2026-04-02",
    "status": "completed",
    "diffPath": "/tmp/review.diff",
    "startedAt": 1743580800000,
    "completedAt": 1743580804000
  }
]
```

### `GET /api/sessions/:date/:id`

단일 세션 전체 데이터 반환.

**경로 파라미터:**
- `:date` — `YYYY-MM-DD`
- `:id` — 세션 ID (e.g. `001`)

**응답:**
```json
{
  "metadata": { ... },
  "reviews": [ ... ],
  "discussions": [ ... ],
  "rounds": { "d001": [ ... ] },
  "verdict": { ... },
  "diff": "diff --git ..."
}
```

### `GET /api/sessions/:date/:id/reviews`

세션의 L1 리뷰 출력만 반환.

### `GET /api/sessions/:date/:id/discussions`

세션의 L2 토론 결과만 반환.

### `GET /api/sessions/:date/:id/verdict`

세션의 L3 최종 판결만 반환.

---

## Configuration

### `GET /api/config`

현재 설정 반환. JSON과 YAML 모두 지원.

- JSON config → JSON 그대로 반환
- YAML config → JSON으로 변환 후 `_source: "yaml"` 메타데이터 포함

**404:** 설정 파일 없음

### `PUT /api/config`

설정 저장. `ConfigSchema` (zod)로 검증.

**요청 본문:** Config 객체 (선택적 `_source` 필드)

```json
{
  "_source": "yaml",
  "mode": "pragmatic",
  "language": "ko",
  "reviewers": [ ... ],
  ...
}
```

- `_source: "yaml"` 또는 기존 파일이 YAML → YAML 형식으로 저장
- 그 외 → JSON 형식으로 저장
- **제한:** YAML 코멘트는 round-trip에서 유실

**400:** 검증 실패 (details 포함)
**200:** `{ "status": "saved" }`

---

## Models

### `GET /api/models`

Thompson Sampling 밴딧 데이터 반환. 모델별 승률과 통계.

```json
{
  "arms": [
    {
      "modelId": "llama-3.3-70b-versatile",
      "alpha": 10,
      "beta": 3,
      "winRate": 0.77
    }
  ],
  "historySummary": {
    "totalReviews": 50,
    "lastUpdated": "2026-04-02T08:00:00Z"
  },
  "status": "ok"
}
```

데이터 없으면: `{ "arms": [], "status": "no_data" }`

### `GET /api/models/history`

전체 리뷰 히스토리 반환 (BanditStore의 ReviewRecord 배열).

---

## Costs

### `GET /api/costs`

전체 세션의 비용 집계 데이터.

```json
{
  "totalCost": 1.25,
  "sessionCount": 5,
  "sessions": [
    {
      "date": "2026-04-02",
      "sessionId": "001",
      "totalCost": 0.25,
      "reviewerCosts": { "r1": 0.15, "r2": 0.10 },
      "layerCosts": { "L1": 0.15, "L2": 0.10 }
    }
  ],
  "perReviewerCosts": { "r1": 0.75, "r2": 0.50 },
  "perLayerCosts": { "L1": 0.80, "L2": 0.45 }
}
```

### `GET /api/costs/pricing`

모델별 토큰 가격 데이터 (pricing.json).

---

## Review (Trigger)

### `POST /api/review`

웹 대시보드에서 리뷰 실행. 파이프라인은 비동기로 실행되며 WebSocket으로 진행 상황 스트리밍.

**요청 본문** (diff / pr_url / staged 중 하나 필수):

```json
{
  "diff": "unified diff content",
  "mode": "full",
  "provider": "groq",
  "model": "llama-3.3-70b-versatile"
}
```

또는:
```json
{
  "pr_url": "https://github.com/owner/repo/pull/123",
  "mode": "quick"
}
```

또는:
```json
{
  "staged": true
}
```

| 필드 | 필수 | 타입 | 설명 |
|------|------|------|------|
| `diff` | 택1 | string | 직접 diff 입력 |
| `pr_url` | 택1 | string | GitHub PR URL |
| `staged` | 택1 | boolean | git staged 변경사항 |
| `mode` | X | `"quick"` \| `"full"` | quick: L1만, full: 전체 파이프라인 (기본) |
| `provider` | X | string | 프로바이더 오버라이드 |
| `model` | X | string | 모델 오버라이드 |

**200:** `{ "sessionId": "web-1234567890", "date": "2026-04-02", "status": "started" }`
**400:** 입력 검증 실패
**409:** 파이프라인 이미 실행 중

---

## Notifications

### `GET /api/notifications`

최근 알림 목록 (최신순). 최대 100개 저장 (FIFO).

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "verdict_reject",
    "sessionId": "2026-04-02/001",
    "verdict": "REJECT",
    "message": "Review completed: REJECT — 1 CRITICAL issue",
    "urgent": true,
    "read": false,
    "createdAt": "2026-04-02T08:05:05Z"
  }
]
```

**알림 타입:**
| type | urgent | 설명 |
|------|--------|------|
| `review_complete` | false | 리뷰 완료 (ACCEPT) |
| `review_failed` | false | 리뷰 실패 |
| `verdict_reject` | true | REJECT 판결 |
| `verdict_needs_human` | true | NEEDS_HUMAN 판결 |

### `PUT /api/notifications/:id/read`

단일 알림 읽음 처리.

### `PUT /api/notifications/read-all`

모든 알림 읽음 처리.

---

## WebSocket

### `ws://localhost:6274/ws`

실시간 파이프라인 이벤트 스트리밍.

**인증 방법 (우선순위순):**
1. `Sec-WebSocket-Protocol` 헤더에 토큰
2. 쿼리 파라미터 `?token=...` (deprecated)
3. `Authorization: Bearer ...` 헤더

**이벤트 타입:**

| 이벤트 | 설명 |
|--------|------|
| `stage-start` | 파이프라인 스테이지 시작 |
| `stage-update` | 스테이지 진행 상황 |
| `stage-complete` | 스테이지 완료 |
| `stage-error` | 스테이지 에러 |
| `pipeline-complete` | 파이프라인 완료 |
| `discussion-start` | L2 토론 시작 |
| `round-start` | 토론 라운드 시작 |
| `supporter-response` | 서포터 응답 |
| `consensus-check` | 컨센서스 확인 |
| `discussion-end` | 토론 종료 |
| `objection` | 이의 제기 |

**제한:**
- 최대 동시 연결: 50
- 메시지 버퍼: 클라이언트당 500개
- Origin: localhost만 허용

---

## Rate Limiting

| 메서드 | 제한 |
|--------|------|
| `GET`, `HEAD` | 100 req/min per IP |
| `POST`, `PUT`, `DELETE` | 10 req/min per IP |

윈도우: 60초. `CODEAGORA_TRUST_PROXY=true`로 프록시 환경에서 실제 IP 추출 가능.

## Security Headers

모든 응답에 포함:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`
