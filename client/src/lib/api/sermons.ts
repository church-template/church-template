import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import type { Page } from "@/lib/page";
import type { SermonCardResponse, SermonDetailResponse } from "./types";

// 설교 조회는 공개 범위 설정을 따른다(교인만이면 SERMON_VIEW, 가이드 2.3) — 보는 사람에 따라 결과가 달라 authFetch를 쓰므로 클라이언트 전용 모듈.
// 서버 컴포넌트에서 import 금지(authFetch·authStore 체인이 서버 번들에 포함되어 오류).

// 설교 목록 필터(가이드 10장). 공유 buildListQuery는 q/preacher/series/from/to를 안 다루므로 전용 빌더.
export interface SermonListParams {
  page?: number;
  size?: number;
  sort?: string; // 미지정 시 백엔드 기본 preachedAt,desc
  tagId?: number;
  q?: string;
  preacher?: string;
  series?: string;
  from?: string; // yyyy-MM-dd
  to?: string;
  membersOnly?: boolean; // 관리자용 필터(쓰기 권한 없으면 백엔드가 무시)
}

export function buildSermonQuery(p: SermonListParams): string {
  const sp = new URLSearchParams();
  if (p.page != null) sp.set("page", String(p.page));
  if (p.size != null) sp.set("size", String(p.size));
  if (p.sort) sp.set("sort", p.sort);
  if (p.tagId != null) sp.set("tagId", String(p.tagId));
  if (p.q) sp.set("q", p.q);
  if (p.preacher) sp.set("preacher", p.preacher);
  if (p.series) sp.set("series", p.series);
  if (p.from) sp.set("from", p.from);
  if (p.to) sp.set("to", p.to);
  if (p.membersOnly != null) sp.set("membersOnly", String(p.membersOnly));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// 목록. 교인만 메뉴면 게이트(MemberGate) 통과 후, 누구나면 바로 TanStack Query에서 호출(토큰 없으면 헤더 없이).
export async function fetchSermons(
  p: SermonListParams = {},
): Promise<Page<SermonCardResponse>> {
  const res = await authFetch(`/api/sermons${buildSermonQuery(p)}`);
  return parseJson<Page<SermonCardResponse>>(res);
}

// 상세(교인만 설교·메뉴면 401/403). GET마다 조회수+1(부수효과). 404 특수 처리 없음 — 클라에서 에러 안내(갤러리 관례).
export async function fetchSermon(id: number): Promise<SermonDetailResponse> {
  const res = await authFetch(`/api/sermons/${id}`);
  return parseJson<SermonDetailResponse>(res);
}

// 어드민 쓰기(createSermon·updateSermon·patchSermon·deleteSermon + 타입)는 sermons.admin.ts에서 제공.
export type {
  SermonCreateRequest,
  SermonUpdateRequest,
  SermonPatchRequest,
} from "./sermons.admin";
