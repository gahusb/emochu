import CourseResultShell from '@/app/components/course/result/CourseResultShell';
import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const baseUrl = getSiteUrl();
    const res = await fetch(`${baseUrl}/api/course/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const course = data.course;
    // 🔴 openGraph.images 를 여기서 지정하지 않는다.
    //    지정하면 같은 폴더의 opengraph-image.tsx(코스 카드)를 덮어쓴다.
    //    예전엔 첫 장소 사진 한 장을 썼는데, 사진 한 장으로는 「코스」가 안 보인다.
    return {
      title: course?.title ?? '코스 보기',
      description: course?.summary ?? '이모추! AI가 만든 주말 나들이 코스',
      openGraph: {
        title: course?.title ?? '이모추! 코스',
        description: course?.summary ?? '이모추! AI가 만든 주말 나들이 코스를 확인해보세요!',
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
  return <CourseResultShell slug={slug} />;
}
