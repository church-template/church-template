"use client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useHasHydrated } from "@/lib/auth/authStore";
import { fetchNotices, fetchNotice } from "@/lib/api/memberReads";
import type { NoticeListParams } from "@/lib/api/notices";

// 교인만 메뉴의 브라우저 조회(MemberGate 안). 키는 콘텐츠 쿼리 규약(목록 [복수, params]·상세 [단수, id]) —
// 로그인 상태가 바뀌면 subscribeContentReset이 함께 지운다. persist 복원 전엔 토큰이 없어 보이므로 복원 뒤에만 조회.
// retry:false — 401 refresh·재시도는 authFetch가 처리(이중 재시도 방지).
export function useNotices(params: NoticeListParams) {
  const hydrated = useHasHydrated();
  return useQuery({
    queryKey: ["notices", params],
    queryFn: () => fetchNotices(params),
    placeholderData: keepPreviousData,
    retry: false,
    enabled: hydrated,
  });
}

export function useNotice(id: number) {
  const hydrated = useHasHydrated();
  return useQuery({
    queryKey: ["notice", id],
    queryFn: () => fetchNotice(id),
    retry: false,
    enabled: hydrated,
  });
}
