# TourAPI 실호출 감시 — 2026-08-10

> `node loops/tourapi-watch/smoke.mjs` 산출물. `cache: 'no-store'` 직접 호출 — **심사용 호출 이력 확보** 목적.

## 요약

| PASS | WARN | FAIL | 합계 |
|---|---|---|---|
| 11 | 0 | 0 | 11 |

- **폐기 예정 오퍼레이션**: ✅ `areaCode2`·`categoryCode2` 모두 정상 응답

## 오퍼레이션별

| 오퍼레이션 | 판정 | HTTP | resultCode | 항목 | totalCount | 응답(ms) | 비고 |
|---|---|---|---|---|---|---|---|
| `searchFestival2` | ✅ PASS | 200 | 0000 | 3 | 101 | 206 |  |
| `locationBasedList2` | ✅ PASS | 200 | 0000 | 3 | 802 | 149 |  |
| `areaBasedList2` | ✅ PASS | 200 | 0000 | 3 | 421 | 186 |  |
| `searchKeyword2` | ✅ PASS | 200 | 0000 | 3 | 10 | 214 |  |
| `searchStay2` | ✅ PASS | 200 | 0000 | 3 | 239 | 131 |  |
| `detailCommon2` | ✅ PASS | 200 | 0000 | 1 | 1 | 98 |  |
| `detailIntro2` | ✅ PASS | 200 | 0000 | 1 | 1 | 90 |  |
| `detailInfo2` | ✅ PASS | 200 | 0000 | 3 | 3 | 86 |  |
| `detailImage2` | ✅ PASS | 200 | 0000 | 6 | 6 | 91 |  |
| `areaCode2` | ✅ PASS | 200 | 0000 | 5 | 17 | 101 | **폐기 예정** |
| `categoryCode2` | ✅ PASS | 200 | 0000 | 5 | 7 | 88 | **폐기 예정** |

## 검증 체크리스트

- [x] 11개 오퍼레이션 전부 호출됨 (11/11)
- [x] HTTP 상태와 resultCode 가 기록됨
- [x] 결과 항목 수가 0인 오퍼레이션 없음 (WARN 0건)
- [x] 폐기 예정 오퍼레이션 생존 확인
- [x] 리포트에 인증키 문자열 없음 (mask 적용)
