import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { fetchNotice } from "@/lib/api/memberReads";
import { useAuthStore } from "./authStore";
import { isContentQueryKey, isContentReadRequest, refetchContentOnFocus, subscribeContentReset } from "./contentQueries";
import type { LoginResponse } from "./types";

// 실제 QueryClient + 실제 useAuthStore(zustand mock 금지 관례).
const loginRes = {
  tokens: { accessToken: "a1", refreshToken: "r1" },
  member: null,
} as unknown as LoginResponse;
const page = { content: [{ id: 1 }], page: { size: 12, number: 0, totalElements: 1, totalPages: 1 } };

let qc: QueryClient;
beforeEach(() => {
  localStorage.clear();
  qc = new QueryClient();
});

describe("subscribeContentReset", () => {
  it("로그인하면 방문자 목록 캐시를 버린다", () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null });
    qc.setQueryData(["sermons", {}], page);
    const off = subscribeContentReset(qc);
    useAuthStore.getState().setSession(loginRes);
    expect(qc.getQueryData(["sermons", {}])).toBeUndefined();
    off();
  });

  it("로그아웃·강제 로그아웃 시 교인 목록 캐시를 지운다", () => {
    useAuthStore.setState({ accessToken: "a1", refreshToken: "r1" });
    qc.setQueryData(["albums", {}], page);
    const off = subscribeContentReset(qc);
    useAuthStore.getState().clear();
    expect(qc.getQueryData(["albums", {}])).toBeUndefined();

    useAuthStore.setState({ accessToken: "a2", refreshToken: "r2" });
    qc.setQueryData(["notice", 3], { id: 3 });
    useAuthStore.getState().forceLogout();
    expect(qc.getQueryData(["notice", 3])).toBeUndefined();
    off();
  });

  it("대조: refresh로 access 토큰만 바뀌면 캐시를 유지한다", () => {
    useAuthStore.setState({ accessToken: "old", refreshToken: "r1" });
    qc.setQueryData(["sermons", {}], page);
    const off = subscribeContentReset(qc);
    useAuthStore.getState().setAccessToken("new");
    expect(qc.getQueryData(["sermons", {}])).toEqual(page);
    off();
  });

  it("대조: 콘텐츠가 아닌 쿼리(['tags'], ['me'], ['admin','roles','list'])는 건드리지 않는다", () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null });
    qc.setQueryData(["tags"], [{ id: 1 }]);
    qc.setQueryData(["me"], { id: 1 });
    qc.setQueryData(["admin", "roles", "list"], [1]);
    qc.setQueryData(["event", 2], { id: 2 });
    const off = subscribeContentReset(qc);
    useAuthStore.getState().setSession(loginRes);
    expect(qc.getQueryData(["tags"])).toEqual([{ id: 1 }]);
    expect(qc.getQueryData(["me"])).toEqual({ id: 1 });
    expect(qc.getQueryData(["admin", "roles", "list"])).toEqual([1]);
    expect(qc.getQueryData(["event", 2])).toBeUndefined(); // 같은 변화에서 콘텐츠 쿼리는 지워진다
    off();
  });

  it("구독을 끊으면 더 지우지 않는다", () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null });
    qc.setQueryData(["bulletins", {}], page);
    subscribeContentReset(qc)();
    useAuthStore.getState().setSession(loginRes);
    expect(qc.getQueryData(["bulletins", {}])).toEqual(page);
  });
});

// 실제 QueryClient + 실제 authFetch(fetch만 스텁). 세션이 만료돼 강제 로그아웃되는 그 요청이 두 번 나가면
// 공지·설교 상세 조회수가 2 오른다 — authFetch의 익명 재요청 하나만 나가야 한다.
describe("subscribeContentReset × 강제 로그아웃", () => {
  afterEach(() => vi.unstubAllGlobals());
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  it("refresh 실패로 로그아웃되면 날아가던 상세 조회는 익명으로 딱 한 번 더 나간다", async () => {
    useAuthStore.setState({ accessToken: "old", refreshToken: "r1" });
    const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
      const auth = (init.headers as Record<string, string> | undefined)?.Authorization;
      if (String(url).endsWith("/api/auth/refresh")) return new Response(JSON.stringify({ errorCode: "INVALID_TOKEN" }), { status: 401 });
      return auth ? new Response(JSON.stringify({ errorCode: "INVALID_TOKEN" }), { status: 401 }) : ok({ id: 3 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const off = subscribeContentReset(qc);
    const obs = new QueryObserver(qc, { queryKey: ["notice", 3], queryFn: () => fetchNotice(3), retry: false });
    const unsub = obs.subscribe(() => {});
    await vi.waitFor(() => expect(obs.getCurrentResult().data).toEqual({ id: 3 }));
    await new Promise((r) => setTimeout(r, 0)); // 늦게 시작되는 재요청까지 기다린다
    const detailCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/api/notices/3"));
    expect(detailCalls).toHaveLength(2); // 토큰 실은 원요청 + 익명 재요청 1
    expect(useAuthStore.getState().accessToken).toBeNull();
    unsub();
    off();
  });

  it("대조: 로그아웃 순간 쉬고 있던(날아가지 않던) 콘텐츠 쿼리는 지우고 다시 받는다", async () => {
    useAuthStore.setState({ accessToken: "a1", refreshToken: "r1" });
    const fetchMock = vi.fn(async () => ok({ id: 3 }));
    vi.stubGlobal("fetch", fetchMock);
    const off = subscribeContentReset(qc);
    const obs = new QueryObserver(qc, { queryKey: ["notice", 3], queryFn: () => fetchNotice(3), retry: false });
    const unsub = obs.subscribe(() => {});
    await vi.waitFor(() => expect(obs.getCurrentResult().fetchStatus).toBe("idle"));
    useAuthStore.getState().clear();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect((fetchMock.mock.calls[1] as unknown[])[1]).not.toHaveProperty("headers.Authorization");
    unsub();
    off();
  });
});

describe("isContentQueryKey", () => {
  it("콘텐츠 루트만 true", () => {
    for (const k of ["sermons", "sermon", "albums", "album", "notices", "notice", "events", "event", "bulletins", "bulletin"]) {
      expect(isContentQueryKey([k, 1])).toBe(true);
    }
    expect(isContentQueryKey(["tags"])).toBe(false);
    expect(isContentQueryKey(["admin", "inquiries"])).toBe(false);
  });
});

describe("isContentReadRequest", () => {
  it("GET 콘텐츠 읽기만 true", () => {
    expect(isContentReadRequest("/api/gallery/albums/3")).toBe(true);
    expect(isContentReadRequest("/api/sermons?page=0", { method: "GET" })).toBe(true);
    expect(isContentReadRequest("/api/notices")).toBe(true);
    expect(isContentReadRequest("/api/events/5")).toBe(true);
    expect(isContentReadRequest("/api/bulletins")).toBe(true);
    expect(isContentReadRequest("/api/admin/gallery/albums/3", { method: "PATCH" })).toBe(false);
    expect(isContentReadRequest("/api/notices", { method: "POST" })).toBe(false);
    expect(isContentReadRequest("/api/members/me")).toBe(false);
    expect(isContentReadRequest("/api/noticesx")).toBe(false);
  });
});

// 서명 주소(1시간)가 담긴 콘텐츠 쿼리는 탭 복귀 때 50분이 넘었으면 다시 받는다. 시각은 고정해 판정한다.
describe("refetchContentOnFocus", () => {
  const NOW = new Date("2026-11-20T12:00:00+09:00").getTime();
  const MIN = 60_000;
  const q = (key: unknown[], ageMin: number) =>
    ({ queryKey: key, state: { dataUpdatedAt: NOW - ageMin * MIN } }) as unknown as Parameters<typeof refetchContentOnFocus>[0];
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("50분 넘은 콘텐츠 쿼리는 다시 받는다", () => {
    expect(refetchContentOnFocus(q(["notice", 5], 51))).toBe(true);
    expect(refetchContentOnFocus(q(["albums", {}], 120))).toBe(true);
  });
  it("대조: 50분 이내 콘텐츠 쿼리·오래된 비콘텐츠 쿼리는 그대로(탭 복귀 일괄 재요청 방지)", () => {
    expect(refetchContentOnFocus(q(["notice", 5], 49))).toBe(false);
    expect(refetchContentOnFocus(q(["me"], 120))).toBe(false);
  });
});
