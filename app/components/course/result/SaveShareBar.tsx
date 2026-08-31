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
}

export default function SaveShareBar({ shareUrl, slug, title, summary, stops }: Props) {
  const [copied, setCopied] = useState(false);

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
    <div className="flex flex-wrap gap-2" aria-live="polite">
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
  );
}
