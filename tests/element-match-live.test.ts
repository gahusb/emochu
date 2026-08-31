import { describe, it, expect } from 'vitest';
import { locationBasedList } from '@/lib/tour-api';
import { matchesElement } from '@/lib/weekend-ai';
import type { ScoredSpot } from '@/lib/weekend-ai';
import type { Element5 } from '@/lib/saju';

// 오행 키워드가 실제 TourAPI 후보에 얼마나 닿는지 재는 실측 테스트다.
//
// 실행:  set -a && . ./.env.local && set +a && npx vitest run tests/element-match-live.test.ts
//
// 왜 필요한가: 키워드 맵은 사람이 손으로 적은 제안이다. 실제 cat3·title 에
// 안 걸리면 가중치를 아무리 잘 잡아도 **아무 일도 일어나지 않는다**.
// 「적용했다」와 「효과가 있다」는 다르고, 그 차이를 여기서만 확인할 수 있다.
//
// `npm test` 로는 skip 된다 (vitest 가 .env.local 을 자동 로드하지 않는다).
const hasKey = Boolean(process.env.TOUR_API_KEY?.trim());

const SPOTS = [
  { name: '서울 시청',   mapY: 37.5665, mapX: 126.9780 },
  { name: '강릉 (해안)', mapY: 37.7519, mapX: 128.8761 },
  { name: '안동 (내륙)', mapY: 36.5684, mapX: 128.7294 },
];

const ELEMENTS: Element5[] = ['wood', 'fire', 'earth', 'metal', 'water'];

function toScored(items: Awaited<ReturnType<typeof locationBasedList>>): ScoredSpot[] {
  return items.map((it) => ({
    contentId: it.contentid,
    contentTypeId: Number(it.contenttypeid),
    title: it.title,
    addr1: it.addr1,
    cat1: it.cat1, cat2: it.cat2, cat3: it.cat3,
    latitude: Number(it.mapy), longitude: Number(it.mapx),
    distanceKm: Number(it.dist) / 1000,
    score: 0,
  }));
}

// 오행 가중이 실제로 작동하는 풀만 잰다.
// 음식점(39)·숙박(32)은 오행 대상이 아니라 role 슬롯으로 따로 채워지므로,
// 거리순 전체를 재면 식당·모텔이 분모를 채워 매칭률이 실제보다 낮게 나온다.
const ELEMENT_TARGET_TYPES = [12, 14, 28]; // 관광지 · 문화시설 · 레포츠

async function fetchPool(loc: { mapX: number; mapY: number }): Promise<ScoredSpot[]> {
  const batches = await Promise.all(ELEMENT_TARGET_TYPES.map(contentTypeId =>
    locationBasedList({ mapX: loc.mapX, mapY: loc.mapY, radius: 20000, numOfRows: 50, contentTypeId })));
  return toScored(batches.flat());
}

describe.skipIf(!hasKey)('오행 키워드 매칭률 실측', () => {
  it('지역별·오행별 매칭률을 재고 바닥선을 확인한다', async () => {
    const perElement: Record<Element5, number[]> = { wood: [], fire: [], earth: [], metal: [], water: [] };
    const rows: string[] = [];
    const all: ScoredSpot[] = [];

    for (const loc of SPOTS) {
      const spots = await fetchPool(loc);
      all.push(...spots);
      const cells = ELEMENTS.map((el) => {
        const rate = spots.length === 0 ? 0 : spots.filter(s => matchesElement(s, el)).length / spots.length;
        perElement[el].push(rate);
        return `${el} ${(rate * 100).toFixed(0)}%`;
      });
      rows.push(`  ${loc.name.padEnd(12)} n=${String(spots.length).padStart(3)}  ${cells.join('  ')}`);
      expect(spots.length).toBeGreaterThan(0);
    }

    console.log('\n[오행 매칭률 실측]\n' + rows.join('\n') + '\n');

    // 🔴 바닥선 5% — 이보다 낮으면 가중이 사실상 발화하지 않는다.
    //    (인수인계 문서의 「1순위 검증」 기준. 깨지면 cat3 코드를 다시 뽑아야 한다.)
    for (const el of ELEMENTS) {
      const avg = perElement[el].reduce((a, b) => a + b, 0) / perElement[el].length;
      expect(avg, `${el} 평균 매칭률이 5% 미만이다 — cat3 코드를 다시 뽑아야 한다`).toBeGreaterThan(0.05);
    }

    // 🔑 킥의 조건: 오행이 다르면 **다른 후보**가 떠야 한다.
    //    매칭 집합이 같으면 날짜가 바뀌어도 코스가 안 바뀐다 — 그건 킥이 아니다.
    const sets = ELEMENTS.map(el => all.filter(s => matchesElement(s, el)).map(s => s.contentId).sort().join(','));
    expect(new Set(sets).size, '오행별 매칭 집합이 겹친다 — 날이 바뀌어도 같은 코스가 나온다').toBe(ELEMENTS.length);
  }, 60_000);
});
