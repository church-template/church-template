// next/image가 최적화를 허용할 백엔드 미디어 주소 패턴.
// API 베이스에는 교회 접두사가 들어 있다(예: https://api.example.com/church/eunsaem — 백엔드 멀티테넌시).
// `new URL("/api/media/**", base)`처럼 절대경로로 조립하면 베이스의 경로(접두사)가 버려져
// 실제 이미지 주소(/church/<교회키>/api/media/…)와 맞지 않아 이미지가 차단된다. 그래서 베이스 뒤에 이어 붙인다.
// next.config.ts가 불러 쓰므로 경로 별칭(@/…)이나 다른 모듈에 의존하지 않는다.
export function mediaRemotePatterns(apiBase: string | undefined): URL[] {
  if (!apiBase) return []; // 베이스 미설정(CI 빌드) — src가 상대경로라 원격 패턴이 필요 없다
  return [new URL(`${apiBase.replace(/\/+$/, "")}/api/media/**`)];
}
