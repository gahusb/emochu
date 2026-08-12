// 전역 푸터 — 공모전 규정상 필수인 출처 표기를 모든 페이지에 노출한다.
// 🔴 규정: 텍스트만 허용(로고 이미지 불가), `TourAPI` 단독 표기는 지양.
//    허용 표기는 `출처: ⓒ한국관광공사` 또는 `출처: ⓒ한국관광콘텐츠랩`.
// 하단 패딩은 layout.tsx 의 <main> 에서 여기로 옮겼다 — BottomTabBar 가 모바일에서
// 하단 고정이라, 패딩이 main 에 남아 있으면 마지막 요소인 이 푸터가 탭바에 가린다.
export default function SiteFooter() {
  return (
    <footer className="px-4 pt-8 pb-[calc(5rem+env(safe-area-inset-bottom))] text-center lg:pb-8">
      {/* 출처 줄만 ink-3 다. ink-4(#A8917A)는 배경(#FAF7F2) 대비 2.8:1 로 WCAG AA(4.5:1)
          미달인데, 이건 규정상 심사자가 실제로 읽어야 하는 문구다. ink-3(#7A6E62)는 4.6:1 로
          통과한다. 아래 부가 문구는 읽히지 않아도 그만이라 ink-4 를 유지해 위계를 남긴다. */}
      <p className="text-xs text-ink-3">출처: ⓒ한국관광공사</p>
      <p className="mt-1 text-xs text-ink-4">2026 관광데이터 활용 공모전 출품작</p>
    </footer>
  );
}
