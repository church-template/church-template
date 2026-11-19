import { describe, it, expect, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, act } from "@testing-library/react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth/authStore";
import type { LoginResponse } from "@/lib/auth/types";
import { refetchContentOnFocus } from "@/lib/auth/contentQueries";
import { Providers } from "./providers";

// 배선 확인(스펙 6.6-10): 앱의 QueryClient가 로그인 상태 변화에 콘텐츠 캐시를 비우는지.
// 초기화 규칙 자체는 contentQueries.test가 본다.
const captured: { qc?: QueryClient } = {};
function Probe() {
  const client = useQueryClient();
  useEffect(() => {
    captured.qc = client;
  }, [client]);
  return null;
}
const loginRes = { tokens: { accessToken: "a1", refreshToken: "r1" }, member: null } as unknown as LoginResponse;

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ accessToken: null, refreshToken: null });
});

describe("Providers", () => {
  it("로그인하면 방문자로 받은 콘텐츠 캐시를 비운다(대조: 콘텐츠가 아닌 ['tags']는 남는다)", () => {
    render(<Providers><Probe /></Providers>);
    act(() => {
      captured.qc!.setQueryData(["sermons", {}], { content: [] });
      captured.qc!.setQueryData(["tags"], [{ id: 1 }]);
    });
    act(() => useAuthStore.getState().setSession(loginRes));
    expect(captured.qc!.getQueryData(["sermons", {}])).toBeUndefined();
    expect(captured.qc!.getQueryData(["tags"])).toEqual([{ id: 1 }]);
  });

  it("탭 복귀 재요청은 콘텐츠 쿼리의 서명 주소 만료 판정에 맡긴다", () => {
    render(<Providers><Probe /></Providers>);
    expect(captured.qc!.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(refetchContentOnFocus);
  });
});
