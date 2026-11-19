import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { buildListQuery, type Page } from "@/lib/page";
import type { GalleryAlbumCardResponse, GalleryAlbumDetailResponse } from "./types";

// 한 페이지 앨범 수(3열 × 4행). 컴포넌트 인라인 금지 — 모듈 상수.
export const GALLERY_PAGE_SIZE = 12;

export interface AlbumListParams {
  page?: number;
  tagId?: number;
  size?: number; // 생략 시 GALLERY_PAGE_SIZE
  membersOnly?: boolean; // 관리자용 필터(쓰기 권한 없으면 백엔드가 무시)
}

// 앨범 목록(교인만 메뉴면 GALLERY_VIEW, 누구나면 교인만 앨범만 빠진다). createdAt,desc 고정. 보는 사람에 따라 결과가 달라 authFetch.
export async function fetchAlbums(params: AlbumListParams): Promise<Page<GalleryAlbumCardResponse>> {
  const qs = buildListQuery({
    page: params.page,
    size: params.size ?? GALLERY_PAGE_SIZE,
    sort: "createdAt,desc",
    tagId: params.tagId,
  });
  // buildListQuery는 공용이라 건드리지 않고 이 칸만 뒤에 붙인다(qs는 page/size/sort가 있어 항상 "?…").
  const filter = params.membersOnly != null ? `&membersOnly=${params.membersOnly}` : "";
  const res = await authFetch(`/api/gallery/albums${qs}${filter}`);
  return parseJson<Page<GalleryAlbumCardResponse>>(res);
}

// 앨범 상세(교인만 앨범·메뉴면 401/403). 사진 목록 포함.
export async function fetchAlbum(id: number): Promise<GalleryAlbumDetailResponse> {
  const res = await authFetch(`/api/gallery/albums/${id}`);
  return parseJson<GalleryAlbumDetailResponse>(res);
}
