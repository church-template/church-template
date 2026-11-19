import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { getEvent } = vi.hoisted(() => ({ getEvent: vi.fn() }));
vi.mock("@/lib/api/events", () => ({ getEvent }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/components/admin/RequirePermission", () => ({
  RequirePermission: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/admin/EditGate", () => ({ EditAccessDenied: () => null }));
// 수정 화면은 설정과 무관하게 브라우저에서 읽는다(교인만이면 서버가 읽을 수 없다, 스펙 6.3).
vi.mock("@/components/events/EventMemberViews", () => ({
  EventEditLoader: ({ id }: { id: number }) => <div data-testid="edit-loader" data-id={id} />,
}));

import EventEditPage from "./page";

afterEach(() => vi.clearAllMocks());

describe("EventEditPage", () => {
  it("설정과 무관하게 EventEditLoader를 그리고 서버 조회하지 않는다", async () => {
    render(await EventEditPage({ params: Promise.resolve({ id: "7" }) }));
    expect(screen.getByTestId("edit-loader").getAttribute("data-id")).toBe("7");
    expect(getEvent).not.toHaveBeenCalled();
  });
  it("비숫자·0 id면 notFound", async () => {
    await expect(EventEditPage({ params: Promise.resolve({ id: "abc" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(EventEditPage({ params: Promise.resolve({ id: "0" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
