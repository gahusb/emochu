import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 실측에 필요한 키만 프로세스 내부에서 읽는다. DB·로그인 키는 로드하지 않는다.
export function loadLiveEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(file);
    if (!existsSync(path)) continue;
    const source = readFileSync(path, 'utf8');
    for (const name of ['TOUR_API_KEY', 'WEATHER_API_KEY', 'GEMINI_API_KEY']) {
      if (process.env[name]) continue;
      const value = source.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
      if (value) process.env[name] = value;
    }
  }
}

export function scrubLiveOutput(value) {
  let result = String(value);
  for (const name of ['TOUR_API_KEY', 'WEATHER_API_KEY', 'GEMINI_API_KEY']) {
    const key = process.env[name];
    if (!key) continue;
    const variants = new Set([key, encodeURIComponent(key)]);
    try { variants.add(decodeURIComponent(key)); } catch { /* 원문만 사용 */ }
    for (const variant of variants) if (variant.length >= 8) result = result.replaceAll(variant, '<KEY>');
  }
  return result.replace(/(serviceKey|key)=([^&\s"']+)/gi, '$1=<KEY>');
}
