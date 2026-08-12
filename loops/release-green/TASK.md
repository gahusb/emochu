# release-green Loop

## Goal

`npm test` · `npm run lint` · `npm run build` 세 검사를 돌려 **지금 배포해도 되는 상태인지**를 매번 파일로 남긴다.

## 왜 이 Loop인가

- 9/21 접수 전 **아무 때나 제출 가능한 상태**를 유지해야 한다. 제출 직전에 빌드가 깨져 있으면 손 쓸 시간이 없다.
- 테스트 개수 **기준선 61**을 감시한다. 줄었으면 회귀다.

## Expected Output

- `loops/release-green/outputs/green-YYYY-MM-DD-HHMM.md` (파일명에 시각 포함 — 하루 여러 번 실행해도 이전 결과를 덮어쓰지 않는다)
- `loops/release-green/PROGRESS.md`

## Scope

권한 사다리 **1단계**. 검사와 리포트만.

Claude가 하면 안 되는 것:
- 소스 파일 수정 (실패해도 **고치지 않는다**. 리포트에 적고 사람에게 넘긴다)
- 파일 삭제·이름 변경
- `git commit` / `git push` / 배포

## Stop condition

- **성공**: 3종 전부 PASS + 테스트 61 이상 → 종료
- **실패**: 리포트에 남기고 `PROGRESS.md`의 `Needs Human Review`에 적은 뒤 **종료**. 재시도하지 않는다
  (빌드 실패는 재시도로 낫지 않는다 — 코드를 고쳐야 한다)
