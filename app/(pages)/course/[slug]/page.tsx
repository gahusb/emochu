import CourseResult from '@/app/components/CourseResult';

export const metadata = {
  title: '나의 코스',
};

export default async function CourseSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CourseResult slug={slug} />;
}
