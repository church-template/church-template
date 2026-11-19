import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VisibilityResponse } from "@/lib/api/types";

const { getVisibilityMock } = vi.hoisted(() => ({ getVisibilityMock: vi.fn() }));
// 설정 조회만 바꾸고 폴백(resolveVisibility)은 실제 구현을 쓴다.
vi.mock("@/lib/api/visibility", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/visibility")>()),
  getVisibility: getVisibilityMock,
}));
import robots from "./robots";

const allPublic: VisibilityResponse = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "PUBLIC" };
async function disallowOf() {
  const res = await robots();
  const rules = Array.isArray(res.rules) ? res.rules[0] : res.rules;
  return { res, disallow: rules?.disallow ?? [] };
}

beforeEach(() => getVisibilityMock.mockReset());

describe("robots", () => {
  it("회원 전용 영역을 차단하고 sitemap을 가리킨다", async () => {
    getVisibilityMock.mockResolvedValue(null);
    const { res, disallow } = await disallowOf();
    for (const path of ["/mypage/", "/sermons", "/gallery", "/challenges", "/vehicle-runs"]) {
      expect(disallow).toContain(path);
    }
    expect(res.sitemap).toBe("https://www.example.com/sitemap.xml");
  });

  it("공지가 교인만이면 /notices를 막는다", async () => {
    getVisibilityMock.mockResolvedValue({ ...allPublic, notices: "MEMBERS" });
    const { disallow } = await disallowOf();
    expect(disallow).toContain("/notices");
    expect(disallow).not.toContain("/events"); // 대조: 누구나인 일정은 열린다
  });

  it("대조: 공지가 누구나면 /notices는 막지 않는다(/notices/new만)", async () => {
    getVisibilityMock.mockResolvedValue(allPublic);
    const { disallow } = await disallowOf();
    expect(disallow).not.toContain("/notices");
    expect(disallow).toContain("/notices/new");
  });

  it("일정·주보가 교인만이면 /events·/bulletins를 막는다", async () => {
    getVisibilityMock.mockResolvedValue({ ...allPublic, events: "MEMBERS", bulletins: "MEMBERS" });
    const { disallow } = await disallowOf();
    expect(disallow).toContain("/events");
    expect(disallow).toContain("/bulletins");
  });

  it("설교·갤러리는 누구나여도 계속 막는다", async () => {
    getVisibilityMock.mockResolvedValue(allPublic);
    const { disallow } = await disallowOf();
    expect(disallow).toContain("/sermons");
    expect(disallow).toContain("/gallery");
  });

  it("설정을 못 읽으면 지금과 같은 목록", async () => {
    getVisibilityMock.mockResolvedValue(null);
    const { disallow } = await disallowOf();
    expect(disallow).toEqual([
      "/mypage/", "/login", "/signup", "/agreements", "/showcase",
      "/notices/new", "/events/new", "/bulletins/new",
      "/sermons", "/gallery", "/challenges", "/vehicle-runs",
    ]);
  });
});
