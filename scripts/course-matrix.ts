import type { CourseRequest, Duration, AccessibilityNeed } from '@/lib/weekend-types';

export type MatrixCase = CourseRequest & { caseId: string; label: string; theme: boolean };
export const MATRIX_VERSION = '2026-09-09-v2'; // 조건마다 AI 첫 시도 1회, 전체 3회. 기존 v1은 예비 실측.
// 개인 위치가 아닌 합성 요청의 고정 출발 중심점. 울릉도는 이미 입도한 상황이며 배편은 평가하지 않는다.
const regions = [
  { id: 'seoul', name: '서울', lat: 37.5665, lng: 126.978, destinationType: 'city' as const, cityAreaCode: 1 },
  { id: 'gangneung', name: '강릉', lat: 37.7519, lng: 128.8761, destinationType: 'city' as const, cityAreaCode: 32 },
  { id: 'ulleung', name: '울릉도 도동항 인근', lat: 37.4845, lng: 130.9057, destinationType: 'nearby' as const },
];
const durations: Duration[] = ['half_day', 'full_day', 'leisurely', 'overnight'];
const needs: Record<Duration, AccessibilityNeed[]> = { half_day: ['mobility'], full_day: ['mobility', 'infant'], leisurely: ['visual', 'hearing'], overnight: ['infant'] };

export const COURSE_MATRIX: MatrixCase[] = durations.flatMap(duration => [false, true].flatMap(family => regions.map(region => ({
  caseId: `${region.id}-${duration}-${family ? 'family' : 'general'}`,
  label: `${region.name}·${duration}·${family ? '가족·접근성·테마' : '일반·테마 없음'}`,
  lat: region.lat, lng: region.lng, destinationType: region.destinationType,
  cityAreaCode: 'cityAreaCode' in region ? region.cityAreaCode : undefined,
  duration, visitDay: duration === 'overnight' || !family ? 'sat' : 'sun',
  companion: family ? 'family' : duration === 'half_day' ? 'solo' : duration === 'full_day' ? 'friends' : 'couple',
  feeling: !family && duration === 'full_day' ? 'excited' : 'healing',
  preferences: family ? ['nature', 'food'] : ['culture', 'food'],
  accessibility: family ? needs[duration] : undefined,
  theme: family,
}))));

export function matrixBatch(batch: number): MatrixCase[] {
  if (!Number.isInteger(batch) || batch < 1 || batch > 8) throw new Error('MATRIX_BATCH_INVALID');
  return COURSE_MATRIX.slice((batch - 1) * 3, batch * 3);
}
