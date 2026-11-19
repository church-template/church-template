import { josa } from "@/lib/josa";
import type { VisibilityLevel, VisibilityMenu, VisibilityResponse } from "@/lib/api/types";

// 메뉴별 공개 범위 — 화면에 보이는 말은 "누구나 / 교인만"만 쓴다(스펙 6.3 문구).

export interface VisibilityMenuDef {
  key: VisibilityMenu;
  label: string;
  viewPermission: string;
  writePermission: string;
  href: string;
  perItem: boolean; // 글마다 교인만으로 따로 정할 수 있는 메뉴(설교·갤러리)
}

export const VISIBILITY_MENUS: VisibilityMenuDef[] = [
  { key: "notices", label: "공지", viewPermission: "NOTICE_VIEW", writePermission: "NOTICE_WRITE", href: "/notices", perItem: false },
  { key: "events", label: "일정", viewPermission: "EVENT_VIEW", writePermission: "EVENT_WRITE", href: "/events", perItem: false },
  { key: "bulletins", label: "주보", viewPermission: "BULLETIN_VIEW", writePermission: "BULLETIN_WRITE", href: "/bulletins", perItem: false },
  { key: "sermons", label: "설교", viewPermission: "SERMON_VIEW", writePermission: "SERMON_WRITE", href: "/sermons", perItem: true },
  { key: "gallery", label: "갤러리", viewPermission: "GALLERY_VIEW", writePermission: "GALLERY_WRITE", href: "/gallery", perItem: true },
];

// 설정을 못 읽으면 "지금 동작"(6.6-12). 백엔드의 '행 누락 기본값'(설교 누구나)과 일부러 다르다 — 실패 시 닫힌 쪽.
export const VISIBILITY_FALLBACK: VisibilityResponse = {
  notices: "PUBLIC",
  events: "PUBLIC",
  bulletins: "PUBLIC",
  sermons: "MEMBERS",
  gallery: "MEMBERS",
};

// 공개 범위 설정 화면 주소(관리 허브·제목 줄 상태 표시 공용).
export const VISIBILITY_SETTINGS_PATH = "/mypage/manage/visibility";

const STATUS_CHANGE = "변경";
const VISIBILITY_STATUS = { PUBLIC: "누구나 공개", MEMBERS: "교인만 공개" } satisfies Record<VisibilityLevel, string>;

export const VISIBILITY_COPY = {
  levelLabel: { PUBLIC: "누구나", MEMBERS: "교인만" } satisfies Record<VisibilityLevel, string>,
  statusLabel: VISIBILITY_STATUS,
  statusChange: STATUS_CHANGE,
  // 제목 줄 상태 표시 글자 — "교인만 공개 · 변경"
  statusLink: (level: VisibilityLevel) => `${VISIBILITY_STATUS[level]} · ${STATUS_CHANGE}`,
  perItemHint: "글마다 교인만으로 따로 정할 수 있어요",
  menuAllMembers: "지금은 전체가 교인 전용입니다",
  badge: "교인만",
  // 글 단위 버튼 글자 = 지금 상태(누르면 반대로 바뀐다). 동작은 그 뒤 숨긴 글자(toggleActionText)가 말한다.
  toggleMembersOnly: "교인만",
  togglePublic: "누구나 공개",
  toastMembers: "교인만 볼 수 있게 바꿨습니다.",
  toastPublic: "누구나 볼 수 있게 바꿨습니다.",
  sermonCheckbox: "이 설교는 교인만 보기",
  albumCheckbox: "이 앨범은 교인만 보기",
  deptLinked: "부서 소개에 쓰이는 앨범이라 누구나 볼 수 있습니다. 교인만 보게 하려면 부서 연결을 먼저 끊어 주세요.",
  deptOptionSuffix: " (교인만 — 부서에 연결할 수 없어요)",
  settingsTitle: "공개 범위",
  settingsLead: "메뉴마다 누가 볼 수 있는지 정합니다.",
  saved: "저장했습니다.",
  confirmTitle: "누구나 볼 수 있게 바꿀까요?",
  confirmOk: "바꾸기",
  cancel: "취소",
  save: "저장",
  hubLabel: "공개 범위",
  hubDesc: "메뉴마다 누구나 볼지 교인만 볼지 정해요",
  settingsLoading: "불러오는 중…",
  settingsLoadError: "공개 범위를 불러오지 못했습니다.",
} as const;

// 교인 전용 안내(MemberGate·조회 401/403 공용). 조사는 메뉴 이름 받침에 맞춘다(6.6-18 "일정는" 방지).
export const MEMBER_ACCESS_COPY = {
  loginTitle: "로그인 후 이용 가능합니다",
  loginBody: (label: string) => `${josa(label, "은는")} 교인 전용입니다. 로그인해 주세요.`,
  loginAction: "로그인",
  approvalTitle: "교인 승인 후 이용 가능합니다",
  approvalBody: (label: string) => `${label} 열람은 교인 승인 후 가능합니다. 교회로 문의해 주세요.`,
  retryBody: "잠시 후 다시 시도해 주세요.",
  retry: "다시 시도",
} as const;

const ITEM_WORD = { sermon: "설교", album: "앨범" } as const;

// 글 단위 버튼의 숨긴 동작 글자(sr-only) — 보이는 글자(지금 상태) 뒤에 이어 읽힌다.
// aria-label로 덮지 않는 이유: 접근 이름이 보이는 글자로 시작해야 음성 제어로 부를 수 있다(WCAG 2.5.3).
export function toggleActionText(kind: "sermon" | "album", title: string, toMembersOnly: boolean): string {
  return `, ${title} ${josa(ITEM_WORD[kind], "을를")} ${toMembersOnly ? "교인만" : "누구나"} 보도록 바꾸기`;
}

// 확인창 숫자의 단위(설교 = 편, 앨범 = 개)
const COUNT_UNIT: Partial<Record<VisibilityMenu, { noun: string; unit: string }>> = {
  sermons: { noun: "설교", unit: "편" },
  gallery: { noun: "앨범", unit: "개" },
};

// 누구나로 여는 메뉴의 확인 문장(스펙 4B). 숫자는 글 단위 표시가 있는 메뉴에서, 글을 쓰는 사람이 받은 경우에만(백엔드가 그 외 요청의 필터를 무시).
export function openConfirmMessage(menu: VisibilityMenu, counts?: { total: number; membersOnly: number }): string {
  const label = VISIBILITY_MENUS.find((m) => m.key === menu)?.label ?? menu;
  const head = `${josa(label, "을를")} 누구나 볼 수 있게 바꿉니다.`;
  const unit = COUNT_UNIT[menu];
  if (!unit) return `${head} 로그인하지 않은 사람에게도 보입니다.`;
  if (!counts) return `${head} 교인만으로 표시한 ${josa(unit.noun, "은는")} 계속 교인만 봅니다.`;
  const n = (x: number) => `${x}${unit.unit}`;
  const open = counts.total - counts.membersOnly;
  return `${head} ${unit.noun} ${n(counts.total)} 중 ${josa(n(counts.membersOnly), "은는")} 교인만 보고, ${josa(n(open), "은는")} 로그인하지 않은 사람에게도 보입니다.`;
}
