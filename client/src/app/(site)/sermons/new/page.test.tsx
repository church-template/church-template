// src/app/(site)/sermons/new/page.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ children }: { children: ReactNode }) => <div data-testid="gate">{children}</div>,
}));
vi.mock("@/components/admin/RequirePermission", () => ({
  RequirePermission: ({ permission, children }: { permission: string; children: ReactNode }) => (
    <div data-testid="require" data-permission={permission}>{children}</div>
  ),
}));
vi.mock("@/components/admin/EditGate", () => ({ EditAccessDenied: () => <div data-testid="access-denied" /> }));
vi.mock("@/components/sermons/SermonForm", () => ({
  SermonForm: ({ menuLevel }: { menuLevel?: string }) => <div data-testid="form" data-menu-level={menuLevel ?? "none"} />,
}));
const { getVisibilityMock, connectionMock } = vi.hoisted(() => ({
  getVisibilityMock: vi.fn(),
  connectionMock: vi.fn(async () => {}),
}));
vi.mock("next/server", () => ({ connection: connectionMock }));
vi.mock("@/lib/api/visibility", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/visibility")>()),
  getVisibility: getVisibilityMock,
}));
const levels = (sermons: "PUBLIC" | "MEMBERS", gallery: "PUBLIC" | "MEMBERS") =>
  ({ notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons, gallery }) as const;

import SermonNewPage from "./page";

afterEach(() => vi.clearAllMocks());

// #201 — 폼의 교인만 메뉴 안내는 실제 설정 값으로만. 못 읽으면 넘기지 않는다(안내 없음 = 지금 동작).
describe("SermonNewPage 메뉴 수준 전달", () => {
  it.each([
    ["MEMBERS", levels("MEMBERS", "PUBLIC")],
    ["PUBLIC", levels("PUBLIC", "MEMBERS")],
    ["none", null],
  ] as const)("폼에 menuLevel=%s", async (expected, v) => {
    getVisibilityMock.mockResolvedValue(v);
    render(await SermonNewPage());
    expect(screen.getByTestId("require").getAttribute("data-permission")).toBe("SERMON_WRITE");
    expect(screen.getByTestId("form").getAttribute("data-menu-level")).toBe(expected);
  });
});
