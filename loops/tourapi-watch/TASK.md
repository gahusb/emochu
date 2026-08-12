# TourAPI 실호출 감시 Loop

## Goal

이모추가 사용하는 한국관광공사 OpenAPI **11개 오퍼레이션**을 매일 1회 실호출해

1. 응답이 정상인지 (HTTP 200 + `resultCode 0000` + 항목 수 > 0)
2. **폐기 예정** 오퍼레이션(`areaCode2`·`categoryCode2`)이 아직 살아 있는지

를 기록한다.

## 왜 이 Loop인가

- 🏆 **공모전 심사가 인증키로 「개발 기간 내 호출건수」를 검증한다.** 이 Loop가 도는 것 자체가 **호출 이력을 만든다**.
- 🔴 **`areaCode2`·`categoryCode2`는 2026년 폐기 예정인데 이모추가 아직 사용 중이다.** 내려가는 날을 사람이 기억하는 대신 **Loop가 잡아낸다**.
- 검증이 명확하다 — 통과/실패가 기계적으로 갈린다.

## Expected Output

매 실행이 만들거나 갱신할 것:

- `loops/tourapi-watch/outputs/api-health-YYYY-MM-DD.md`
- `loops/tourapi-watch/PROGRESS.md`

## Scope

읽기와 리포트 작성만 한다. **권한 사다리 1단계.**

Claude가 **해도 되는 것**:

- `loops/tourapi-watch/smoke.mjs` 실행
- 결과 판정 및 위 두 파일 작성

Claude가 **하면 안 되는 것**:

- `app/`·`lib/`·`components/`·`tests/` 등 **소스 파일 수정**
- 파일 삭제·이름 변경
- `git commit` / `git push` / 배포
- 🔴 **인증키·좌표 등 민감값을 리포트나 로그에 기록** — `.claude/settings.json` 이 `Read(./.env.local)` 을 deny 한다. 이 deny 가 지키는 것은 **에이전트의 컨텍스트**다(키가 대화에 들어오면 리포트·로그로 흘러나갈 수 있다). 파일 자체가 잠긴 게 아니라서, allow 된 `smoke.mjs`·`gate.mjs` 는 실제로 이 파일을 읽는다 — 다만 값은 마스킹해서 출력한다. **키를 다루는 건 스크립트의 일이지 에이전트의 일이 아니다.**

## Stop condition

- **성공**: 검증 체크리스트 5개가 전부 통과하면 그 실행은 종료.
- **실패(하드 리밋)**: 같은 검증이 **2회 연속 실패**하면 더 시도하지 않고 `PROGRESS.md`의 `Needs Human Review`에 적고 멈춘다.
- 🔴 **즉시 정지**: `areaCode2` 또는 `categoryCode2`가 FAIL이면 재시도하지 않고 **사람을 호출**한다.

## 변경 이력

- 2026-08-10: 생성. 손으로 1회 실행해 형식 확정(11/11 PASS), Gate red 테스트 통과.
