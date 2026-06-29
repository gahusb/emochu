import { describe, it, expect } from 'vitest';
import { getRole, getRoleInfo, roleLabel } from '@/lib/course-role';

const base = { isFestival: false, isStay: false, title: '', description: '' } as any;

describe('getRole', () => {
  it('숙박/축제가 contentTypeId보다 우선', () => {
    expect(getRole({ ...base, isStay: true, contentTypeId: '39' })).toBe('stay');
    expect(getRole({ ...base, isFestival: true, contentTypeId: '12' })).toBe('festival');
  });

  it('음식점(39) → 카페 키워드 분기', () => {
    expect(getRole({ ...base, contentTypeId: '39', title: '스타벅스 카페' })).toBe('cafe');
    expect(getRole({ ...base, contentTypeId: '39', title: '할매 국밥집' })).toBe('food');
  });

  it('관광지/문화/레포츠 → spot', () => {
    expect(getRole({ ...base, contentTypeId: '12' })).toBe('spot');
    expect(getRole({ ...base, contentTypeId: '14' })).toBe('spot');
    expect(getRole({ ...base, contentTypeId: '28' })).toBe('spot');
  });

  it('미지정 contentTypeId → spot 폴백', () => {
    expect(getRole({ ...base })).toBe('spot');
  });
});

describe('getRoleInfo / roleLabel', () => {
  it('role 메타·라벨', () => {
    expect(getRoleInfo({ ...base, isStay: true }).label).toBe('숙박');
    expect(getRoleInfo({ ...base, contentTypeId: '12' }).role).toBe('spot');
    expect(roleLabel('food')).toBe('맛집');
    expect(roleLabel('festival')).toBe('축제');
  });
});
