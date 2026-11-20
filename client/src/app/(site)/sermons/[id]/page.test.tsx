// src/app/(site)/sermons/[id]/page.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

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
// 셸 테스트 — 게이트·상세 동작은 MemberGate.test·SermonDetail.test가 커버, 여기선 id 검증·배선만 확인.
vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ permission, domainLabel, children }: { permission: string; domainLabel: string; children: ReactNode }) => (
    <div data-testid="gate" data-permission={permission} data-domain={domainLabel}>{children}</div>
  ),
}));
vi.mock("@/components/sermons/SermonDetail", () => ({
  SermonDetail: ({ id, menuLevel }: { id: number; menuLevel?: string }) => (
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

import SermonDetailPage from "./page";

afterEach(() => vi.clearAllMocks());

describe("SermonDetailPage (셸)", () => {
  it("설교가 교인만이면 뒤로가기 링크와 SERMON_VIEW 게이트 안의 상세를 렌더한다", async () => {
    getVisibilityMock.mockResolvedValue(levels("MEMBERS"));
    render(await SermonDetailPage({ params: Promise.resolve({ id: "7" }) }));
    expect(screen.getByRole("link", { name: /설교 목록/ }).getAttribute("href")).toBe("/sermons");
    const gate = screen.getByTestId("gate");
    expect(gate.getAttribute("data-permission")).toBe("SERMON_VIEW");
    expect(gate.getAttribute("data-domain")).toBe("설교");
    expect(screen.getByTestId("detail").getAttribute("data-id")).toBe("7");
  });

  it("설교가 누구나면 게이트 없이 상세를 그린다", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    render(await SermonDetailPage({ params: Promise.resolve({ id: "7" }) }));
    expect(screen.queryByTestId("gate")).toBeNull();
    expect(screen.getByTestId("detail").getAttribute("data-id")).toBe("7");
  });

  it("설정을 못 읽으면(null) 지금처럼 게이트", async () => {
    getVisibilityMock.mockResolvedValue(null);
    render(await SermonDetailPage({ params: Promise.resolve({ id: "7" }) }));
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("SERMON_VIEW");
  });

  it("비숫자 id면 notFound", async () => {
    await expect(
      SermonDetailPage({ params: Promise.resolve({ id: "abc" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("id가 0·음수면 notFound", async () => {
    await expect(
      SermonDetailPage({ params: Promise.resolve({ id: "0" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      SermonDetailPage({ params: Promise.resolve({ id: "-3" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

// #201 — 상세의 교인만 배지는 메뉴 수준을 보고 숨긴다. 못 읽으면 폴백(교인만)을 그대로 넘긴다(게이트와 같은 기준).
describe("SermonDetailPage 메뉴 수준 전달", () => {
  it.each([
    ["MEMBERS", levels("MEMBERS", "PUBLIC")],
    ["PUBLIC", levels("PUBLIC")],
    ["MEMBERS", null],
  ] as const)("상세에 menuLevel=%s를 넘긴다", async (expected, v) => {
    getVisibilityMock.mockResolvedValue(v);
    render(await SermonDetailPage({ params: Promise.resolve({ id: "7" }) }));
    expect(screen.getByTestId("detail").getAttribute("data-menu-level")).toBe(expected);
  });
});
