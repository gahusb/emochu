import { describe, expect, it } from 'vitest';
import { createStageTimer, dominantStage, formatTimingHeader, formatTimingLine } from '@/lib/course-stage-timer';

const fakeClock = () => {
  let t = 0;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
};

describe('코스 생성 단계 계측', () => {
  it('단계별 소요를 파이프라인 순서대로 남긴다', async () => {
    const clock = fakeClock();
    const timer = createStageTimer(clock.now);
    await timer.track('collect', async () => { clock.advance(1_200); });
    await timer.track('ai', async () => { clock.advance(18_000); });
    timer.mark('persist', 300);

    const summary = timer.summary();
    expect(summary.stages).toEqual([
      { stage: 'collect', ms: 1_200 },
      { stage: 'ai', ms: 18_000 },
      { stage: 'persist', ms: 300 },
    ]);
    expect(summary.totalMs).toBe(19_200);
  });

  it('실패한 단계도 잰다 — 느려서 터진 요청이야말로 알고 싶은 표본이다', async () => {
    const clock = fakeClock();
    const timer = createStageTimer(clock.now);
    await expect(
      timer.track('ai', async () => { clock.advance(53_000); throw new Error('timeout'); }),
    ).rejects.toThrow('timeout');
    expect(timer.summary().stages).toEqual([{ stage: 'ai', ms: 53_000 }]);
  });

  it('같은 단계를 여러 번 재면 합산한다', async () => {
    const clock = fakeClock();
    const timer = createStageTimer(clock.now);
    await timer.track('enrich', async () => { clock.advance(800); });
    await timer.track('enrich', async () => { clock.advance(400); });
    expect(timer.summary().stages).toEqual([{ stage: 'enrich', ms: 1_200 }]);
  });

  it('동기 단계는 값을 그대로 돌려준다', () => {
    const clock = fakeClock();
    const timer = createStageTimer(clock.now);
    const ranked = timer.trackSync('score', () => { clock.advance(60); return [1, 2, 3]; });
    expect(ranked).toEqual([1, 2, 3]);
    expect(timer.summary().stages).toEqual([{ stage: 'score', ms: 60 }]);
  });

  it('로그 한 줄은 오래 걸린 단계를 앞에 둔다 — 범인이 먼저 보여야 한다', async () => {
    const clock = fakeClock();
    const timer = createStageTimer(clock.now);
    await timer.track('collect', async () => { clock.advance(1_200); });
    await timer.track('ai', async () => { clock.advance(18_000); });
    timer.note('candidates', 66);
    timer.note('ai', 'gemini');

    const line = formatTimingLine(timer.summary());
    expect(line.startsWith('[이모추API] 소요(ms) total=19200')).toBe(true);
    expect(line.indexOf('ai=18000')).toBeLessThan(line.indexOf('collect=1200'));
    expect(line).toContain('candidates=66');
    expect(line).toContain('ai=gemini');
  });

  it('지배적인 단계를 한 번에 알려준다', async () => {
    const clock = fakeClock();
    const timer = createStageTimer(clock.now);
    await timer.track('collect', async () => { clock.advance(1_200); });
    await timer.track('ai', async () => { clock.advance(18_000); });
    expect(dominantStage(timer.summary())).toEqual({ stage: 'ai', ms: 18_000 });
    expect(dominantStage(createStageTimer(clock.now).summary())).toBeNull();
  });
});

describe('응답 헤더 — 로그를 못 보는 쪽이 읽는 통로', () => {
  const sample = async () => {
    const clock = fakeClock();
    const timer = createStageTimer(clock.now);
    await timer.track('collect', async () => { clock.advance(1_200); });
    await timer.track('ai', async () => { clock.advance(18_000); });
    timer.note('candidates', 66);
    timer.note('ai', 'gemini');
    timer.note('persistence', 'saved');
    return timer.summary();
  };

  it('단계는 =, 부가 정보는 : 로 갈라 같은 이름도 구분된다', async () => {
    const header = formatTimingHeader(await sample());
    expect(header).toContain('total=19200');
    expect(header).toContain('ai=18000');      // 단계
    expect(header).toContain('ai:gemini');     // 부가 정보
    expect(header).toContain('candidates:66');
    expect(header.indexOf('ai=18000')).toBeLessThan(header.indexOf('collect=1200'));
  });

  it('HTTP 헤더에 실을 수 있도록 ASCII 만 남긴다', async () => {
    const clock = fakeClock();
    const timer = createStageTimer(clock.now);
    timer.mark('ai', 100);
    timer.note('note', ['한글과 줄바꿈', '도 섞인 값'].join(String.fromCharCode(10)));
    const header = formatTimingHeader(timer.summary());
    expect(header).toMatch(/^[ -~]*$/);
    expect(header).not.toContain('한글');
  });

  it('길어져도 헤더 한도를 넘기지 않는다', () => {
    const clock = fakeClock();
    const timer = createStageTimer(clock.now);
    for (let i = 0; i < 80; i++) timer.note('k' + i, 'x'.repeat(30));
    expect(formatTimingHeader(timer.summary()).length).toBeLessThanOrEqual(500);
  });
});
