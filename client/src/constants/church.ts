// 교회 고유값·콘텐츠 상수.
// "환경"이 아니라 "교회"마다 다를 뿐이라 env가 아니라 상수로 둔다(매직스트링 방지).
// 컴포넌트는 이 상수를 import해서 쓴다 — 문자열 인라인 금지(가이드 12장).
import type { HeroMedia } from "@/hero/types";

export const CHURCH_NAME = "예시교회";
// 정식 명칭 — 저작권·약관 등 공식 표기용. 헤더·푸터 로고는 약칭 CHURCH_NAME을 쓴다.
export const CHURCH_NAME_FULL = "예시교단 예시교회";
// 교회 공식 도메인. 실제 배포의 정본 호스트와 일치해야 한다.
export const CHURCH_DOMAIN = "www.example.com";

// 사이트 정본 URL — metadataBase·robots·sitemap·JSON-LD가 공유하는 절대 URL의 단일 출처.
export const CHURCH_URL = `https://${CHURCH_DOMAIN}`;

// 검색결과·소셜 공유(OG)에 노출되는 대표 소개문. 위치·핵심 콘텐츠 키워드를 담아 지역 SEO를 돕는다.
export const CHURCH_DESCRIPTION =
  "서울특별시 중구에 위치한 예시교회입니다. 예배 시간, 설교 말씀, 교회 소식과 오시는 길을 안내합니다.";

// 교회 로고 이미지 — 소개 히어로 등에서 소비. 교회별 자산이라 상수로 둔다.
// alt는 약칭 CHURCH_NAME 기준(DESIGN.md: 로고 표기는 약칭 사용).
export const CHURCH_LOGO = {
  src: "/onlyLogo.png",
  alt: `${CHURCH_NAME} 로고`,
} as const;

// 히어로 배경 — 정적 에셋(a안). public/ 에 파일을 두고 경로로 참조한다.
// (백엔드 미디어 서빙은 Range 미지원이라 영상 스트리밍에 부적합 — 백엔드 답변 E, 가이드 13.3)
export const HERO: HeroMedia = {
  type: "video",
  src: "/hero.mp4",
  poster: "/hero-poster.jpeg",
};

// 중앙 카드(축소 후 포스터가 굳는 자리)의 비율 = 포스터 원본 비율. 콜라주 레이아웃의 입력이라
// 상수로 둔다 — 이 값이 원본과 다르면 중앙 카드에서 포스터가 잘린다. hero-poster.jpeg: 1920×1456.
export const HERO_POSTER_ASPECT = 1920 / 1456;

// 풀스크린 후 등장 카피 — 줄 단위 배열이라 "\n" 이스케이프가 필요 없다.
export const HERO_CAPTION = [
  "함께 예배하고 함께 자라는 교회",
  "예시교회에 오신 것을 환영합니다",
];

// 홈 "이렇게 모이고, 나눕니다" 장면 — 사진 한 장 = 목록 한 줄(제목·설명). 큰 사진 무대에 object-fit으로
// 채우므로 비율은 필요 없다. 사진이 장식이고 제목·설명이 같은 내용을 텍스트로 전하므로 alt는 비운다.
// 제목·설명은 예시 문구 — 교회별로 교체.
export interface CollageScene {
  src: string;
  title: string;
  desc: string;
}
export const COLLAGE_TILES: CollageScene[] = [
  { src: "/collage-1.jpeg", title: "함께 드리는 기도", desc: "하루를 말씀과 기도로 여는 시간" },
  { src: "/collage-2.jpeg", title: "함께 드리는 예배", desc: "온 세대가 한자리에 모이는 주일" },
  { src: "/collage-3.jpeg", title: "예배 후 쉼터", desc: "차 한 잔 나누며 이야기하는 시간" },
  { src: "/collage-4.jpeg", title: "한 식탁의 교제", desc: "예배 후 함께 먹는 점심" },
];

// 교회 소재지·연락처 — 푸터·오시는 길에서 소비. 교회별 값이라 상수(env 아님, 스펙 D2).
// 주소 세분화 — JSON-LD PostalAddress(addressRegion·addressLocality) 매핑용(지역 검색 신호).
// CHURCH_ADDRESS는 세 조각의 조합이라 값의 단일 출처가 유지된다.
export const CHURCH_ADDRESS_REGION = "서울특별시";
export const CHURCH_ADDRESS_LOCALITY = "중구";
export const CHURCH_ADDRESS_STREET = "예시로 123";
export const CHURCH_ADDRESS = `${CHURCH_ADDRESS_REGION} ${CHURCH_ADDRESS_LOCALITY} ${CHURCH_ADDRESS_STREET}`;

// 교회 좌표 — 스마트플레이스·구글 비즈니스 등록 시 확인해 채운다(docs/seo-operations.md 4장).
// null이면 JSON-LD geo를 출력하지 않는다.
export const CHURCH_GEO: { latitude: number; longitude: number } | null = null;
export const CHURCH_PHONE = "02-000-0000";
// 교회 대표 이메일 — 도메인 메일이 아니라 실제 사용 중인 주소라 리터럴로 둔다.
export const CHURCH_EMAIL = "contact@example.com";

// 설교 등록 폼의 설교자 기본값 — 설교자가 바뀌는 일이 드물어 미리 채운다(#109).
// 교회 교체 시 이 값만 바꾸면 되고, 빈 문자열이면 기본값 없음과 동일하게 동작한다.
export const SERMON_DEFAULT_PREACHER = "김은혜 목사님";

// 오시는 길 지도 임베드 URL(카카오/네이버 등). 비어 있으면 외부 지도 링크로 폴백(라이브러리 미사용).
// 오시는 길 지도 임베드 URL(카카오/네이버 등). 비어 있으면 외부 지도 링크로 폴백(라이브러리 미사용).
export const MAP_EMBED_SRC = "";

// 임베드 미설정 시 외부 지도 폴백 — 교회/배포처가 지도 제공자를 바꿀 수 있게 상수로 노출.
export const mapSearchUrl = (address: string) =>
  `https://map.kakao.com/?q=${encodeURIComponent(address)}`;

// 네이버지도 폴백 — 카카오와 함께 외부 지도 선택지로 제공(둘 다 주소 검색).
export const naverMapSearchUrl = (address: string) =>
  `https://map.naver.com/p/search/${encodeURIComponent(address)}`;
