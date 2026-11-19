import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore } from "@/lib/auth/authStore";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const { fetchSermonsMock, fetchSermonMock, getTagsMock } = vi.hoisted(() => ({
  fetchSermonsMock: vi.fn(),
  fetchSermonMock: vi.fn(),
  getTagsMock: vi.fn(),
}));
vi.mock("@/lib/api/sermons", () => ({ fetchSermons: fetchSermonsMock, fetchSermon: fetchSermonMock }));
vi.mock("@/lib/api/tags", () => ({ getTags: getTagsMock }));

import { useSermons, useSermon, useSermonTags } from "./queries";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  fetchSermonsMock.mockReset();
  fetchSermonMock.mockReset();
  getTagsMock.mockReset();
});

describe("useSermons", () => {
  it("fetchSermons 결과를 반환하고 params를 전달한다", async () => {
    fetchSermonsMock.mockResolvedValue({ content: [{ id: 1 }], page: { size: 12, number: 0, totalElements: 1, totalPages: 1 } });
    const { result } = renderHook(() => useSermons({ page: 0, tagId: 2 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSermonsMock).toHaveBeenCalledWith({ page: 0, tagId: 2 });
    expect(result.current.data?.content[0].id).toBe(1);
  });
});

describe("useSermon", () => {
  it("fetchSermon(id) 결과를 반환한다", async () => {
    fetchSermonMock.mockResolvedValue({ id: 9, title: "Z", tags: [], preachedAt: "2026-07-19", viewCount: 0, version: 0 });
    const { result } = renderHook(() => useSermon(9), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSermonMock).toHaveBeenCalledWith(9);
    expect(result.current.data?.id).toBe(9);
  });
});

describe("useSermonTags", () => {
  it("getTags(공개 fetch) 결과를 반환한다", async () => {
    getTagsMock.mockResolvedValue([{ id: 1, name: "주일" }]);
    const { result } = renderHook(() => useSermonTags(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("주일");
  });
});

// persist 복원 전 익명으로 한 번 받으면 교인 전용 글이 빠진 목록이 잠깐 보인다(게이트 없는 누구나 메뉴).
describe("persist 복원 대기", () => {
  afterEach(() => vi.restoreAllMocks());
  const page = { content: [], page: { size: 12, number: 0, totalElements: 0, totalPages: 0 } };

  it("persist 복원 전에는 설교 목록·상세를 요청하지 않는다", async () => {
    vi.spyOn(useAuthStore.persist, "hasHydrated").mockReturnValue(false);
    fetchSermonsMock.mockResolvedValue(page);
    const list = renderHook(() => useSermons({}), { wrapper });
    const one = renderHook(() => useSermon(1), { wrapper });
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchSermonsMock).not.toHaveBeenCalled();
    expect(fetchSermonMock).not.toHaveBeenCalled();
    expect(list.result.current.fetchStatus).toBe("idle");
    expect(one.result.current.fetchStatus).toBe("idle");
  });

  it("대조: 복원 뒤에는 요청한다", async () => {
    vi.spyOn(useAuthStore.persist, "hasHydrated").mockReturnValue(true);
    fetchSermonsMock.mockResolvedValue(page);
    const { result } = renderHook(() => useSermons({}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSermonsMock).toHaveBeenCalledTimes(1);
  });
});
