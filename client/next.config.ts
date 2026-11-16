import type { NextConfig } from "next";
import { mediaRemotePatterns } from "./src/lib/mediaRemotePattern";

// 백엔드 미디어(<API 베이스>/api/media/**)만 next/image 최적화 허용. 패턴은 env에서 파생 —
// dev(localhost:8080)·prod(공용 API + 교회 접두사 /church/<교회키>) 모두 자동 대응, 교회 템플릿 재사용성 유지.
// API_BASE 미설정(CI 빌드)이면 src가 상대경로라 원격 패턴이 필요 없다.
const apiBase = process.env.NEXT_PUBLIC_API_BASE;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: mediaRemotePatterns(apiBase),
    // 미디어는 id 단위 불변(수정 API 없음, 교체=새 업로드·새 id) → 31일 캐시 안전.
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
