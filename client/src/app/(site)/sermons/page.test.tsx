// src/app/(site)/sermons/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// 셸 테스트 — 게이트·목록 동작은 MemberGate.test·SermonList.test가 커버, 여기선 배선만 확인.
// 상태 표시(VISIBILITY_MANAGE 게이트)는 VisibilityStatusLink.test가 본다 — 여기선 페이지가 넘기는 값만.
vi.mock("@/components/visibility/VisibilityStatusLink", () => ({
  VisibilityStatusLink: ({ level }: { level: string | null }) => <div data-testid="status" data-level={String(level)} />,
}));
vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ permission, domainLabel, children }: { permission: string; domainLabel: string; children: ReactNode }) => (
    <div data-testid="gate" data-permission={permission} data-domain={domainLabel}>{children}</div>
  ),
}));
vi.mock("@/components/sermons/SermonList", () => ({ SermonList: ({ menuLevel }: { menuLevel: string }) => <div data-testid="list" data-level={menuLevel} /> }));
vi.mock("@/components/sermons/SermonAdminActions", () => ({ SermonListAction: () => null }));

const { getVisibilityMock, connectionMock } = vi.hoisted(() => ({
  getVisibilityMock: vi.fn(),
  connectionMock: vi.fn(async () => {}),
}));
vi.mock("next/server", () => ({ connection: connectionMock }));
// resolveVisibility(폴백)는 실제 구현을 쓴다 — 설정 조회만 바꾼다.
vi.mock("@/lib/api/visibility", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/visibility")>()),
  getVisibility: getVisibilityMock,
}));
const levels = (sermons: "PUBLIC" | "MEMBERS", gallery: "PUBLIC" | "MEMBERS" = "MEMBERS") =>
  ({ notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons, gallery }) as const;

import SermonsPage from "./page";

beforeEach(() => vi.clearAllMocks());

describe("SermonsPage (셸)", () => {
  it("설교가 교인만이면 제목과 SERMON_VIEW 게이트 안의 목록을 렌더한다", async () => {
    getVisibilityMock.mockResolvedValue(levels("MEMBERS"));
    render(await SermonsPage());
    expect(screen.getByRole("heading", { name: "설교" })).toBeDefined();
    const gate = screen.getByTestId("gate");
    expect(gate.getAttribute("data-permission")).toBe("SERMON_VIEW");
    expect(gate.getAttribute("data-domain")).toBe("설교");
    expect(screen.getByTestId("list")).toBeDefined();
  });

  it("설교가 누구나면 게이트 없이 목록을 그린다", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    render(await SermonsPage());
    expect(screen.queryByTestId("gate")).toBeNull();
    expect(screen.getByTestId("list")).toBeDefined();
    expect(connectionMock).toHaveBeenCalled(); // 빌드 시(백엔드 없음) 폴백이 굳지 않게 요청 시점 렌더
  });

  it("설정을 못 읽으면(null) 지금처럼 게이트", async () => {
    getVisibilityMock.mockResolvedValue(null);
    render(await SermonsPage());
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("SERMON_VIEW");
  });

  // 목록 위 "지금은 전체가 교인 전용입니다" 배너(Task 5)의 근거 — 페이지가 읽은 메뉴 상태를 그대로 넘긴다.
  it("목록에 메뉴 상태를 넘긴다", async () => {
    getVisibilityMock.mockResolvedValue(levels("MEMBERS"));
    const { unmount } = render(await SermonsPage());
    expect(screen.getByTestId("list").getAttribute("data-level")).toBe("MEMBERS");
    unmount();
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    render(await SermonsPage());
    expect(screen.getByTestId("list").getAttribute("data-level")).toBe("PUBLIC");
  });
});

describe("제목 줄 공개 상태 표시", () => {
  it("그 메뉴의 설정 값을 넘기고, 설정을 못 읽으면 폴백이 아닌 null을 넘긴다", async () => {
    
    const allPublic = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "PUBLIC" } as const;
    getVisibilityMock.mockResolvedValue({ ...allPublic, sermons: "MEMBERS" });
    const first = render(await SermonsPage());
    expect(screen.getByTestId("status").getAttribute("data-level")).toBe("MEMBERS");
    first.unmount();
    getVisibilityMock.mockResolvedValue(null);
    render(await SermonsPage());
    expect(screen.getByTestId("status").getAttribute("data-level")).toBe("null");
  });
});
