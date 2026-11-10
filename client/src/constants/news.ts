// 교회소식(공지·주보) 목록 문구 — 교회마다 같은 문구라 공용 상수(하드코딩 금지, 가이드 12장).
export const NEWS_LIST = {
  noticeTitle: "공지",
  noticeEmpty: "조건에 맞는 공지가 없습니다.",
  pinnedHeading: "고정 공지",
  bulletinTitle: "주보",
  bulletinEmpty: "등록된 주보가 없습니다.",
  bulletinFeaturedRecent: "이번 주 주보", // 예배일이 최근 7일 안
  bulletinFeaturedLatest: "최근 주보",
  bulletinCta: "주보 보기",
  pdfHint: "(새 탭에서 PDF 열림)",
} as const;
