"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { refetchContentOnFocus, subscribeContentReset } from "@/lib/auth/contentQueries";

// QueryClient는 1회 생성(리렌더·SSR 안전). 회원 영역 TanStack Query 전용.
// 기본값 보정: 탭 복귀 시 회원 쿼리 일괄 재요청(refetch storm) 방지 + 인증 흐름은 재시도 무의미.
// staleTime 60s로 짧은 캐시를 두되, 변경 후에는 onSuccess의 invalidateQueries로 즉시 갱신한다.
// 예외: 서명 주소(1시간)가 담긴 콘텐츠 쿼리는 50분이 넘었으면 탭 복귀 때 다시 받는다(refetchContentOnFocus).
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: refetchContentOnFocus, retry: false },
        },
      }),
  );
  // 로그인 상태가 바뀌는 순간 콘텐츠 쿼리를 한곳에서 초기화(로그인·로그아웃 호출부를 고치지 않는다).
  useEffect(() => subscribeContentReset(queryClient), [queryClient]);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
