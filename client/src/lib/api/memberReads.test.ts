import { describe, it, expect, vi, beforeEach } from "vitest";

const { authFetchMock } = vi.hoisted(() => ({ authFetchMock: vi.fn() }));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));

import { fetchNotices, fetchNotice, fetchEvents, fetchEvent, fetchBulletins, fetchBulletin } from "./memberReads";
import { ApiError } from "@/lib/auth/apiError";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
beforeEach(() => {
  authFetchMock.mockReset();
  authFetchMock.mockImplementation(async () => ok({ content: [] }));
});

// 교인만 메뉴의 공지·일정·주보는 토큰으로 읽어야 한다 — 서버 조회 함수와 같은 경로·쿼리를 authFetch로.
describe("memberReads", () => {
  it("목록은 서버 조회와 같은 쿼리 빌더로 authFetch한다", async () => {
    await fetchNotices({ page: 1, tagId: 3, q: "수련회" });
    await fetchEvents({ year: 2026, month: 6, tagId: 2 });
    await fetchBulletins({ page: 2 });
    expect(authFetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/notices?page=1&tagId=3&q=%EC%88%98%EB%A0%A8%ED%9A%8C",
      "/api/events?year=2026&month=6&size=200&tagId=2",
      "/api/bulletins?page=2",
    ]);
  });

  it("상세는 /api/<메뉴>/{id}", async () => {
    await fetchNotice(5);
    await fetchEvent(3);
    await fetchBulletin(7);
    expect(authFetchMock.mock.calls.map((c) => c[0])).toEqual(["/api/notices/5", "/api/events/3", "/api/bulletins/7"]);
  });

  it("401은 errorCode를 담은 ApiError로 던진다(화면이 로그인 안내로 가른다)", async () => {
    authFetchMock.mockResolvedValue(
      new Response(JSON.stringify({ errorCode: "INVALID_TOKEN" }), { status: 401 }),
    );
    const e = await fetchNotice(5).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).errorCode).toBe("INVALID_TOKEN");
  });
});
