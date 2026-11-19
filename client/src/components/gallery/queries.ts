"use client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useHasHydrated } from "@/lib/auth/authStore";
import { getTags } from "@/lib/api/tags";
import { fetchAlbums, fetchAlbum, type AlbumListParams } from "@/lib/api/gallery";

// 메뉴가 누구나면 게이트 없이 마운트된다 — persist 복원 전에 익명으로 받으면 교인 전용 글이 빠진 목록이
// 잠깐 보이므로 복원 뒤에만 조회한다(enabled).
// retry:false — 401 refresh·재시도는 authFetch가 처리(이중 재시도 방지).
export function useAlbums(params: AlbumListParams) {
  const hydrated = useHasHydrated();
  return useQuery({
    queryKey: ["albums", params],
    queryFn: () => fetchAlbums(params),
    placeholderData: keepPreviousData,
    retry: false,
    enabled: hydrated,
  });
}

export function useAlbum(id: number) {
  const hydrated = useHasHydrated();
  return useQuery({
    queryKey: ["album", id],
    queryFn: () => fetchAlbum(id),
    retry: false,
    enabled: hydrated,
  });
}

// /api/tags는 공개(가이드 2.3·6.1) — 기존 getTags(plain fetch) 재사용(토큰 미부착). TagFilter용.
export function useGalleryTags() {
  return useQuery({ queryKey: ["tags"], queryFn: getTags, retry: false });
}
