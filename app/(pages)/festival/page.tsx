import type { Metadata } from 'next';
import FestivalPageShell from '@/app/components/festival/FestivalPageShell';

export const metadata: Metadata = {
  title: '이번 주말 축제 | 이모추!',
  description: '내 주변에서 이번 주말 열리는 축제를 한눈에 확인하세요.',
};

export default function FestivalPage() {
  return <FestivalPageShell />;
}
