import type { Metadata } from 'next';
import MyCoursesShell from '@/app/components/my/MyCoursesShell';

export const metadata: Metadata = {
  title: '내 코스',
  description: '내가 만든 나들이 코스',
  // 개인 목록이라 검색엔진에 올릴 이유가 없다.
  robots: { index: false, follow: false },
};

export default function MyCoursesPage() {
  return <MyCoursesShell />;
}
