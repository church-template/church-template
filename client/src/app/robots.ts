import type { MetadataRoute } from "next";
import { CHURCH_URL } from "@/constants/church";
import { getVisibility, membersOnlyListPaths, resolveVisibility } from "@/lib/api/visibility";

// /robots.txt 자동 생성. 비공개(회원·인증·신규작성·쇼케이스)와 회원 전용·비색인 도메인
// (챌린지·차량운행 = 회원 전용, 설교·갤러리 = 공개 범위 설정과 무관하게 검색 노출 불필요 — 스펙 6.3)을
// 크롤 차단하고 나머지는 허용한다.
// edit 페이지는 auth 게이팅이라 크롤러에 콘텐츠가 노출되지 않아 별도 차단하지 않는다.
// 공지·일정·주보는 교인만이면 막는다. 설정을 못 읽으면 지금 동작(열림)으로 둔다.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const membersOnly = membersOnlyListPaths(resolveVisibility(await getVisibility()));
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/mypage/",
        "/login",
        "/signup",
        "/agreements",
        "/showcase",
        "/notices/new",
        "/events/new",
        "/bulletins/new",
        // 설정과 무관하게 막는 도메인 — /sermons가 /sermons/new까지 포섭한다.
        "/sermons",
        "/gallery",
        "/challenges",
        "/vehicle-runs",
        ...membersOnly,
      ],
    },
    sitemap: `${CHURCH_URL}/sitemap.xml`,
  };
}
