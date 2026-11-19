import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const { notifyError, fetchEventMock } = vi.hoisted(() => ({ notifyError: vi.fn(), fetchEventMock: vi.fn() }));
// 상세는 authFetch 경로(fetchEvent)로 읽는다 — 교인만 메뉴에서도 토큰이 실리게(#198).
vi.mock("@/lib/api/memberReads", () => ({ fetchEvent: fetchEventMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/events" }));
vi.mock("@/lib/notify", () => ({ notify: { error: notifyError, success: vi.fn() } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// EventDetailActions는 useMe(useQuery)→QueryClient 의존이라 모달 단위 테스트 맥락에서 null-스텁(02 선례).
vi.mock("@/components/events/EventAdminActions", () => ({ EventDetailActions: () => null }));

import { EventDetailModal } from "./EventDetailModal";
import type { EventCardResponse } from "@/lib/api/types";
import { ApiError } from "@/lib/auth/apiError";

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); fetchEventMock.mockReset(); });

const card: EventCardResponse = {
  id: 3, title: "성가대 연습", location: "본당", startAt: "2026-06-14T10:00:00",
  endAt: "2026-06-14T12:00:00", allDay: false, tags: [],
};
const detail = { ...card, description: "악보 지참", createdAt: "x", updatedAt: "x", version: 0 };

describe("EventDetailModal", () => {
  it("선택 시 제목 즉시 표시 + fetchEvent 후 description(전역 fetch 직접 호출 0)", async () => {
    const globalFetch = vi.fn();
    vi.stubGlobal("fetch", globalFetch);
    fetchEventMock.mockResolvedValue(detail);
    render(<EventDetailModal event={card} onClose={() => {}} />);
    expect(screen.getByText("성가대 연습")).toBeDefined(); // 카드 데이터 즉시(DialogTitle)
    await waitFor(() =>
      expect(document.body.textContent).toContain("악보 지참"),
    );
    expect(fetchEventMock).toHaveBeenCalledWith(3);
    expect(globalFetch).not.toHaveBeenCalled();
  });
  it("모달 본문 이미지는 브라우저 조회 응답의 mediaUrls 서명 주소", async () => {
    fetchEventMock.mockResolvedValue({ ...detail, description: "![](media:9)", mediaUrls: { "9": "/api/media/9?exp=1&sig=e" } });
    render(<EventDetailModal event={card} onClose={() => {}} />);
    await waitFor(() => expect(document.querySelector(".prose-church img")).not.toBeNull());
    expect(document.querySelector(".prose-church img")?.getAttribute("src")).toBe("/api/media/9?exp=1&sig=e");
  });
  it("fetch 실패 시 notify.error", async () => {
    fetchEventMock.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", undefined));
    render(<EventDetailModal event={card} onClose={() => {}} />);
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
  });
  it("event=null이면 fetch 미호출(닫힘)", () => {
    render(<EventDetailModal event={null} onClose={() => {}} />);
    expect(fetchEventMock).not.toHaveBeenCalled();
  });
  it("401이면 Toast 대신 모달 안 로그인 안내", async () => {
    fetchEventMock.mockRejectedValue(new ApiError(401, "INVALID_TOKEN", undefined));
    render(<EventDetailModal event={card} onClose={() => {}} />);
    expect(await screen.findByText("로그인 후 이용 가능합니다")).toBeDefined();
    expect(notifyError).not.toHaveBeenCalled();
  });
});
