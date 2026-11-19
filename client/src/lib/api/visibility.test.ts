import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getVisibility,
  resolveVisibility,
  throwIfMembersOnly,
  isMembersOnlyError,
  MembersOnlyError,
  loadPublic,
} from "./visibility";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const levels = { notices: "MEMBERS", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "MEMBERS" };
const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe("getVisibility", () => {
  it("설정을 visibility 태그·60초로 읽는다", async () => {
    const fetchMock = vi.fn(async () => res(200, levels));
    vi.stubGlobal("fetch", fetchMock);
    expect(await getVisibility()).toEqual(levels);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/visibility",
      expect.objectContaining({ next: { revalidate: 60, tags: ["visibility"] } }),
    );
  });

  // 백엔드가 응답 없이 멈추면 정적이던 페이지가 같이 멈춘다 → 3초 뒤 끊고 지금 동작(null → 폴백)으로.
  it("3초 안에 응답이 없으면 요청을 끊고 null", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => {
      const c = new AbortController();
      setTimeout(() => c.abort(new DOMException("timed out", "TimeoutError")), 0); // 3초를 기다리지 않고 바로 만료
      return c.signal;
    });
    // 응답하지 않는 백엔드: signal이 끊을 때만 reject한다(실제 fetch와 같다).
    const hanging = vi.fn((...args: Parameters<typeof fetch>) => {
      const signal = args[1]?.signal;
      return new Promise<Response>((_, reject) => signal?.addEventListener("abort", () => reject(signal.reason)));
    });
    vi.stubGlobal("fetch", hanging);
    expect(await getVisibility()).toBeNull();
    expect(timeout).toHaveBeenCalledWith(3000);
  }, 1000);

  it("대조: 시간 안에 온 정상 응답은 그대로 읽는다(타임아웃 signal을 달아도)", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => res(200, levels));
    vi.stubGlobal("fetch", fetchMock);
    expect(await getVisibility()).toEqual(levels);
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("조회가 실패하면 null(500·네트워크 오류·모르는 값·칸 누락)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => res(500, {})));
    expect(await getVisibility()).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    expect(await getVisibility()).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => res(200, { ...levels, sermons: "FRIENDS" })));
    expect(await getVisibility()).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => res(200, { ...levels, gallery: undefined })));
    expect(await getVisibility()).toBeNull();
  });
});

describe("resolveVisibility", () => {
  it("설정을 못 읽으면 지금 동작(설교·갤러리 교인만, 나머지 누구나)", () => {
    expect(resolveVisibility(null)).toEqual({
      notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "MEMBERS", gallery: "MEMBERS",
    });
  });
  it("대조: 값이 있으면 받은 값 그대로", () => {
    const v = { notices: "MEMBERS", events: "MEMBERS", bulletins: "MEMBERS", sermons: "PUBLIC", gallery: "PUBLIC" } as const;
    expect(resolveVisibility(v)).toEqual(v);
  });
});

describe("throwIfMembersOnly", () => {
  it("INVALID_TOKEN·ACCESS_DENIED는 MembersOnlyError", async () => {
    await expect(throwIfMembersOnly(res(401, { errorCode: "INVALID_TOKEN" }))).rejects.toBeInstanceOf(MembersOnlyError);
    await expect(throwIfMembersOnly(res(403, { errorCode: "ACCESS_DENIED" }))).rejects.toBeInstanceOf(MembersOnlyError);
  });
  it("대조: RESOURCE_NOT_FOUND·INTERNAL_ERROR·본문 없음은 통과", async () => {
    await expect(throwIfMembersOnly(res(404, { errorCode: "RESOURCE_NOT_FOUND" }))).resolves.toBeUndefined();
    await expect(throwIfMembersOnly(res(500, { errorCode: "INTERNAL_ERROR" }))).resolves.toBeUndefined();
    await expect(throwIfMembersOnly(new Response("oops", { status: 502 }))).resolves.toBeUndefined();
  });
  it("isMembersOnlyError는 MembersOnlyError만 true", () => {
    expect(isMembersOnlyError(new MembersOnlyError("x"))).toBe(true);
    expect(isMembersOnlyError(new Error("x"))).toBe(false);
    expect(isMembersOnlyError(null)).toBe(false);
  });
});

// 공지·일정·주보 페이지의 분기 — 교인만이면 서버가 읽지 않고, 낡은 설정의 401/403도 게이트 경로로(6.6-12).
describe("loadPublic", () => {
  it("메뉴가 교인만이면 조회하지 않고 null", async () => {
    const load = vi.fn(async () => 1);
    expect(await loadPublic("MEMBERS", load)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });
  it("누구나인데 조회가 교인 전용 신호(MembersOnlyError)면 null", async () => {
    expect(await loadPublic("PUBLIC", async () => { throw new MembersOnlyError("x"); })).toBeNull();
  });
  it("대조: 누구나 + 일반 오류는 그대로 던진다", async () => {
    await expect(loadPublic("PUBLIC", async () => { throw new Error("500"); })).rejects.toThrow("500");
  });
  it("대조: 누구나 + 성공이면 결과를 data에 담는다(404의 null도 게이트 경로와 구분)", async () => {
    expect(await loadPublic("PUBLIC", async () => ({ id: 1 }))).toEqual({ data: { id: 1 } });
    expect(await loadPublic("PUBLIC", async () => null)).toEqual({ data: null });
  });
});
