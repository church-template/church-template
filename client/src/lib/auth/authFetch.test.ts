import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { authFetch } from "./authFetch";
import { useAuthStore } from "./authStore";

// 보호 endpoint는 Bearer가 "old"면 401 INVALID_TOKEN, 그 외엔 200을 돌려주는 mock.
function makeFetchMock(opts: {
  protectedErrorCode?: string; // 401 본문 errorCode (기본 INVALID_TOKEN)
  refreshOk?: boolean; // refresh 200 여부 (기본 true)
}) {
  const { protectedErrorCode = "INVALID_TOKEN", refreshOk = true } = opts;
  return vi.fn(async (url: string, init: RequestInit = {}) => {
    if (String(url).endsWith("/api/auth/refresh")) {
      return refreshOk
        ? new Response(JSON.stringify({ tokens: { accessToken: "new", refreshToken: "r1" } }), { status: 200 })
        : new Response(JSON.stringify({ errorCode: "INVALID_TOKEN" }), { status: 401 });
    }
    const auth = (init.headers as Record<string, string>)?.Authorization;
    if (auth === "Bearer old") {
      return new Response(JSON.stringify({ errorCode: protectedErrorCode }), { status: 401 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
}

beforeEach(() => {
  localStorage.clear(); // persist 영속이 테스트 간 누수되지 않게 격리
  useAuthStore.setState({ accessToken: "old", refreshToken: "r1", member: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authFetch", () => {
  it("검수1: 동시 401 N개가 refresh를 1회만 호출한다", async () => {
    const fetchMock = makeFetchMock({});
    vi.stubGlobal("fetch", fetchMock);

    const results = await Promise.all([authFetch("/api/x"), authFetch("/api/y"), authFetch("/api/z")]);

    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/api/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
    results.forEach((r) => expect(r.status).toBe(200));
  });

  it("검수2: AUTHENTICATION_FAILED는 refresh하지 않고 원 응답을 반환한다", async () => {
    const fetchMock = makeFetchMock({ protectedErrorCode: "AUTHENTICATION_FAILED" });
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetch("/api/x");

    expect(res.status).toBe(401);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith("/api/auth/refresh"))).toBe(false);
  });

  it("검수3: refresh 성공 시 원요청을 새 access로 재시도한다", async () => {
    const fetchMock = makeFetchMock({});
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetch("/api/x");

    expect(res.status).toBe(200);
    // 마지막 보호요청 재시도는 Bearer new로 나갔다.
    const retry = fetchMock.mock.calls.find(
      (c) => String(c[0]).endsWith("/api/x") && (c[1]?.headers as Record<string, string>)?.Authorization === "Bearer new",
    );
    expect(retry).toBeDefined();
    expect(useAuthStore.getState().accessToken).toBe("new");
  });

  it("검수4: refresh 실패 시 forceLogout 후 원 401 Response를 반환한다(throw 아님)", async () => {
    const fetchMock = makeFetchMock({ refreshOk: false });
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetch("/api/x");

    expect(res.status).toBe(401);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it("엣지: refreshToken이 없으면 refresh를 시도하지 않고 forceLogout한다", async () => {
    useAuthStore.setState({ accessToken: "old", refreshToken: null, member: null });
    const fetchMock = makeFetchMock({});
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetch("/api/x");

    expect(res.status).toBe(401);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith("/api/auth/refresh"))).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});

// ── 공개 범위(#198): 빈 Bearer 금지 · 만료 세션 익명 재요청 · 콘텐츠 읽기 403 1회 갱신 ──
type Route = (auth: string | undefined, url: string) => Response;
function routeMock(handle: Route, refreshOk = true) {
  return vi.fn(async (url: string, init: RequestInit = {}) => {
    if (String(url).endsWith("/api/auth/refresh")) {
      return refreshOk
        ? new Response(JSON.stringify({ tokens: { accessToken: "new", refreshToken: "r1" } }), { status: 200 })
        : new Response(JSON.stringify({ errorCode: "INVALID_TOKEN" }), { status: 401 });
    }
    return handle((init.headers as Record<string, string> | undefined)?.Authorization, String(url));
  });
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const headersOf = (call: unknown[]) => ((call[1] as RequestInit | undefined)?.headers ?? {}) as Record<string, string>;
const callsTo = (m: ReturnType<typeof routeMock>, p: string) => m.mock.calls.filter((c) => String(c[0]).includes(p));
const refreshCalls = (m: ReturnType<typeof routeMock>) => callsTo(m, "/api/auth/refresh").length;
// 만료 토큰("old")은 401 INVALID_TOKEN, 토큰 없음은 공개 목록 200
const expiredOld: Route = (auth) =>
  auth === "Bearer old" ? json(401, { errorCode: "INVALID_TOKEN" }) : json(200, { content: [{ id: 1 }] });

describe("authFetch — 공개 범위", () => {
  it("토큰이 없으면 Authorization 헤더를 보내지 않는다", async () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null });
    const m = routeMock(() => json(200, {}));
    vi.stubGlobal("fetch", m);
    await authFetch("/api/sermons");
    expect(headersOf(m.mock.calls[0])).not.toHaveProperty("Authorization");
  });

  it("대조: 토큰이 있으면 Bearer <토큰>을 보낸다", async () => {
    const m = routeMock(() => json(200, {}));
    vi.stubGlobal("fetch", m);
    await authFetch("/api/sermons");
    expect(headersOf(m.mock.calls[0]).Authorization).toBe("Bearer old");
  });

  it("refresh 실패 시 콘텐츠 목록은 Authorization 없이 한 번 더 요청해 공개 목록을 돌려준다", async () => {
    const m = routeMock(expiredOld, false);
    vi.stubGlobal("fetch", m);
    const res = await authFetch("/api/sermons?page=0");
    expect(res.status).toBe(200);
    const list = callsTo(m, "/api/sermons");
    expect(list).toHaveLength(2);
    expect(headersOf(list[1])).not.toHaveProperty("Authorization");
    expect(useAuthStore.getState().accessToken).toBeNull(); // forceLogout은 그대로 수행
  });

  it("refresh 토큰이 없을 때도 콘텐츠 읽기는 익명으로 한 번 더 요청한다", async () => {
    useAuthStore.setState({ accessToken: "old", refreshToken: null });
    const m = routeMock(expiredOld);
    vi.stubGlobal("fetch", m);
    const res = await authFetch("/api/gallery/albums/3");
    expect(res.status).toBe(200);
    expect(refreshCalls(m)).toBe(0);
    expect(headersOf(callsTo(m, "/api/gallery/albums/3")[1])).not.toHaveProperty("Authorization");
  });

  it("대조: refresh 실패여도 쓰기(POST /api/admin/sermons)는 익명 재요청 없이 원래 401", async () => {
    const m = routeMock(expiredOld, false);
    vi.stubGlobal("fetch", m);
    const res = await authFetch("/api/admin/sermons", { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
    expect(callsTo(m, "/api/admin/sermons")).toHaveLength(1);
  });

  it("대조: 콘텐츠 경로라도 GET이 아니면 익명 재요청하지 않는다", async () => {
    const m = routeMock(expiredOld, false);
    vi.stubGlobal("fetch", m);
    const res = await authFetch("/api/notices", { method: "POST" });
    expect(res.status).toBe(401);
    expect(callsTo(m, "/api/notices")).toHaveLength(1);
  });

  it("대조: 토큰 없이 받은 401(교인만 메뉴)은 재요청하지 않는다", async () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null });
    const m = routeMock(() => json(401, { errorCode: "INVALID_TOKEN" }));
    vi.stubGlobal("fetch", m);
    const res = await authFetch("/api/notices");
    expect(res.status).toBe(401);
    expect(m.mock.calls).toHaveLength(1);
  });

  // 403 갱신은 토큰마다 한 번이라(모듈 상태) 테스트마다 다른 토큰으로 시작한다.
  it("콘텐츠 읽기 403은 한 번 갱신 후 새 토큰으로 재요청한다", async () => {
    useAuthStore.setState({ accessToken: "t403-retry", refreshToken: "r1" });
    const m = routeMock((auth) => (auth === "Bearer new" ? json(200, {}) : json(403, { errorCode: "ACCESS_DENIED" })));
    vi.stubGlobal("fetch", m);
    expect((await authFetch("/api/notices")).status).toBe(200);
    expect(refreshCalls(m)).toBe(1);
    expect(headersOf(callsTo(m, "/api/notices")[1]).Authorization).toBe("Bearer new");
  });

  it("재요청도 403이면 그대로 돌려주고 더 갱신하지 않는다", async () => {
    useAuthStore.setState({ accessToken: "t403-again", refreshToken: "r1" });
    const m = routeMock(() => json(403, { errorCode: "ACCESS_DENIED" }));
    vi.stubGlobal("fetch", m);
    const res = await authFetch("/api/notices");
    expect(res.status).toBe(403);
    expect(refreshCalls(m)).toBe(1);
    expect(callsTo(m, "/api/notices")).toHaveLength(2);
  });

  it("콘텐츠 읽기 403에서 갱신이 실패하면 익명으로 한 번 더 요청한다", async () => {
    useAuthStore.setState({ accessToken: "t403-fail", refreshToken: "r1" });
    const m = routeMock((auth) => (auth ? json(403, { errorCode: "ACCESS_DENIED" }) : json(200, {})), false);
    vi.stubGlobal("fetch", m);
    const res = await authFetch("/api/events");
    expect(res.status).toBe(200);
    expect(headersOf(callsTo(m, "/api/events")[1])).not.toHaveProperty("Authorization");
  });

  // 권한이 정말 없는 교인이면 403마다 refresh가 나간다 → 같은 토큰(갱신해 받은 토큰 포함)으로는 한 번만.
  it("같은 토큰으로 403이 이어지면 갱신은 한 번만", async () => {
    useAuthStore.setState({ accessToken: "t403-same", refreshToken: "r1" });
    const m = routeMock(() => json(403, { errorCode: "ACCESS_DENIED" }));
    vi.stubGlobal("fetch", m);
    await authFetch("/api/notices"); // 갱신 1회 → 토큰 "new", 재요청도 403
    await authFetch("/api/notices"); // 갱신해 받은 토큰 "new"로 또 403 → 갱신 없음
    useAuthStore.setState({ accessToken: "t403-same" }); // 처음 토큰으로 다시(늦게 온 동시 요청과 같은 경우)
    await authFetch("/api/notices");
    expect(refreshCalls(m)).toBe(1);
  });

  it("동시에 같은 토큰으로 받은 403 둘은 갱신 1회를 나눠 쓰고 둘 다 새 토큰으로 재요청한다", async () => {
    useAuthStore.setState({ accessToken: "t403-pair", refreshToken: "r1" });
    const m = routeMock((auth) => (auth === "Bearer new" ? json(200, {}) : json(403, { errorCode: "ACCESS_DENIED" })));
    vi.stubGlobal("fetch", m);
    const [a, b] = await Promise.all([authFetch("/api/notices"), authFetch("/api/events")]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(refreshCalls(m)).toBe(1);
  });

  it("대조: 다른 토큰의 403은 다시 갱신해 본다", async () => {
    useAuthStore.setState({ accessToken: "t403-first", refreshToken: "r1" });
    const m = routeMock(() => json(403, { errorCode: "ACCESS_DENIED" }));
    vi.stubGlobal("fetch", m);
    await authFetch("/api/notices");
    useAuthStore.setState({ accessToken: "t403-second" }); // 다시 로그인 등으로 토큰이 바뀜
    await authFetch("/api/notices");
    expect(refreshCalls(m)).toBe(2);
  });

  // 로그아웃 순간 날아가던 콘텐츠 읽기는 reset이 건너뛴다(contentQueries) — 그 응답이 교인용이면 버리고 익명으로 다시.
  it("토큰을 실어 보낸 콘텐츠 읽기가 끝나기 전에 로그아웃되면 응답을 버리고 익명으로 한 번 더 받는다", async () => {
    useAuthStore.setState({ accessToken: "t-out", refreshToken: "r1" });
    const m = routeMock((auth) => {
      if (auth) useAuthStore.getState().clear(); // 응답이 오기 전에 사용자가 로그아웃
      return json(200, { who: auth ? "member" : "anon" });
    });
    vi.stubGlobal("fetch", m);
    const res = await authFetch("/api/sermons");
    expect(await res.json()).toEqual({ who: "anon" });
    expect(callsTo(m, "/api/sermons")).toHaveLength(2);
  });

  it("대조: 로그인 상태가 그대로면 교인용 응답을 그대로 돌려준다(재요청 없음)", async () => {
    useAuthStore.setState({ accessToken: "t-stay", refreshToken: "r1" });
    const m = routeMock((auth) => json(200, { who: auth ? "member" : "anon" }));
    vi.stubGlobal("fetch", m);
    const res = await authFetch("/api/sermons");
    expect(await res.json()).toEqual({ who: "member" });
    expect(callsTo(m, "/api/sermons")).toHaveLength(1);
  });

  it("대조: 콘텐츠가 아닌 경로의 403은 갱신하지 않는다(/api/admin/roles)", async () => {
    const m = routeMock(() => json(403, { errorCode: "ACCESS_DENIED" }));
    vi.stubGlobal("fetch", m);
    const res = await authFetch("/api/admin/roles");
    expect(res.status).toBe(403);
    expect(refreshCalls(m)).toBe(0);
  });
});
