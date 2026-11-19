// src/lib/api/bulletins.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);
vi.mock("@/lib/auth/apiBase", () => ({ apiUrl: (p: string) => `http://test${p}` }));

import { getBulletins, getBulletin } from "./bulletins";
import { isMembersOnlyError } from "./visibility";

afterEach(() => vi.clearAllMocks());

describe("bulletins public", () => {
  it("getBulletins는 bulletins 태그로 캐시한다", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ content: [], page: {} }) });
    await getBulletins({ page: 0 });
    const init = fetchMock.mock.calls[0][1];
    expect(init.next.tags).toEqual(["bulletins"]);
  });

  it("getBulletin은 no-store로 최신 version을 읽는다", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 1, version: 4 }) });
    const b = await getBulletin(1);
    const init = fetchMock.mock.calls[0][1];
    expect(init.cache).toBe("no-store");
    expect(b.version).toBe(4);
  });
});

const errRes = (status: number, errorCode: string) => new Response(JSON.stringify({ errorCode }), { status });
describe("주보 서버 조회의 교인 전용 신호", () => {
  it("getBulletins가 401 INVALID_TOKEN을 받으면 MembersOnlyError를 던진다", async () => {
    fetchMock.mockResolvedValue(errRes(401, "INVALID_TOKEN"));
    const e = await getBulletins({}).catch((x: unknown) => x);
    expect(isMembersOnlyError(e)).toBe(true);
  });
  it("getBulletin이 403 ACCESS_DENIED를 받으면 MembersOnlyError를 던진다", async () => {
    fetchMock.mockResolvedValue(errRes(403, "ACCESS_DENIED"));
    const e = await getBulletin(1).catch((x: unknown) => x);
    expect(isMembersOnlyError(e)).toBe(true);
  });
  it("대조: 500이면 일반 Error", async () => {
    fetchMock.mockResolvedValue(errRes(500, "INTERNAL_ERROR"));
    const e = await getBulletins({}).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(Error);
    expect(isMembersOnlyError(e)).toBe(false);
  });
});
