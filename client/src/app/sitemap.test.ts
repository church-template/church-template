import { beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";
import { getNotices } from "@/lib/api/notices";
import { getEvents } from "@/lib/api/events";

vi.mock("@/lib/api/notices", () => ({ getNotices: vi.fn() }));
vi.mock("@/lib/api/events", () => ({ getEvents: vi.fn() }));
const { getVisibilityMock } = vi.hoisted(() => ({ getVisibilityMock: vi.fn() }));
vi.mock("@/lib/api/visibility", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/visibility")>()),
  getVisibility: getVisibilityMock,
}));
const allPublic = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "PUBLIC" } as const;
const notice = { id: 7, title: "공지", isPinned: false, viewCount: 0, createdAt: "2026-08-01T10:00:00", tags: [] };
const event = { id: 3, title: "행사", startAt: "2026-08-15T11:00:00", endAt: null, allDay: false, tags: [] };
const pageOf = <T,>(content: T[]) => ({ content, page: { size: 100, number: 0, totalElements: content.length, totalPages: 1 } });

describe("sitemap", () => {
  beforeEach(() => {
    vi.mocked(getNotices).mockReset();
    vi.mocked(getEvents).mockReset();
    getVisibilityMock.mockReset();
    getVisibilityMock.mockResolvedValue(null);
  });

  it("백엔드 실패 시 정적 엔트리만 반환한다 (CI 빌드 폴백)", async () => {
    vi.mocked(getNotices).mockRejectedValue(new Error("backend down"));
    vi.mocked(getEvents).mockRejectedValue(new Error("backend down"));
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://www.example.com/notices");
    expect(urls).toContain("https://www.example.com/bulletins");
    expect(urls.some((u) => u.includes("/sermons"))).toBe(false);
    expect(urls.some((u) => u.includes("/gallery"))).toBe(false);
    expect(urls.some((u) => u.includes("/challenges"))).toBe(false);
  });

  it("공지·행사 상세 URL을 포함하고 월 중복 행사는 1건만 넣는다", async () => {
    vi.mocked(getNotices).mockResolvedValue({
      content: [
        {
          id: 7,
          title: "공지",
          isPinned: false,
          viewCount: 0,
          createdAt: "2026-08-01T10:00:00",
          tags: [],
        },
      ],
      page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
    });
    // 모든 월 조회가 같은 행사를 반환해도(걸친 행사) URL은 1개여야 한다.
    vi.mocked(getEvents).mockResolvedValue({
      content: [
        {
          id: 3,
          title: "행사",
          startAt: "2026-08-15T11:00:00",
          endAt: null,
          allDay: false,
          tags: [],
        },
      ],
      page: { size: 200, number: 0, totalElements: 1, totalPages: 1 },
    });
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://www.example.com/notices/7");
    expect(
      urls.filter((u) => u === "https://www.example.com/events/3"),
    ).toHaveLength(1);
  });

  it("일정이 교인만이면 /events와 일정 상세가 없고 getEvents를 부르지 않는다", async () => {
    getVisibilityMock.mockResolvedValue({ ...allPublic, events: "MEMBERS" });
    vi.mocked(getNotices).mockResolvedValue(pageOf([notice]));
    vi.mocked(getEvents).mockResolvedValue(pageOf([event]));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).not.toContain("https://www.example.com/events");
    expect(urls.some((u) => u.includes("/events/"))).toBe(false);
    expect(getEvents).not.toHaveBeenCalled();
    // 대조: 공지는 누구나라 목록과 상세가 있다
    expect(urls).toContain("https://www.example.com/notices");
    expect(urls).toContain("https://www.example.com/notices/7");
  });

  it("공지가 교인만이면 /notices와 공지 상세가 없고 getNotices를 부르지 않는다(대조: 일정 상세는 있다)", async () => {
    getVisibilityMock.mockResolvedValue({ ...allPublic, notices: "MEMBERS" });
    vi.mocked(getNotices).mockResolvedValue(pageOf([notice]));
    vi.mocked(getEvents).mockResolvedValue(pageOf([event]));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.includes("/notices"))).toBe(false);
    expect(getNotices).not.toHaveBeenCalled();
    expect(urls).toContain("https://www.example.com/events/3");
  });

  it("주보가 교인만이면 /bulletins가 없다(대조: 누구나면 있다)", async () => {
    vi.mocked(getNotices).mockResolvedValue(pageOf([]));
    vi.mocked(getEvents).mockResolvedValue(pageOf([]));
    getVisibilityMock.mockResolvedValue({ ...allPublic, bulletins: "MEMBERS" });
    expect((await sitemap()).map((e) => e.url)).not.toContain("https://www.example.com/bulletins");
    getVisibilityMock.mockResolvedValue(allPublic);
    expect((await sitemap()).map((e) => e.url)).toContain("https://www.example.com/bulletins");
  });

  it("설교·갤러리는 누구나여도 넣지 않는다", async () => {
    getVisibilityMock.mockResolvedValue(allPublic);
    vi.mocked(getNotices).mockResolvedValue(pageOf([]));
    vi.mocked(getEvents).mockResolvedValue(pageOf([]));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.includes("/sermons") || u.includes("/gallery"))).toBe(false);
  });
});
