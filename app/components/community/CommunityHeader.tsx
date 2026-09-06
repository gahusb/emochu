interface Props {
  count: number;
  loading: boolean;
  /** 다음 페이지가 더 있으면 count 는 "지금까지 불러온 개수"일 뿐이라 총량이 아니다 —
   *  그럴 땐 숫자를 보여주지 않는다(부정확한 총계를 단언하지 않는다). */
  hasMore: boolean;
}

export default function CommunityHeader({ count, loading, hasMore }: Props) {
  return (
    <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 pb-4">
      <h1
        className="text-2xl lg:text-3xl font-bold text-ink-1 break-keep"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        다른 사람이 만든 코스
      </h1>
      <p className="text-sm text-ink-3 mt-2">
        추천을 허락받은 코스만 모아뒀어요
        {!loading && !hasMore && <> · <span className="font-semibold text-ink-2">{count}개</span></>}
      </p>
    </section>
  );
}
