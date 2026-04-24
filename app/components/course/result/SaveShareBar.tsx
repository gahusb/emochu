'use client';

import { useState } from 'react';
import { Share2, Link2, Check } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import type { CourseStop } from '@/lib/weekend-types';

interface Props {
  shareUrl: string;
  title: string;
  summary?: string;
  stops?: CourseStop[];
}

export default function SaveShareBar({ shareUrl, title, summary, stops }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard permission denied — ignore */
    }
  };

  const handleKakaoShare = () => {
    const Kakao = (window as any).Kakao;
    if (!Kakao?.isInitialized?.()) {
      handleCopy();
      return;
    }

    const stopNames = stops?.map((s) => s.title).join(' → ') ?? '';
    const firstImage =
      stops?.find((s) => s.imageUrl)?.imageUrl ??
      'https://jaengseung-made.com/icons/weekend-og.png';

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
