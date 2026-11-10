// 설교 목록 문구 — 교회마다 같은 문구라 공용 상수로 둔다(하드코딩 금지, 가이드 12장).
export const SERMON_LIST = {
  featuredRecent: "이번 주 말씀", // 최근 7일 안의 설교
  featuredLatest: "최근 말씀", // 그보다 오래된 최신 설교 — "이번 주"라고 부르지 않는다
  featuredCta: "말씀 보기",
  loadError: "설교를 불러오지 못했습니다.",
  retry: "다시 시도",
  empty: "조건에 맞는 설교가 없습니다.",
} as const;
