// 관리 허브 진입 카드의 단일 정의. 공개 페이지 있는 도메인(inline)은 그 페이지로,
// 운영 도메인(manage)은 /mypage/manage/* 전용 화면으로 링크.
// category: 허브에서 테마별 섹션으로 묶어 가독성을 높인다(MANAGE_CATEGORIES 순서대로 렌더).
// desc·Icon: 이름만으로 찾기 어려워 "무엇을 하는 곳인지" 한 줄과 아이콘을 붙인다(고령 가독 — 읽기 전에 알아보게).
import {
  BadgeCheck, Bell, BookOpen, BookOpenCheck, Bus, Calendar, FileText, FolderOpen, Images, Inbox,
  MessageSquare, Network, Newspaper, ShieldCheck, Tag, Users, type LucideIcon,
} from "lucide-react";
import { hasPermission } from "@/lib/auth/permissions";
import type { MeResponse } from "@/lib/auth/types";

export type ManageCategory = "inbox" | "content" | "media" | "org" | "governance";

export interface ManageDomain {
  key: string;
  label: string;
  desc: string;
  Icon: LucideIcon;
  permission: string;
  href: string;
  kind: "inline" | "manage";
  category: ManageCategory;
}

export interface ManageCategoryDef {
  key: ManageCategory;
  label: string;
  Icon: LucideIcon;
}

// 카테고리 표시 순서·라벨. 보유 권한 카드가 0개인 카테고리는 허브에서 제목째 숨긴다.
export const MANAGE_CATEGORIES: ManageCategoryDef[] = [
  { key: "inbox", label: "접수", Icon: Inbox }, // 교회가 '받는' 것(문의·차량 탑승 신청) — 나머지 카테고리는 전부 '내보내는' 것이라 분리
  { key: "content", label: "콘텐츠", Icon: FileText }, // 교회가 게시하는 글(태그는 이들에 다형 연결)
  { key: "media", label: "미디어·업로드", Icon: Images }, // 파일 업로드 성격
  { key: "org", label: "조직", Icon: Network }, // 조직 구조
  { key: "governance", label: "회원·권한", Icon: ShieldCheck }, // 거버넌스(가장 민감)
];

export const MANAGE_DOMAINS: ManageDomain[] = [
  { key: "inquiries", label: "문의 관리", desc: "방문자가 남긴 문의를 확인하고 처리해요", Icon: MessageSquare, permission: "INQUIRY_MANAGE", href: "/mypage/manage/inquiries", kind: "manage", category: "inbox" },
  { key: "vehicle-runs", label: "차량운행 관리", desc: "운행일을 만들고 탑승 명단을 봐요", Icon: Bus, permission: "VEHICLE_MANAGE", href: "/mypage/manage/vehicle-runs", kind: "manage", category: "inbox" },
  { key: "sermons", label: "설교 관리", desc: "설교를 올리고 고쳐요", Icon: BookOpen, permission: "SERMON_WRITE", href: "/sermons", kind: "inline", category: "content" },
  { key: "notices", label: "공지 관리", desc: "공지를 쓰고 맨 위에 고정해요", Icon: Bell, permission: "NOTICE_WRITE", href: "/notices", kind: "inline", category: "content" },
  { key: "events", label: "일정 관리", desc: "교회 일정을 등록해요", Icon: Calendar, permission: "EVENT_WRITE", href: "/events", kind: "inline", category: "content" },
  { key: "gallery", label: "갤러리 관리", desc: "앨범을 만들고 사진을 올려요", Icon: Images, permission: "GALLERY_WRITE", href: "/gallery", kind: "inline", category: "media" },
  { key: "bulletins", label: "주보 관리", desc: "주보 PDF를 올려요", Icon: Newspaper, permission: "BULLETIN_WRITE", href: "/bulletins", kind: "inline", category: "media" },
  { key: "departments", label: "부서 관리", desc: "부서와 하위 부서를 정리해요", Icon: Network, permission: "DEPT_WRITE", href: "/mypage/manage/departments", kind: "manage", category: "org" },
  { key: "media", label: "미디어 관리", desc: "올린 사진·파일을 한곳에서 봐요", Icon: FolderOpen, permission: "MEDIA_MANAGE", href: "/mypage/manage/media", kind: "manage", category: "media" },
  { key: "tags", label: "태그 관리", desc: "글에 붙이는 분류 이름을 정리해요", Icon: Tag, permission: "TAG_MANAGE", href: "/mypage/manage/tags", kind: "manage", category: "content" },
  { key: "challenges", label: "통독 챌린지 관리", desc: "성경통독 챌린지를 열고 닫아요", Icon: BookOpenCheck, permission: "CHALLENGE_MANAGE", href: "/mypage/manage/challenges", kind: "manage", category: "content" },
  { key: "positions", label: "직분 관리", desc: "집사·권사 같은 직분 이름을 정해요", Icon: BadgeCheck, permission: "POSITION_MANAGE", href: "/mypage/manage/positions", kind: "manage", category: "org" },
  { key: "members", label: "회원 관리", desc: "가입 승인과 회원 정보를 관리해요", Icon: Users, permission: "MEMBER_MANAGE", href: "/mypage/manage/members", kind: "manage", category: "governance" },
  { key: "roles", label: "역할·권한 관리", desc: "누가 무엇을 관리할지 정해요", Icon: ShieldCheck, permission: "ROLE_MANAGE", href: "/mypage/manage/roles", kind: "manage", category: "governance" },
];

export interface ManageGroup {
  cat: ManageCategoryDef;
  domains: ManageDomain[];
}

// 보유 권한 기준 카테고리 묶음(빈 카테고리 제외). 허브 본문과 마이페이지 메뉴가 같은 결과를 써야
// 메뉴에만 있고 본문엔 없는 분류가 생기지 않는다.
export function visibleManageGroups(me: MeResponse | undefined): ManageGroup[] {
  return MANAGE_CATEGORIES.map((cat) => ({
    cat,
    domains: MANAGE_DOMAINS.filter((d) => d.category === cat.key && hasPermission(d.permission, me)),
  })).filter((g) => g.domains.length > 0);
}
