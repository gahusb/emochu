import type { Metadata } from 'next';
import CommunityPageShell from '@/app/components/community/CommunityPageShell';

export const metadata: Metadata = {
  title: '커뮤니티 코스 | 이모추!',
  description: '다른 사람이 만들어 추천을 허락한 코스를 둘러보세요.',
};

export default function CommunityPage() {
  return <CommunityPageShell />;
}
