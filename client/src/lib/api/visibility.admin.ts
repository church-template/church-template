// 공개 범위 설정 화면 전용(클라이언트). 서버 컴포넌트는 visibility.ts의 getVisibility를 쓴다.
import { apiUrl } from "@/lib/auth/apiBase";
import { parseJson } from "@/lib/auth/apiError";
import { apiMutate } from "@/lib/admin/apiMutate";
import type { VisibilityResponse } from "./types";

// 설정 화면은 60초 캐시가 아닌 지금 값을 보여야 한다(저장 직후 다른 관리자가 바꾼 값 포함).
export async function fetchVisibility(): Promise<VisibilityResponse> {
  const res = await fetch(apiUrl("/api/visibility"), { cache: "no-store" });
  return parseJson<VisibilityResponse>(res);
}

// 5개 값을 한 번에 저장(마지막 저장이 이김 — 낙관락 없음, 스펙 7장).
export function updateVisibility(body: VisibilityResponse): Promise<VisibilityResponse> {
  return apiMutate<VisibilityResponse>("/api/admin/visibility", { method: "PUT", body });
}
