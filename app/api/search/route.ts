import { NextRequest, NextResponse } from 'next/server';
import { searchKeyword } from '@/lib/tour-api';

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('keyword');
  const contentTypeId = request.nextUrl.searchParams.get('contentTypeId');
  const areaCode = request.nextUrl.searchParams.get('areaCode');
  const numOfRows = request.nextUrl.searchParams.get('numOfRows');

  if (!keyword || keyword.trim().length < 1) {
    return NextResponse.json({ error: '검색어가 필요합니다.' }, { status: 400 });
  }

  try {
    const items = await searchKeyword({
      keyword: keyword.trim(),
      contentTypeId: contentTypeId ? Number(contentTypeId) : undefined,
      areaCode: areaCode ? Number(areaCode) : undefined,
      numOfRows: numOfRows ? Number(numOfRows) : 20,
    });

    const results = items.map(item => {
      const r = item as unknown as Record<string, unknown>;
      return {
        contentId: String(r.contentid ?? ''),
        title: String(r.title ?? ''),
        addr1: String(r.addr1 ?? ''),
        firstImage: String(r.firstimage ?? ''),
        contentTypeId: Number(r.contenttypeid ?? 0),
        cat2: String(r.cat2 ?? ''),
        mapX: Number(r.mapx ?? 0),
        mapY: Number(r.mapy ?? 0),
      };
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
