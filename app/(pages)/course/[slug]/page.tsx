import CourseResult from '@/app/components/CourseResult';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://emochu.vercel.app';
    const res = await fetch(`${baseUrl}/api/course/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const course = data.course;
    const image = course?.stops?.find((s: { imageUrl?: string }) => s.imageUrl)?.imageUrl;
    return {
      title: course?.title ?? '코스 보기',
      description: course?.summary ?? '이모추! AI가 만든 주말 나들이 코스',
      openGraph: {
        title: course?.title ?? '이모추! 코스',
        description: course?.summary ?? '이모추! AI가 만든 주말 나들이 코스를 확인해보세요!',
        images: image ? [{ url: image }] : undefined,
      },
    };
  } catch {
    return { title: '코스 보기' };
  }
}

export default async function CourseSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CourseResult slug={slug} />;
}
