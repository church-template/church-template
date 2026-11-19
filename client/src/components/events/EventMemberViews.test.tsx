import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { fetchEventsMock, fetchEventMock } = vi.hoisted(() => ({ fetchEventsMock: vi.fn(), fetchEventMock: vi.fn() }));
vi.mock("@/lib/api/memberReads", () => ({ fetchEvents: fetchEventsMock, fetchEvent: fetchEventMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/events" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("./EventDetailModal", () => ({ EventDetailModal: () => null }));
vi.mock("./EventAdminActions", () => ({ EventDetailActions: () => null }));
vi.mock("./EventForm", () => ({
  EventForm: ({ initial }: { initial: { version: number } }) => <div data-testid="form" data-version={initial.version} />,
}));

import { EventCalendarClient, EventDetailClient, EventEditLoader } from "./EventMemberViews";
import { ApiError } from "@/lib/auth/apiError";

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  fetchEventsMock.mockReset();
  fetchEventMock.mockReset();
});
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
const detail = {
  id: 3, title: "교인 일정", description: "![](media:9)", location: "본당", startAt: "2026-06-14T10:00:00",
  endAt: null, allDay: false, createdAt: "x", updatedAt: "x", version: 2, tags: [],
  mediaUrls: { "9": "/api/media/9?exp=1&sig=e" },
};

describe("EventCalendarClient", () => {
  it("받은 일정으로 같은 달 캘린더를 그린다(서버와 같은 쿼리)", async () => {
    fetchEventsMock.mockResolvedValue({
      content: [{ id: 3, title: "교인 일정", location: null, startAt: "2026-06-14T10:00:00", endAt: null, allDay: false, tags: [] }],
      page: { size: 200, number: 0, totalElements: 1, totalPages: 1 },
    });
    wrap(<EventCalendarClient year={2026} month={6} tagId={2} />);
    expect((await screen.findAllByText("교인 일정")).length).toBeGreaterThan(0); // 데스크톱 격자·모바일 목록 양쪽
    expect(fetchEventsMock).toHaveBeenCalledWith({ year: 2026, month: 6, tagId: 2, size: 200 });
    expect(screen.getByText("2026년 6월")).toBeDefined();
  });
  it("401이면 로그인 안내", async () => {
    fetchEventsMock.mockRejectedValue(new ApiError(401, "INVALID_TOKEN", undefined));
    wrap(<EventCalendarClient year={2026} month={6} />);
    expect(await screen.findByText("일정은 교인 전용입니다. 로그인해 주세요.")).toBeDefined();
  });
});

describe("EventDetailClient", () => {
  it("상세 본문은 mediaUrls 서명 주소", async () => {
    fetchEventMock.mockResolvedValue(detail);
    const { container } = wrap(<EventDetailClient id={3} />);
    expect(await screen.findByRole("heading", { name: "교인 일정" })).toBeDefined();
    expect(container.querySelector(".prose-church img")?.getAttribute("src")?.endsWith("sig=e")).toBe(true);
  });
  it("403이면 승인 안내", async () => {
    fetchEventMock.mockRejectedValue(new ApiError(403, "ACCESS_DENIED", undefined));
    wrap(<EventDetailClient id={3} />);
    expect(await screen.findByText("교인 승인 후 이용 가능합니다")).toBeDefined();
  });
});

describe("EventEditLoader", () => {
  it("최신 version으로 폼을 시드하고, 무효화되면 다시 받는다", async () => {
    fetchEventMock.mockResolvedValueOnce(detail).mockResolvedValueOnce({ ...detail, version: 5 });
    wrap(<EventEditLoader id={3} />);
    expect((await screen.findByTestId("form")).getAttribute("data-version")).toBe("2");
    await qc.invalidateQueries({ queryKey: ["event", 3] });
    await waitFor(() => expect(screen.getByTestId("form").getAttribute("data-version")).toBe("5"));
  });
});
