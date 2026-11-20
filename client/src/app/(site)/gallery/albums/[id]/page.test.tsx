// src/app/(site)/gallery/albums/[id]/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ permission, domainLabel, children }: { permission: string; domainLabel: string; children: ReactNode }) => (
    <div data-testid="gate" data-permission={permission} data-domain={domainLabel}>{children}</div>
  ),
}));
vi.mock("@/components/gallery/AlbumDetail", () => ({
  AlbumDetail: ({ id, menuLevel }: { id: number; menuLevel?: string }) => (
    <div data-testid="detail" data-id={id} data-menu-level={menuLevel} />
  ),
}));
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

import AlbumDetailPage from "./page";

beforeEach(() => vi.clearAllMocks());

describe("AlbumDetailPage (셸)", () => {
  it("갤러리가 교인만이면 GALLERY_VIEW 게이트 안에 상세", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC", "MEMBERS"));
    render(await AlbumDetailPage({ params: Promise.resolve({ id: "5" }) }));
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("GALLERY_VIEW");
    expect(screen.getByTestId("detail").getAttribute("data-id")).toBe("5");
  });

  it("갤러리가 누구나면 게이트 없이 상세를 그린다", async () => {
    getVisibilityMock.mockResolvedValue(levels("MEMBERS", "PUBLIC"));
    render(await AlbumDetailPage({ params: Promise.resolve({ id: "5" }) }));
    expect(screen.queryByTestId("gate")).toBeNull();
    expect(screen.getByTestId("detail").getAttribute("data-id")).toBe("5");
  });

  it("설정을 못 읽으면(null) 지금처럼 게이트", async () => {
    getVisibilityMock.mockResolvedValue(null);
    render(await AlbumDetailPage({ params: Promise.resolve({ id: "5" }) }));
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("GALLERY_VIEW");
  });

  it("비숫자 id면 설정을 읽기 전에 notFound", async () => {
    await expect(AlbumDetailPage({ params: Promise.resolve({ id: "abc" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

// #201 — 상세의 교인만 배지는 메뉴 수준을 보고 숨긴다. 못 읽으면 폴백(교인만)을 그대로 넘긴다(게이트와 같은 기준).
describe("AlbumDetailPage 메뉴 수준 전달", () => {
  it.each([
    ["MEMBERS", levels("PUBLIC", "MEMBERS")],
    ["PUBLIC", levels("MEMBERS", "PUBLIC")],
    ["MEMBERS", null],
  ] as const)("상세에 menuLevel=%s를 넘긴다", async (expected, v) => {
    getVisibilityMock.mockResolvedValue(v);
    render(await AlbumDetailPage({ params: Promise.resolve({ id: "5" }) }));
    expect(screen.getByTestId("detail").getAttribute("data-menu-level")).toBe(expected);
  });
});
