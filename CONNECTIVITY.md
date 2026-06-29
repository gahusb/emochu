# CONNECTIVITY — 이모추 ↔ 결빛 운세 엔진 공유 계약

> ⚠️ **이 파일은 `emochu`와 `jaengseung-made` 두 저장소에 동일 사본으로 존재한다.**
> 양쪽 세션(이모추 개발 세션 / 결빛 엔진 세션)이 **같은 계약**을 보기 위한 단일 문서다.
> **한쪽을 수정하면 반드시 다른 쪽에도 같은 내용을 복사**한다. (수동 동기화)
> **Source of Truth = `jaengseung-made`** (결빛 엔진 = provider). emochu 사본은 미러.

- 최초 작성: 2026-06-08
- 계약 버전: **v0 (초안 — 확정 전)**. 실제 엔드포인트·인증·입출력 스키마는 양쪽 합의로 채운다. `TBD` = 미정.

---

## 1. 배경 / 결정 (2026-06-08)

- 이모추 운세 기능의 결정 방식:
  1. **옵션 A = 이모추 내부 경량 구현** (일자 기반 8방위, 생년월일 입력 X). 외부 의존 0 → 공모전 라이브 데모 안정.
  2. **옵션 B~D = 결빛 운세 엔진 API 호출** (생년월일 사주). **이달(2026-06) 내 결빛 완성 후 연결.**
- 운세 결정을 **추상화 경계(인터페이스) 뒤로** 두고, 기본 구현(내부 경량)과 결빛 API 어댑터를 **갈아끼울 수 있게** 한다.
- 결빛 API 호스팅 = **NAS** (가용성 미검증). → **🔴 폴백 필수**: 호출 실패 시 이모추 내부 경량 운세로 graceful degradation.
- 이모추 = 결빛 엔진의 **첫 외부 소비처**. 공모전 구현이 곧 결빛 API 첫 검증.

## 2. 역할

| 저장소 | 역할 | 책임 |
|---|---|---|
| `jaengseung-made` (결빛 엔진) | **Provider** | 운세 API 엔드포인트 제공·버전 관리. 내부적으로 `lib/saju-calculator.ts` · `lib/ai-interpretation.ts` · `lib/solar-terms.ts` · `lib/saju-ai-prompt.ts` 사용 |
| `emochu` | **Consumer** | 운세 소스 추상화(`FortuneSource` 인터페이스) + 내부 경량 구현 + 결빛 API 어댑터 + 폴백 |

## 3. 운세 소스 추상화 (Consumer 측 인터페이스)

> emochu가 구현할 경계. 어떤 소스든 이 형태를 만족하면 교체 가능.

```ts
// 의사 시그니처 (TS 기준, 실제 타입은 emochu 코드에서 확정)
type FortuneMode = "daily8" | "courseTone" | "direction" | "coupleSaju";

interface FortuneRequest {
  targetDate: string;        // "YYYY-MM-DD" — 운세 대상 일자 (보통 오늘/주말)
  mode: FortuneMode;
  birth?: {                  // 옵션 B~D 에서만 사용 (옵션 A=daily8 은 불필요)
    date: string;            // "YYYY-MM-DD"
    time?: string;           // "HH:mm" (선택)
    calendar: "solar" | "lunar";
    gender?: "M" | "F";
  };
  partnerBirth?: FortuneRequest["birth"];  // coupleSaju(옵션 D) 에서만
  locale?: "ko" | "en" | "ja";             // 기본 ko
}

interface FortuneResult {
  source: "internal" | "gyeolbit";  // 어느 소스가 응답했는지 (폴백 추적용)
  direction?: "동"|"서"|"남"|"북"|"북동"|"북서"|"남동"|"남서";  // 8방위
  tone?: string;            // 코스 톤 변형 키워드 (옵션 B/C)
  copy: string;             // 사용자 표시 카피 (필수)
  score?: number;           // 선택 (가중치/강도)
  raw?: unknown;            // 결빛 원본 응답 (디버그용, 선택)
}

interface FortuneSource {
  getFortune(req: FortuneRequest): Promise<FortuneResult>;
}
```

- **InternalFortuneSource** — 옵션 A. `solar-terms` 절기 + 카피 풀로 일자 기반 8방위 생성. 외부 호출 없음.
- **GyeolbitFortuneSource** — 옵션 B~D. 결빛 API 호출(§4). 실패 시 호출부에서 InternalFortuneSource로 폴백.

## 4. 결빛 API 계약 (Provider 측, v0 제안 — 확정 전)

> 아래는 **제안**이다. 결빛 세션이 실제 구현하며 확정하고, 변경 시 이 문서를 양쪽 동기화.

- **Base URL**: **`https://api.gyeolbit.com`** (🟡 잠정 — `gyeolbit.com` 가비아 구매 방향, NAS에 DDNS/리버스 프록시 연결 예정). emochu는 env로 주입 — `GYEOLBIT_API_BASE`. *도메인 실구매·NAS 노출 확정 전까지 잠정값.*
- **인증**: `TBD` — 예: 헤더 `X-Gyeolbit-Key: <env GYEOLBIT_API_KEY>`
- **타임아웃(권장)**: 2000ms. 초과 시 consumer 폴백.
- **CORS**: emochu(Vercel) 도메인 허용 필요(서버↔서버 호출이면 불필요).

### 엔드포인트 (제안)

`POST /v1/fortune`

요청(JSON) — §3 `FortuneRequest` 와 동일 형태:
```json
{
  "targetDate": "2026-06-14",
  "mode": "coupleSaju",
  "birth":        { "date": "1992-12-23", "time": "16:30", "calendar": "solar", "gender": "M" },
  "partnerBirth": { "date": "1994-05-01", "calendar": "solar", "gender": "F" },
  "locale": "ko"
}
```

응답(JSON) — §3 `FortuneResult` 와 동일 형태:
```json
{
  "source": "gyeolbit",
  "direction": "동",
  "tone": "차분한 힐링",
  "copy": "오늘은 동쪽 기운이 좋아요. 함께라면 더 빛나는 하루가 될 거예요.",
  "score": 0.78
}
```

- 에러: 4xx/5xx 또는 타임아웃 → consumer가 폴백. 결빛은 가능한 한 `{ ok:false, error }` 형태로 응답하되, **다운 시 무응답도 consumer가 처리**.
- 만세력 정확도 기준(결빛 내부): 검증 케이스 1992-12-23 16:30 男 = 년주 壬申 / 월주 壬子 / 일주 癸酉 / 시주 庚申. (jaengseung-made `lib/saju-calculator.ts` 기준)

## 5. 폴백 규칙 (🔴 공모전 데모 안정성 직결)

1. 옵션 A(daily8)는 **항상 InternalFortuneSource** 사용 (외부 호출 X).
2. 옵션 B~D는 GyeolbitFortuneSource 시도 → 실패(타임아웃/네트워크/4xx/5xx) 시 **InternalFortuneSource로 즉시 폴백**.
3. 폴백 발동 시 사용자에겐 정상 운세로 보이되, `FortuneResult.source`로 내부 추적.
4. 폴백 패턴은 emochu 기존 `lib/weekend-ai.ts`의 "검증 실패 시 폴백 코스" 패턴 재사용.

## 6. 오픈 이슈 (양쪽 합의 필요)

- [ ] 결빛 API Base URL / 인증 방식 확정 (NAS 도메인·포트·키)
- [ ] `FortuneMode`별 결빛 응답 필드 확정 (특히 coupleSaju=옵션 D 입출력)
- [ ] NAS 가용성·HTTPS·외부 접근(동적 IP/DDNS) 점검 — 불안정하면 Edge/Vercel 대안 재검토
- [ ] 응답 카피 생성 = 결빛 Gemini 폴백 체인 사용 여부 / locale 처리
- [ ] 계약 버전 올림 규칙 (v0 → v1) 및 양쪽 동기화 절차

## 7. 변경 이력

- 2026-06-08: v0 초안 작성. 결정(내부 경량+결빛 API·NAS·폴백 필수) + 추상화 인터페이스 + API 제안 + 폴백 규칙 + 오픈 이슈. 위키 프로젝트-이모추 · 프로젝트-쟁승메이드-Co 동기화.
- 2026-06-08: 도메인 잠정 확정 — Base URL `https://api.gyeolbit.com` (gyeolbit.com 가비아 구매 방향, NAS DDNS). 실구매 전 잠정. 오픈 이슈 "Base URL/인증"은 도메인 확정 시 갱신.
