// src/app/(site)/gallery/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// 셸 테스트 — 게이트·목록 동작은 MemberGate.test·AlbumList.test가 커버, 여기선 공개 범위 분기만 확인.
// 상태 표시(VISIBILITY_MANAGE 게이트)는 VisibilityStatusLink.test가 본다 — 여기선 페이지가 넘기는 값만.
vi.mock("@/components/visibility/VisibilityStatusLink", () => ({
  VisibilityStatusLink: ({ level }: { level: string | null }) => <div data-testid="status" data-level={String(level)} />,
}));
vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ permission, domainLabel, children }: { permission: string; domainLabel: string; children: ReactNode }) => (
    <div data-testid="gate" data-permission={permission} data-domain={domainLabel}>{children}</div>
  ),
}));
vi.mock("@/components/gallery/AlbumList", () => ({ AlbumList: ({ menuLevel }: { menuLevel: string }) => <div data-testid="list" data-level={menuLevel} /> }));
vi.mock("@/components/gallery/GalleryAdminActions", () => ({ AlbumListAction: () => null }));
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

import GalleryPage from "./page";

beforeEach(() => vi.clearAllMocks());

describe("GalleryPage (셸)", () => {
  it("갤러리가 교인만이면 GALLERY_VIEW 게이트 안에 목록", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC", "MEMBERS"));
    render(await GalleryPage());
    expect(screen.getByRole("heading", { name: "갤러리" })).toBeDefined();
    const gate = screen.getByTestId("gate");
    expect(gate.getAttribute("data-permission")).toBe("GALLERY_VIEW");
    expect(gate.getAttribute("data-domain")).toBe("갤러리");
    expect(screen.getByTestId("list")).toBeDefined();
  });

  it("갤러리가 누구나면 게이트 없이 목록을 그린다", async () => {
    getVisibilityMock.mockResolvedValue(levels("MEMBERS", "PUBLIC"));
    render(await GalleryPage());
    expect(screen.queryByTestId("gate")).toBeNull();
    expect(screen.getByTestId("list")).toBeDefined();
    expect(connectionMock).toHaveBeenCalled();
  });

  it("설정을 못 읽으면(null) 지금처럼 게이트", async () => {
    getVisibilityMock.mockResolvedValue(null);
    render(await GalleryPage());
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("GALLERY_VIEW");
  });

  // 목록 위 "지금은 전체가 교인 전용입니다" 배너(Task 5)의 근거 — 페이지가 읽은 메뉴 상태를 그대로 넘긴다.
  it("목록에 메뉴 상태를 넘긴다", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC", "MEMBERS"));
    const { unmount } = render(await GalleryPage());
    expect(screen.getByTestId("list").getAttribute("data-level")).toBe("MEMBERS");
    unmount();
    getVisibilityMock.mockResolvedValue(levels("MEMBERS", "PUBLIC"));
    render(await GalleryPage());
    expect(screen.getByTestId("list").getAttribute("data-level")).toBe("PUBLIC");
  });
});

describe("제목 줄 공개 상태 표시", () => {
  it("그 메뉴의 설정 값을 넘기고, 설정을 못 읽으면 폴백이 아닌 null을 넘긴다", async () => {
    
    const allPublic = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "PUBLIC" } as const;
    getVisibilityMock.mockResolvedValue({ ...allPublic, gallery: "MEMBERS" });
    const first = render(await GalleryPage());
    expect(screen.getByTestId("status").getAttribute("data-level")).toBe("MEMBERS");
    first.unmount();
    getVisibilityMock.mockResolvedValue(null);
    render(await GalleryPage());
    expect(screen.getByTestId("status").getAttribute("data-level")).toBe("null");
  });
});
