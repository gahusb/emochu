// Kakao SDK는 공식 타입 패키지가 없어 window 전역에 느슨하게 선언한다 (단일 출처).
// 산재해 있던 `(window as any).Kakao` / `(window as any).kakao` 캐스트를 대체.
export {};

declare global {
  interface Window {
    Kakao?: any; // 카카오 JS SDK (공유: Kakao.Share.sendDefault 등)
    kakao?: any; // 카카오 지도 SDK (kakao.maps.*)
  }
}
