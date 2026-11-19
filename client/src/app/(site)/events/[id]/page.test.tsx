import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { getEvent } = vi.hoisted(() => ({ getEvent: vi.fn() }));
vi.mock("@/lib/api/events", () => ({ getEvent }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
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
  EventDetailClient: ({ id }: { id: number }) => <div data-testid="client-detail" data-id={id} />,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// EventDetailActions는 useMe(useQuery)→QueryClient 의존이라 RSC 테스트 맥락에서 null-스텁(02 선례).
vi.mock("@/components/events/EventAdminActions", () => ({ EventDetailActions: () => null }));

import EventDetailPage, { generateMetadata } from "./page";
import { MembersOnlyError } from "@/lib/api/visibility";

afterEach(() => { vi.clearAllMocks(); getVisibilityMock.mockReset(); });

const detail = {
  id: 3, title: "성가대 연습", description: "악보 지참", location: "본당",
  startAt: "2026-06-14T10:00:00", endAt: "2026-06-14T12:00:00", allDay: false,
  createdAt: "2026-06-01T09:00:00", updatedAt: "2026-06-01T09:00:00", version: 0,
  tags: [{ id: 3, name: "행사" }],
};

describe("EventDetailPage (딥링크)", () => {
  it("제목·상세 본문 렌더", async () => {
    getEvent.mockResolvedValueOnce(detail);
    const { container } = render(await EventDetailPage({ params: Promise.resolve({ id: "3" }) }));
    expect(getEvent).toHaveBeenCalledWith(3);
    expect(screen.getByRole("heading", { name: "성가대 연습" })).toBeDefined();
    expect(container.textContent).toContain("10:00 ~ 12:00");
    expect(container.querySelector(".prose-church")?.textContent).toContain("악보 지참");
  });
  it("없는 일정(null)이면 notFound", async () => {
    getEvent.mockResolvedValueOnce(null);
    await expect(EventDetailPage({ params: Promise.resolve({ id: "99" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("비숫자·0·음수 id면 notFound(fetch 미호출)", async () => {
    await expect(EventDetailPage({ params: Promise.resolve({ id: "abc" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(EventDetailPage({ params: Promise.resolve({ id: "0" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getEvent).not.toHaveBeenCalled();
  });
});

describe("행사 상세 generateMetadata (#117)", () => {
  it("제목·요약·canonical을 산출한다", async () => {
    getEvent.mockResolvedValueOnce({
      ...detail,
      description: "**은혜로운** 시간.",
    });
    const meta = await generateMetadata({ params: Promise.resolve({ id: "3" }) });
    expect(meta.title).toBe("성가대 연습");
    expect(meta.description).toBe("은혜로운 시간.");
    expect(meta.alternates?.canonical).toBe("/events/3");
  });

  it("없는 행사는 빈 metadata를 반환한다", async () => {
    getEvent.mockResolvedValueOnce(null);
    expect(await generateMetadata({ params: Promise.resolve({ id: "99" }) })).toEqual({});
  });
});

const levels = (v: "PUBLIC" | "MEMBERS") =>
  ({ notices: "PUBLIC", events: v, bulletins: "PUBLIC", sermons: "MEMBERS", gallery: "MEMBERS" }) as const;

describe("일정 상세 공개 범위", () => {
  it("교인만이면 metadata는 조회 없이 noindex, 본문은 EVENT_VIEW 게이트 + 브라우저 상세", async () => {
    getVisibilityMock.mockResolvedValue(levels("MEMBERS"));
    const meta = await generateMetadata({ params: Promise.resolve({ id: "3" }) });
    expect(meta.robots).toEqual({ index: false, follow: false });
    render(await EventDetailPage({ params: Promise.resolve({ id: "3" }) }));
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("EVENT_VIEW");
    expect(screen.getByTestId("client-detail").getAttribute("data-id")).toBe("3");
    expect(getEvent).not.toHaveBeenCalled();
  });
  it("누구나 + MembersOnlyError면 metadata noindex, 본문 게이트", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    getEvent.mockRejectedValue(new MembersOnlyError("403"));
    expect((await generateMetadata({ params: Promise.resolve({ id: "3" }) })).robots).toEqual({ index: false, follow: false });
    render(await EventDetailPage({ params: Promise.resolve({ id: "3" }) }));
    expect(screen.getByTestId("gate")).toBeDefined();
  });
  // 서버 렌더는 60초 캐시라 1시간짜리 서명 주소가 만료된 채 나갈 수 있다 → mediaUrls가 있어도 무서명으로.
  // 서명 주소 대조(브라우저 조회 경로)는 EventMemberViews.test·EventDetailModal.test.
  it("응답에 mediaUrls가 있어도 서버 렌더 본문 이미지는 무서명 /api/media/{id}", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    getEvent.mockResolvedValueOnce({ ...detail, description: "![](media:9)", mediaUrls: { "9": "/api/media/9?exp=1&sig=e" } });
    const { container } = render(await EventDetailPage({ params: Promise.resolve({ id: "3" }) }));
    expect(container.querySelector(".prose-church img")?.getAttribute("src")).toBe("/api/media/9");
  });
});
