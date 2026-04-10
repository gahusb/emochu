import { NextRequest, NextResponse } from 'next/server';
import { detailImage } from '@/lib/tour-api';

export async function GET(request: NextRequest) {
  const contentId = request.nextUrl.searchParams.get('contentId');

  if (!contentId) {
    return NextResponse.json({ error: 'contentId가 필요합니다.' }, { status: 400 });
  }

  try {
    const items = await detailImage({ contentId });
    const images = items
      .map(item => item.originimgurl || item.smallimageurl)
      .filter(Boolean);

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
