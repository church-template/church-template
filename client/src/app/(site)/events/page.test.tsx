import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { getEvents, getTags } = vi.hoisted(() => ({
  getEvents: vi.fn(),
  getTags: vi.fn(async () => [{ id: 3, name: "행사" }]),
}));
// 상태 표시(VISIBILITY_MANAGE 게이트)는 VisibilityStatusLink.test가 본다 — 여기선 페이지가 넘기는 값만.
vi.mock("@/components/visibility/VisibilityStatusLink", () => ({
  VisibilityStatusLink: ({ level }: { level: string | null }) => <div data-testid="status" data-level={String(level)} />,
}));
vi.mock("@/lib/api/events", () => ({ getEvents, EVENTS_PAGE_SIZE: 200 }));
vi.mock("@/lib/api/tags", () => ({ getTags }));
const { getVisibilityMock } = vi.hoisted(() => ({ getVisibilityMock: vi.fn() }));
vi.mock("@/lib/api/visibility", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/visibility")>()),
  getVisibility: getVisibilityMock,
}));
vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ permission, domainLabel, children }: { permission: string; domainLabel: string; children: React.ReactNode }) => (
    <div data-testid="gate" data-permission={permission} data-domain={domainLabel}>{children}</div>
  ),
}));
vi.mock("@/components/events/EventMemberViews", () => ({
  EventCalendarClient: ({ year, month, tagId }: { year: number; month: number; tagId?: number }) => (
    <div data-testid="client-calendar" data-ym={`${year}-${month}`} data-tag={String(tagId)} />
  ),
}));
// 캘린더 코어는 단위테스트가 커버 — 월 결정만 고정.
vi.mock("@/lib/calendar", () => ({
  resolveMonth: vi.fn(() => ({ year: 2026, month: 6 })),
  buildCalendarModel: vi.fn(() => ({ year: 2026, month: 6, today: { y: 2026, m: 6, d: 15 }, weeks: [], dayGroups: [] })),
  kstCivilFromDate: vi.fn(() => ({ y: 2026, m: 6, d: 15 })),
}));
vi.mock("@/components/common/TagFilter", () => ({
  TagFilter: ({ tags }: { tags: unknown[] }) => <div data-testid="tagfilter" data-count={tags.length} />,
}));
vi.mock("@/components/events/EventCalendar", () => ({
  EventCalendar: ({ tagId }: { tagId?: number }) => <div data-testid="calendar" data-tag={String(tagId)} />,
}));
// EventListAction은 useMe(useQuery)→QueryClient 의존이라 RSC 테스트 맥락에서 null-스텁(02 선례).
vi.mock("@/components/events/EventAdminActions", () => ({ EventListAction: () => null }));

import EventsPage, { generateMetadata } from "./page";
import { MembersOnlyError } from "@/lib/api/visibility";

afterEach(() => { vi.clearAllMocks(); getVisibilityMock.mockReset(); });
const emptyPage = { content: [], page: { size: 200, number: 0, totalElements: 0, totalPages: 0 } };

describe("EventsPage", () => {
  it("year·month·tagId를 size=200으로 getEvents에 전달, 태그 병렬", async () => {
    getEvents.mockResolvedValueOnce(emptyPage);
    render(await EventsPage({ searchParams: Promise.resolve({ year: "2026", month: "6", tagId: "3" }) }));
    expect(getEvents).toHaveBeenCalledWith({ year: 2026, month: 6, tagId: 3, size: 200 });
    expect(getTags).toHaveBeenCalled();
    expect(screen.getByTestId("tagfilter").getAttribute("data-count")).toBe("1");
    expect(screen.getByTestId("calendar").getAttribute("data-tag")).toBe("3");
  });

  it("파라미터 없으면 resolveMonth 폴백 월로 조회(tagId 미전달)", async () => {
    getEvents.mockResolvedValueOnce(emptyPage);
    render(await EventsPage({ searchParams: Promise.resolve({}) }));
    expect(getEvents).toHaveBeenCalledWith({ year: 2026, month: 6, tagId: undefined, size: 200 });
  });
});

const levels = (v: "PUBLIC" | "MEMBERS") =>
  ({ notices: "PUBLIC", events: v, bulletins: "PUBLIC", sermons: "MEMBERS", gallery: "MEMBERS" }) as const;

describe("EventsPage 공개 범위", () => {
  it("일정이 교인만이면 EVENT_VIEW 게이트 + 브라우저 캘린더(같은 달·태그), 서버 조회 0회", async () => {
    getVisibilityMock.mockResolvedValue(levels("MEMBERS"));
    render(await EventsPage({ searchParams: Promise.resolve({ tagId: "3" }) }));
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("EVENT_VIEW");
    expect(screen.getByTestId("client-calendar").getAttribute("data-ym")).toBe("2026-6");
    expect(screen.getByTestId("client-calendar").getAttribute("data-tag")).toBe("3");
    expect(getEvents).not.toHaveBeenCalled();
  });
  it("설정은 누구나인데 getEvents가 MembersOnlyError면 게이트 경로", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    getEvents.mockRejectedValueOnce(new MembersOnlyError("401"));
    render(await EventsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("client-calendar")).toBeDefined();
  });
  it("대조: 누구나 + 정상이면 서버 캘린더(게이트 없음)", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    getEvents.mockResolvedValueOnce(emptyPage);
    render(await EventsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByTestId("gate")).toBeNull();
    expect(screen.getByTestId("calendar")).toBeDefined();
  });
});

describe("제목 줄 공개 상태 표시", () => {
  it("그 메뉴의 설정 값을 넘기고, 설정을 못 읽으면 폴백이 아닌 null을 넘긴다", async () => {
    getEvents.mockResolvedValue(emptyPage);
    const allPublic = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "PUBLIC" } as const;
    getVisibilityMock.mockResolvedValue({ ...allPublic, events: "MEMBERS" });
    const first = render(await EventsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("status").getAttribute("data-level")).toBe("MEMBERS");
    first.unmount();
    getVisibilityMock.mockResolvedValue(null);
    render(await EventsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("status").getAttribute("data-level")).toBe("null");
  });
});

describe("목록 메타데이터(검색 로봇)", () => {
  const allPublic = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "PUBLIC" } as const;
  it("events 메뉴가 교인만이면 noindex", async () => {
    getVisibilityMock.mockResolvedValue({ ...allPublic, events: "MEMBERS" });
    const meta = await generateMetadata();
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toBe("/events");
  });
  it("대조: 누구나면 robots 없음, canonical 유지", async () => {
    getVisibilityMock.mockResolvedValue(allPublic);
    const meta = await generateMetadata();
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toBe("/events");
  });
  it("설정을 못 읽으면 지금처럼 색인 허용", async () => {
    getVisibilityMock.mockResolvedValue(null);
    expect((await generateMetadata()).robots).toBeUndefined();
  });
});
