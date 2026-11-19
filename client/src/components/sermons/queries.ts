"use client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useHasHydrated } from "@/lib/auth/authStore";
import { getTags } from "@/lib/api/tags";
import { fetchSermons, fetchSermon, type SermonListParams } from "@/lib/api/sermons";

// 메뉴가 누구나면 게이트 없이 마운트된다 — persist 복원 전에 익명으로 받으면 교인 전용 글이 빠진 목록이
// 잠깐 보이므로 복원 뒤에만 조회한다(enabled).
// retry:false — 401 refresh·재시도는 authFetch가 처리(이중 재시도 방지).
export function useSermons(params: SermonListParams) {
  const hydrated = useHasHydrated();
  return useQuery({
    queryKey: ["sermons", params],
    queryFn: () => fetchSermons(params),
    placeholderData: keepPreviousData,
    retry: false,
    enabled: hydrated,
  });
}

export function useSermon(id: number) {
  const hydrated = useHasHydrated();
  return useQuery({
    queryKey: ["sermon", id],
    queryFn: () => fetchSermon(id),
    retry: false,
    enabled: hydrated,
  });
}

// /api/tags는 공개(가이드 2.3·6.1) — 기존 getTags(plain fetch) 재사용(토큰 미부착). TagFilter용.
export function useSermonTags() {
  return useQuery({ queryKey: ["tags"], queryFn: getTags, retry: false });
}
