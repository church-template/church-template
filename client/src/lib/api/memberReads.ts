import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { buildListQuery, type Page } from "@/lib/page";
import { buildNoticeQuery, type NoticeListParams } from "./notices";
import { buildEventQuery, type EventListParams } from "./events";
import type { BulletinListParams } from "./bulletins";
import type {
  BulletinCardResponse,
  BulletinDetailResponse,
  EventCardResponse,
  EventDetailResponse,
  NoticeCardResponse,
  NoticeDetailResponse,
} from "./types";

// 교인만 메뉴의 공지·일정·주보 브라우저 조회(토큰 필요 → authFetch). 클라이언트 전용 —
// 서버 컴포넌트에서 import 금지(authFetch·authStore 체인이 서버 번들에 들어간다, notices.ts 주석과 같은 이유).
// 경로·쿼리는 서버 조회 함수와 같은 빌더를 쓴다(두 경로가 다른 목록을 보이지 않게).

export async function fetchNotices(p: NoticeListParams): Promise<Page<NoticeCardResponse>> {
  return parseJson(await authFetch(`/api/notices${buildNoticeQuery(p)}`));
}
export async function fetchNotice(id: number): Promise<NoticeDetailResponse> {
  return parseJson(await authFetch(`/api/notices/${id}`));
}
export async function fetchEvents(p: EventListParams): Promise<Page<EventCardResponse>> {
  return parseJson(await authFetch(`/api/events${buildEventQuery(p)}`));
}
export async function fetchEvent(id: number): Promise<EventDetailResponse> {
  return parseJson(await authFetch(`/api/events/${id}`));
}
export async function fetchBulletins(p: BulletinListParams): Promise<Page<BulletinCardResponse>> {
  return parseJson(await authFetch(`/api/bulletins${buildListQuery(p)}`));
}
export async function fetchBulletin(id: number): Promise<BulletinDetailResponse> {
  return parseJson(await authFetch(`/api/bulletins/${id}`));
}
