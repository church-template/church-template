import { beforeEach, describe, expect, it, vi } from "vitest";
import { getNotices } from "@/lib/api/notices";
import { getEvents } from "@/lib/api/events";

vi.mock("@/lib/api/notices", () => ({ getNotices: vi.fn() }));
vi.mock("@/lib/api/events", () => ({ getEvents: vi.fn() }));
const { getVisibilityMock } = vi.hoisted(() => ({ getVisibilityMock: vi.fn() }));
vi.mock("@/lib/api/visibility", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/visibility")>()),
  getVisibility: getVisibilityMock,
}));
import { GET } from "./route";

const allPublic = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "PUBLIC" } as const;
const pageOf = <T,>(content: T[]) => ({ content, page: { size: 50, number: 0, totalElements: content.length, totalPages: 1 } });

beforeEach(() => {
  vi.mocked(getNotices).mockReset().mockResolvedValue(
    pageOf([{ id: 7, title: "수련회 공지", isPinned: false, viewCount: 0, createdAt: "2026-08-01T10:00:00", tags: [] }]),
  );
  vi.mocked(getEvents).mockReset().mockResolvedValue(
    pageOf([{ id: 3, title: "성가대 연습", startAt: "2026-08-15T11:00:00", endAt: null, allDay: false, tags: [] }]),
  );
  getVisibilityMock.mockReset();
});

describe("GET /rss.xml", () => {
  it("공지가 교인만이면 피드에 공지 항목이 없고 공지를 조회하지 않는다(대조: 일정은 있다)", async () => {
    getVisibilityMock.mockResolvedValue({ ...allPublic, notices: "MEMBERS" });
    const xml = await (await GET()).text();
    expect(getNotices).not.toHaveBeenCalled();
    expect(xml).not.toContain("/notices/");
    expect(xml).toContain("https://www.example.com/events/3");
  });

  it("일정이 교인만이면 일정 항목이 없다(대조: 공지는 있다)", async () => {
    getVisibilityMock.mockResolvedValue({ ...allPublic, events: "MEMBERS" });
    const xml = await (await GET()).text();
    expect(getEvents).not.toHaveBeenCalled();
    expect(xml).not.toContain("/events/");
    expect(xml).toContain("https://www.example.com/notices/7");
  });

  it("설정을 못 읽으면 지금처럼 공지·일정 모두", async () => {
    getVisibilityMock.mockResolvedValue(null);
    const xml = await (await GET()).text();
    expect(xml).toContain("https://www.example.com/notices/7");
    expect(xml).toContain("https://www.example.com/events/3");
  });
});
