# 변경 이력

## 1.0.0-rc.8 (2026-03-16)

### 새 기능
- **GitHub Actions 통합** — PR 인라인 리뷰 코멘트, commit status check, SARIF 출력
- **15개 API 프로바이더** — OpenAI, Anthropic, Google, Groq, DeepSeek, Qwen, Mistral, xAI, Together, Cerebras, NVIDIA NIM, ZAI, OpenRouter, GitHub Models, GitHub Copilot
- **5개 CLI 백엔드** — claude, codex, gemini, copilot, opencode
- **LLM 기반 Head 판결** — L3 Head 에이전트가 LLM으로 추론 품질 평가 (규칙 기반 fallback)
- **과반수 합의** — checkConsensus가 >50% agree/disagree 투표 처리
- **의미적 파일 그룹핑** — import 관계 기반 클러스터링
- **리뷰어 페르소나** — strict, pragmatic, security-focused 페르소나 파일
- **설정 가능한 청킹** — maxTokens를 config에서 설정 가능
- **NEEDS_HUMAN 처리** — 자동 리뷰어 요청 + 라벨 추가
- **SARIF 2.1.0 출력** — GitHub Code Scanning 호환
- **안전한 크레덴셜** — API 키를 ~/.config/codeagora/credentials에 저장
- **TUI 붙여넣기 지원** — 모든 텍스트 입력에서 클립보드 붙여넣기 동작
- **CLI --pr 플래그** — 커맨드라인에서 직접 GitHub PR 리뷰

### 버그 수정
- dist 빌드 크래시 수정 (로케일 JSON 미번들)
- 토론 매칭 수정 (substring 대신 정확한 filePath:line 매칭)
- forfeit threshold division by zero 수정
- CLI 플래그 (--provider, --model, --timeout, --no-discussion) 무시되는 문제 수정
- GitHub Action multiline output 깨짐 수정
- parser "looks good" false negative 수정
- 인라인 코멘트 position 에러 시 summary-only fallback

## 1.0.0-rc.1 ~ rc.7

초기 개발 릴리즈. 자세한 내용은 git 히스토리를 참고하세요.
