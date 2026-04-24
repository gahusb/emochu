import type { CourseStop } from './weekend-types';

export type Role = 'spot' | 'food' | 'cafe' | 'festival' | 'stay';

export interface RoleInfo {
  role: Role;
  colorVar: string;  // CSS 변수 참조 문자열 (ex: 'var(--color-role-food)')
  colorHex: string;  // 카카오맵 marker 주입용 헥사 상수
  label: string;     // 한국어 라벨
}

const ROLE_MAP: Record<Role, Omit<RoleInfo, 'role'>> = {
  spot:     { colorVar: 'var(--color-role-spot)',     colorHex: '#C5532D', label: '관광지' },
  food:     { colorVar: 'var(--color-role-food)',     colorHex: '#8B5E3C', label: '맛집' },
  cafe:     { colorVar: 'var(--color-role-cafe)',     colorHex: '#A8421F', label: '카페' },
  festival: { colorVar: 'var(--color-role-festival)', colorHex: '#B8860B', label: '축제' },
  stay:     { colorVar: 'var(--color-role-stay)',     colorHex: '#4A6B8A', label: '숙박' },
};

const CAFE_KEYWORDS = ['카페', 'coffee', '커피', 'Coffee', 'COFFEE'];

function isCafe(stop: Pick<CourseStop, 'title' | 'description'>): boolean {
  const text = `${stop.title ?? ''} ${stop.description ?? ''}`;
  return CAFE_KEYWORDS.some((kw) => text.includes(kw));
}

export function getRole(stop: Pick<CourseStop, 'contentTypeId' | 'isFestival' | 'isStay' | 'title' | 'description'>): Role {
  if (stop.isStay) return 'stay';
  if (stop.isFestival) return 'festival';
  if (stop.contentTypeId === '39') return isCafe(stop) ? 'cafe' : 'food';
  if (stop.contentTypeId === '12' || stop.contentTypeId === '14' || stop.contentTypeId === '28') return 'spot';
  return 'spot';  // fallback (contentTypeId 누락 포함)
}

export function getRoleInfo(stop: Pick<CourseStop, 'contentTypeId' | 'isFestival' | 'isStay' | 'title' | 'description'>): RoleInfo {
  const role = getRole(stop);
  return { role, ...ROLE_MAP[role] };
}

export function roleBgClass(role: Role): string {
  return `bg-role-${role}`;
}

export function roleLabel(role: Role): string {
  return ROLE_MAP[role].label;
}
