# Changelog - CodeAgora V3

## [3.0.0] - 2026-02-16

### 🎉 Major Release - V3 Architecture

Complete reimplementation with 3-layer architecture.

### ✨ Features

#### Slice 1: Infrastructure
- ✅ `.ca/` directory structure with session management
- ✅ Zod-based config validation
- ✅ Session lifecycle tracking (in_progress → completed/failed)
- ✅ File system utilities for log/session management

#### Slice 2: L1 Reviewers
- ✅ Parallel execution (5 reviewers)
- ✅ Evidence document format (Markdown-based)
- ✅ Backend abstraction (OpenCode, Codex, Gemini)
- ✅ Retry logic with exponential backoff
- ✅ Forfeit threshold enforcement (70%)

#### Slice 3: L2 Moderator + Supporters
- ✅ Severity-based Discussion registration
  - HARSHLY_CRITICAL: 1명 → 즉시
  - CRITICAL: 1명 + 서포터 동의
  - WARNING: 2명+
  - SUGGESTION: suggestions.md
- ✅ Multi-round discussion (최대 3라운드)
- ✅ Supporter verification system
- ✅ Consensus checking with objection protocol
- ✅ Moderator forced decision

#### Slice 4: L3 Head + Pipeline
- ✅ Diff grouping (북엔드 시작)
- ✅ Final verdict (북엔드 끝)
- ✅ Unconfirmed queue scanning
- ✅ Complete pipeline orchestration

#### Slice 5: Edge Cases
- ✅ Code snippet extraction (±N lines with context)
- ✅ Discussion deduplication & merging
- ✅ Supporter objection protocol (이의제기권)
- ✅ Error recovery with retry/circuit breaker
- ✅ Session-based logging system

### 🏗️ Architecture Changes

**V2 → V3:**
- Flat → 3-layer hierarchy (L1 → L2 → L3)
- 75% voting → Severity-based threshold
- CLI debate → Evidence document + Discussion
- Terminal output → `.ca/sessions/` structure
- Head synthesis only → Bookend (grouping + verdict)

### 📊 Technical Details

**Code:**
- 30 TypeScript files
- ~3,400 lines of code
- 38.21 KB build output
- Full type safety with Zod

**Tests:**
- 31 tests across 6 test files
- 100% pass rate
- E2E pipeline coverage

**Performance:**
- Parallel L1 execution
- Background task support
- Circuit breaker for fault tolerance

### 🔧 Configuration

New config structure:
```json
{
  "reviewers": [...],      // L1
  "supporters": [...],     // L2
  "moderator": {...},      // L2
  "discussion": {...},     // Settings
  "errorHandling": {...}   // Retry/forfeit
}
```

### 📁 Output Structure

```
.ca/
├── config.json
└── sessions/{date}/{id}/
    ├── reviews/
    ├── discussions/
    ├── unconfirmed/
    ├── suggestions.md
    ├── report.md
    └── result.md
```

### 🚀 Migration from V2

V2 is preserved in `tools/` directory. V3 is in `src/`.

**Breaking Changes:**
- Config schema completely redesigned
- Output structure changed
- CLI interface different
- Severity enum: lowercase → UPPERCASE

### 📚 Documentation

- `docs/3_V3_DESIGN.md` - Architecture design
- `docs/V3_IMPLEMENTATION_STATUS.md` - Implementation status
- `src/README.md` - Usage guide

### 🙏 Acknowledgments

Based on academic research:
- Majority Voting (martingale proof)
- Free-MAD (anti-conformity)
- Heterogeneous model ensembles

---

## Future Roadmap

- [ ] Real backend CLI integration
- [ ] Performance benchmarking
- [ ] GitHub Action support
- [ ] Standalone CLI mode
- [ ] Web UI dashboard
