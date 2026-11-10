import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { DEPARTMENTS, DEPT_PAGE } from "@/constants/departments";

vi.mock("next/navigation", () => ({ usePathname: () => "/departments" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import DepartmentsPage from "./page";

function stubBrowserApis() {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })));
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
}
afterEach(() => vi.unstubAllGlobals());

describe("DepartmentsPage (사역 목록)", () => {
  it("헤드라인과 부서별 소개·상세 링크를 렌더한다(상수 구동)", () => {
    stubBrowserApis();
    render(<DepartmentsPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(DEPT_PAGE.headline.join(""));
    const first = DEPARTMENTS[0];
    expect(
      screen.getByRole("link", { name: `${first.name} ${DEPT_PAGE.more}` }).getAttribute("href"),
    ).toBe(`/departments/${first.slug}`);
  });
});
