---
name: tourapi-watch
description: 이모추가 쓰는 한국관광공사 OpenAPI 11개의 상태를 실호출로 점검하고 리포트·상태 파일을 갱신한다. 폐기 예정 오퍼레이션(areaCode2·categoryCode2) 조기 경보를 겸한다.
when_to_use: 일일 API 헬스체크를 돌릴 때, TourAPI 응답이 이상하다는 의심이 들 때, 공모전 제출 전 호출 이력·API 생존을 확인할 때
---

# TourAPI 감시

## 무엇을 하는가

`node loops/tourapi-watch/smoke.mjs` 를 실행해 11개 오퍼레이션을 실호출하고, 그 결과를 판정해 상태 파일을 갱신한다.

## 절차

1. `loops/tourapi-watch/TASK.md` 와 `PROGRESS.md` 를 읽는다 (특히 `Do Not Repeat`).
2. 오늘 날짜 리포트가 `loops/tourapi-watch/outputs/` 에 **이미 있으면 중복 실행하지 않는다.**
3. `node loops/tourapi-watch/smoke.mjs` 실행. **직접 fetch 를 만들지 않는다** — 스크립트가 단일 경유점이다.
4. 생성된 `outputs/api-health-YYYY-MM-DD.md` 를 읽고 판정한다.
5. `PROGRESS.md` 갱신 — `Last Run` · `Open Items` · `Needs Human Review` · `Next Run Should`.

## 판정 기준

| 신호 | 판정 |
|---|---|
| HTTP 200 + `resultCode 0000` + 항목 > 0 | ✅ PASS |
| HTTP 200 + `resultCode 0000` + **항목 0** | 🟡 WARN |
| 그 외 | 🔴 FAIL |

> 🔴 **WARN을 정상으로 넘기지 마라.** 폐기된 오퍼레이션은 404가 아니라 **「200인데 결과 0」**으로 먼저 나타난다.

## 금지

- 소스 파일(`app/`·`lib/`·`components/`·`tests/`) 수정
- 파일 삭제·이름 변경, `git commit`/`push`, 배포
- 🔴 인증키를 리포트·로그에 남기기 — `settings.json` 의 `Read(./.env.local)` deny 는 **에이전트가 키를 컨텍스트에 들이지 못하게** 막는 것이다. 파일이 잠긴 게 아니라 `smoke.mjs` 는 이 파일을 읽는다(값은 마스킹). 키는 스크립트가 다루고 에이전트는 판정만 한다

## 에스컬레이션

- `areaCode2` 또는 `categoryCode2` 가 PASS 가 아니면 → **재시도하지 말고 즉시 사람 호출.** 서비스가 곧 깨진다는 신호다.
- 같은 검증이 2회 연속 실패 → `Needs Human Review` 에 적고 멈춘다.

## 배경 (왜 이 Loop가 있는가)

- 공모전 심사가 **인증키로 「개발 기간 내 호출건수」를 검증**한다 → Loop가 도는 것 자체가 이력이 된다.
- `areaCode2`·`categoryCode2` 는 **2026년 폐기 예정인데 이모추가 아직 사용 중**이다.
