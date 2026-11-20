import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { spRef } = vi.hoisted(() => ({ spRef: { current: null as URLSearchParams | null } }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/sermons",
  // 기본은 "tagId=3" — 고르기 모드 테스트만 바꾼다
  useSearchParams: () => spRef.current ?? new URLSearchParams("tagId=3"),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { TagFilterPills } from "./TagFilter";

const tags = [
  { id: 3, name: "주일예배" },
  { id: 5, name: "수요예배" },
];

describe("TagFilterPills", () => {
  it("'전체'는 tagId를 제거한 href", () => {
    render(<TagFilterPills tags={tags} />);
    const all = screen.getByRole("link", { name: "전체" }) as HTMLAnchorElement;
    expect(all.getAttribute("href")).toBe("/sermons");
  });

  it("태그 선택 시 ?tagId= 단수로 재조회(page 리셋)", () => {
    render(<TagFilterPills tags={tags} />);
    const t = screen.getByRole("link", { name: "수요예배" }) as HTMLAnchorElement;
    expect(t.getAttribute("href")).toBe("/sermons?tagId=5");
  });

  it("현재 tagId(3)인 필은 aria-pressed", () => {
    render(<TagFilterPills tags={tags} />);
    const active = screen.getByRole("link", { name: "주일예배" });
    expect(active.getAttribute("aria-pressed")).toBe("true");
  });
});

// #201 — 설교·갤러리 고르기 모드(?pick=1)는 태그를 바꿔도 유지돼야 한다(회귀 고정).
describe("TagFilterPills 고르기 모드 유지", () => {
  afterEach(() => {
    spRef.current = null;
  });
  it("태그·전체 링크 모두 pick=1을 넘긴다", () => {
    spRef.current = new URLSearchParams("tagId=3&pick=1&page=2");
    render(<TagFilterPills tags={tags} />);
    expect(screen.getByRole("link", { name: "수요예배" }).getAttribute("href")).toBe("/sermons?tagId=5&pick=1");
    expect(screen.getByRole("link", { name: "전체" }).getAttribute("href")).toBe("/sermons?pick=1");
  });
});
