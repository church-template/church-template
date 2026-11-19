import { describe, it, expect, vi, afterEach } from "vitest";
import { buildNoticeQuery, getNotices, getNotice } from "./notices";
import { isMembersOnlyError } from "./visibility";

afterEach(() => vi.unstubAllGlobals());

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

describe("buildNoticeQuery", () => {
  it("빈 파라미터는 빈 문자열", () => {
    expect(buildNoticeQuery({})).toBe("");
  });
  it("지정 필드만 직렬화(코드 순서, undefined 생략)", () => {
    expect(buildNoticeQuery({ page: 0, tagId: 3, q: "수련회" })).toBe(
      "?page=0&tagId=3&q=%EC%88%98%EB%A0%A8%ED%9A%8C",
    );
  });
  it("sort의 콤마는 인코딩된다", () => {
    expect(buildNoticeQuery({ sort: "createdAt,desc" })).toBe(
      "?sort=createdAt%2Cdesc",
    );
  });
});

describe("getNotices", () => {
  it("'/api/notices'+쿼리를 revalidate 60으로 호출", async () => {
    const spy = vi.fn(async () => okResponse({ content: [], page: {} }));
    vi.stubGlobal("fetch", spy);
    await getNotices({ tagId: 3 });
    expect(spy).toHaveBeenCalledWith("/api/notices?tagId=3", {
      next: { revalidate: 60, tags: ["notices"] },
    });
  });
  it("비 200이면 throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(getNotices({})).rejects.toThrow("GET /api/notices 실패: 500");
  });
});

describe("getNotice", () => {
  it("'/api/notices/{id}'를 no-store로 호출", async () => {
    const spy = vi.fn(async () => okResponse({ id: 5 }));
    vi.stubGlobal("fetch", spy);
    await getNotice(5);
    expect(spy).toHaveBeenCalledWith("/api/notices/5", { cache: "no-store" });
  });
  it("404는 null 반환", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as Response));
    expect(await getNotice(99)).toBeNull();
  });
  it("그 외 에러는 throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 }) as Response));
    await expect(getNotice(5)).rejects.toThrow("GET /api/notices/5 실패: 503");
  });
});

// 설정 캐시가 낡은 동안 백엔드가 교인 전용 신호(401/403)를 주면 오류 화면이 아니라 게이트로 넘긴다(6.6-12).
const errRes = (status: number, errorCode: string) => new Response(JSON.stringify({ errorCode }), { status });
describe("공지 서버 조회의 교인 전용 신호", () => {
  it("getNotices가 401 INVALID_TOKEN을 받으면 MembersOnlyError를 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => errRes(401, "INVALID_TOKEN")));
    const e = await getNotices({}).catch((x: unknown) => x);
    expect(isMembersOnlyError(e)).toBe(true);
  });
  it("getNotice가 403 ACCESS_DENIED를 받으면 MembersOnlyError를 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => errRes(403, "ACCESS_DENIED")));
    const e = await getNotice(5).catch((x: unknown) => x);
    expect(isMembersOnlyError(e)).toBe(true);
  });
  it("대조: 500이면 일반 Error(교인 전용 신호 아님)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => errRes(500, "INTERNAL_ERROR")));
    const e = await getNotices({}).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(Error);
    expect(isMembersOnlyError(e)).toBe(false);
  });
  it("대조: getNotice 404는 지금처럼 null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => errRes(404, "RESOURCE_NOT_FOUND")));
    expect(await getNotice(5)).toBeNull();
  });
});
