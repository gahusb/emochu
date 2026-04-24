// ============================================================
// GET /api/weekend/spot?contentId=xxx — 장소 상세 정보
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { detailCommon, detailIntro, detailImage, detailInfo } from '@/lib/tour-api';

export const runtime = 'nodejs';
export const revalidate = 3600; // 1시간 ISR — 전용 페이지 revalidate 설정과 일치

// 콘텐츠 타입별 detailIntro 주요 필드 매핑
const INTRO_FIELD_LABELS: Record<string, Record<string, string>> = {
  // 12: 관광지
  '12': {
    usetime: '이용시간',
    restdate: '쉬는날',
    infocenter: '문의처',
    parking: '주차',
    chkbabycarriage: '유모차',
    chkpet: '반려동물',
    expguide: '체험안내',
    expagerange: '체험연령',
  },
  // 14: 문화시설
  '14': {
    usetime: '이용시간',
    restdate: '쉬는날',
    usefee: '이용요금',
    infocenter: '문의처',
    parking: '주차',
    parkingfee: '주차요금',
    chkbabycarriage: '유모차',
    chkpet: '반려동물',
  },
  // 15: 행사/축제
  '15': {
    eventstartdate: '시작일',
    eventenddate: '종료일',
    playtime: '공연시간',
    usetimefestival: '이용요금',
    eventplace: '행사장소',
    sponsor1: '주최',
    sponsor1tel: '주최 연락처',
    subevent: '부대행사',
    program: '프로그램',
    agelimit: '관람연령',
    bookingplace: '예매처',
    placeinfo: '행사장 안내',
    spendtimefestival: '관람 소요시간',
    festivalgrade: '축제등급',
  },
  // 28: 레포츠
  '28': {
    openperiod: '개장기간',
    usetime: '이용시간',
    restdate: '쉬는날',
    usefee: '이용요금',
    infocenter: '문의처',
    parking: '주차',
    reservation: '예약',
    expagerange: '체험연령',
  },
  // 39: 음식점
  '39': {
    opentimefood: '영업시간',
    restdatefood: '쉬는날',
    firstmenu: '대표메뉴',
    treatmenu: '취급메뉴',
    packing: '포장',
    infocenterfood: '문의처',
    parkingfood: '주차',
    reservationfood: '예약',
    kidsfacility: '키즈시설',
    smoking: '금연/흡연',
    seat: '좌석수',
  },
};

export async function GET(request: NextRequest) {
  const contentId = request.nextUrl.searchParams.get('contentId');
  if (!contentId) {
    return NextResponse.json({ error: 'contentId 필수' }, { status: 400 });
  }

  try {
    // 공통 상세 + 소개 상세 + 이미지 병렬 조회
    const [common, images] = await Promise.all([
      detailCommon({ contentId }),
      detailImage({ contentId }),
    ]);

    if (!common) {
      return NextResponse.json({ error: '장소 정보를 찾을 수 없어요' }, { status: 404 });
    }

    // detailIntro는 contenttypeid가 필요
    let introFields: { label: string; value: string }[] = [];
    const ctId = common.contenttypeid;

    try {
      const intro = await detailIntro({
        contentId,
        contentTypeId: Number(ctId),
      });

      if (intro) {
        const fieldMap = INTRO_FIELD_LABELS[ctId] ?? INTRO_FIELD_LABELS['12'];
        for (const [key, label] of Object.entries(fieldMap)) {
          const val = intro[key];
          if (val && val.trim() && val.trim() !== '0') {
            // HTML 태그 제거
            let clean = val.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
            if (!clean) continue;

            // YYYYMMDD 날짜 → YYYY.MM.DD 포맷
            if (/^\d{8}$/.test(clean)) {
              clean = `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}`;
            }

            // [항목명] 패턴 앞에 줄바꿈 (예: "[주간 해상관광투어] 09:00~18:00")
            clean = clean.replace(/(?<=\S)\s*(\[[^\]]+\])/g, '\n$1');

            // "※ " 앞에 줄바꿈
            clean = clean.replace(/(?<=\S)\s*※/g, '\n※');

            // "- 항목1- 항목2" → 줄바꿈으로 분리 (요금 정보 등)
            clean = clean.replace(/(?<=\S)\s*- /g, '\n- ');

            // "● " 또는 "○ " 앞에 줄바꿈
            clean = clean.replace(/(?<=\S)\s*([●○])/g, '\n$1');

            // 연속 줄바꿈 정리
            clean = clean.replace(/\n{3,}/g, '\n\n').trim();

            introFields.push({ label, value: clean });
          }
        }
      }
    } catch {
      // detailIntro 실패해도 common 정보는 반환
    }

    // detailInfo (반복 정보 — 세부 코스, 객실 등)
    let subInfoItems: { name: string; overview: string; image?: string }[] = [];
    try {
      const infoItems = await detailInfo({
        contentId,
        contentTypeId: Number(ctId),
      });
      if (infoItems && infoItems.length > 0) {
        subInfoItems = infoItems
          .filter(item => item.subname || item.subdetailoverview)
          .map(item => ({
            name: (item.subname ?? '').replace(/<[^>]*>/g, '').trim(),
            overview: (item.subdetailoverview ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim(),
            image: item.subdetailimg || undefined,
          }))
          .filter(item => item.name || item.overview);
      }
    } catch {
      // detailInfo 실패해도 무시
    }

    // overview HTML 태그 정리
    const overview = (common.overview ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/(?<=\S)\s*(\[[^\]]+\])/g, '\n$1')
      .replace(/(?<=\S)\s*※/g, '\n※')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // homepage URL 추출
    let homepage = '';
    if (common.homepage) {
      const match = common.homepage.match(/href="([^"]+)"/);
      homepage = match ? match[1] : common.homepage.replace(/<[^>]*>/g, '').trim();
    }

    return NextResponse.json({
      contentId: common.contentid,
      contentTypeId: ctId,
      title: common.title,
      addr: [common.addr1, common.addr2].filter(Boolean).join(' '),
      tel: common.tel ?? '',
      homepage,
      overview,
      mainImage: common.firstimage ?? '',
      images: images.map(img => ({
        url: img.originimgurl,
        thumbnail: img.smallimageurl,
        name: img.imgname,
      })),
      lat: Number(common.mapy),
      lng: Number(common.mapx),
      introFields,
      subInfo: subInfoItems,
    });
  } catch (err) {
    console.error('[이모추] 장소 상세 조회 실패:', err);
    return NextResponse.json({ error: '상세 정보 조회에 실패했어요' }, { status: 500 });
  }
}
