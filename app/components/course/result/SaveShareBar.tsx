'use client';

import { useState } from 'react';
import { Share2, Link2, Check } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import type { CourseStop } from '@/lib/weekend-types';

interface Props {
  shareUrl: string;
  /** 보존 표시에 쓴다. 공유·저장을 누른 코스만 영구 보존된다. */
  slug: string;
  title: string;
  summary?: string;
  stops?: CourseStop[];
  /** 있으면 소유자 — 커뮤니티 공개 토글을 보여준다. 없으면(방문자) 토글 자체를 렌더링하지 않는다. */
  editToken?: string | null;
  /** GET /api/course/[slug] 가 내려준 현재 공개 상태. */
  initialIsPublic?: boolean;
}

export default function SaveShareBar({
  shareUrl, slug, title, summary, stops, editToken, initialIsPublic = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [toggling, setToggling] = useState(false);

  /**
   * 이 코스를 영구 보존으로 표시한다.
   * 🔴 await 하지 않고 실패도 삼킨다 — 공유는 사용자가 원한 동작이고,
   *    보존 표시는 거기 딸린 부수 효과다. 이것 때문에 공유가 느려지거나
   *    에러가 뜨면 안 된다. 실패는 서버 로그에 남는다.
   */
  const markKept = () => {
    void fetch(`/api/course/${slug}/keep`, { method: 'POST' }).catch(() => {});
  };

  const handleCopy = async () => {
    markKept();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard permission denied — ignore */
    }
  };

  /** 낙관적으로 먼저 바꾸고, 실패하면 되돌린다 — 토글은 즉각 반응해야 하는 UI다. */
  const handleTogglePublic = async () => {
    if (!editToken || toggling) return;
    const next = !isPublic;
    setIsPublic(next);
    setToggling(true);
    try {
      const res = await fetch(`/api/course/${slug}/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-edit-token': editToken },
        body: JSON.stringify({ isPublic: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setIsPublic(!next);
    } finally {
      setToggling(false);
    }
  };

  const handleKakaoShare = () => {
    markKept();
    const Kakao = window.Kakao;
    if (!Kakao?.isInitialized?.()) {
      handleCopy();
      return;
    }

    const stopNames = stops?.map((s) => s.title).join(' → ') ?? '';
    const firstImage =
      stops?.find((s) => s.imageUrl)?.imageUrl ??
      `${window.location.origin}/opengraph-image`;

    Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: title || '이모추 코스',
        description: summary
          ? `${summary}\n📍 ${stopNames}`
          : '이번 주말 나들이 코스를 AI가 만들어줬어요!',
        imageUrl: firstImage,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        {
          title: '코스 보기',
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
      ],
    });
  };

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="md"
          iconLeft={<Share2 size={16} />}
          onClick={handleKakaoShare}
        >
          카카오톡 공유
        </Button>
        <Button
          variant="ghost"
          size="md"
          iconLeft={copied ? <Check size={16} /> : <Link2 size={16} />}
          onClick={handleCopy}
        >
          {copied ? '복사됨!' : '링크 복사'}
        </Button>
      </div>

      {/* 커뮤니티 공개 — owner(editToken 보유자)에게만 보인다. 공유와는 다른 결정이라
          시각적으로 분리한다: 버튼 줄이 아니라 별도의 카드로. */}
      {editToken && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-sunken px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-1">다른 사람에게도 추천되게 허용</p>
            <p className="text-xs text-ink-3 mt-0.5 break-keep">
              켜면 커뮤니티 코스 목록에 나와요. 언제든 다시 끌 수 있어요.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            aria-label="다른 사람에게도 추천되게 허용"
            onClick={handleTogglePublic}
            disabled={toggling}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              isPublic ? 'bg-brand' : 'bg-ink-4/40'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                isPublic ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
}
