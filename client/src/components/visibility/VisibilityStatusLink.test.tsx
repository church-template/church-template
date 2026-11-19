import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@/lib/auth/useMe", () => ({ useMe: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
import { useMe } from "@/lib/auth/useMe";
import { VisibilityStatusLink } from "./VisibilityStatusLink";

const mockMe = (perms: string[]) =>
  (useMe as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: { permissions: perms }, isLoading: false });

beforeEach(() => vi.clearAllMocks());

describe("VisibilityStatusLink", () => {
  it("VISIBILITY_MANAGE 보유자에게 '교인만 공개 · 변경'과 설정 화면 링크(ChevronRight 포함)", () => {
    mockMe(["VISIBILITY_MANAGE"]);
    render(<VisibilityStatusLink level="MEMBERS" />);
    const link = screen.getByRole("link", { name: "교인만 공개 · 변경" });
    expect(link.getAttribute("href")).toBe("/mypage/manage/visibility");
    expect(link.querySelector("svg.lucide-chevron-right")).not.toBeNull();
    expect(link.className).toContain("min-h-12"); // 48px 누름 영역
  });

  it("누구나면 '누구나 공개 · 변경'", () => {
    mockMe(["VISIBILITY_MANAGE"]);
    render(<VisibilityStatusLink level="PUBLIC" />);
    expect(screen.getByRole("link", { name: "누구나 공개 · 변경" })).toBeDefined();
  });

  it("대조: 권한이 없으면 아무것도 그리지 않는다", () => {
    mockMe(["SERMON_WRITE"]);
    const { container } = render(<VisibilityStatusLink level="MEMBERS" />);
    expect(container.innerHTML).toBe("");
  });

  it("설정을 못 읽었으면(null) 보유자에게도 그리지 않는다", () => {
    mockMe(["VISIBILITY_MANAGE"]);
    const { container } = render(<VisibilityStatusLink level={null} />);
    expect(container.innerHTML).toBe("");
  });
});
