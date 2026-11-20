// src/components/sermons/ActiveFilters.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { spRef } = vi.hoisted(() => ({ spRef: { current: null as URLSearchParams | null } }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/sermons",
  // 기본은 "q=grace&preacher=Kim&tagId=3" — 고르기 모드 테스트만 바꾼다
  useSearchParams: () => spRef.current ?? new URLSearchParams("q=grace&preacher=Kim&tagId=3"),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { buildChips, ActiveFilterChips } from "./ActiveFilters";

describe("buildChips (순수)", () => {
  it("필터 없으면 빈 배열", () => {
    expect(buildChips(new URLSearchParams(""))).toEqual([]);
    expect(buildChips(new URLSearchParams("tagId=3&page=2"))).toEqual([]); // tagId·page는 칩 제외
  });
  it("q·preacher·series·기간 칩 생성", () => {
    const chips = buildChips(new URLSearchParams("q=은혜&preacher=Kim&series=여름&from=2026-01-01"));
    expect(chips.map((c) => c.label)).toEqual([
      '검색: "은혜"',
      "설교자: Kim",
      "시리즈: 여름",
      "기간: 2026-01-01 ~ 끝",
    ]);
  });
  it("to만 있으면 '처음 ~' 라벨", () => {
    const chips = buildChips(new URLSearchParams("to=2026-12-31"));
    expect(chips.map((c) => c.label)).toEqual(["기간: 처음 ~ 2026-12-31"]);
  });
});

describe("ActiveFilterChips (렌더)", () => {
  it("칩 ✕는 해당 param+page만 제거(나머지 보존)", () => {
    render(<ActiveFilterChips />);
    const remove = screen.getByLabelText('검색: "grace" 필터 제거') as HTMLAnchorElement;
    const href = remove.getAttribute("href")!;
    expect(href).not.toContain("q=");
    expect(href).toContain("preacher=Kim");
    expect(href).toContain("tagId=3");
  });
});

// #201 — 설교 고르기 모드(?pick=1)는 필터 칩을 지워도 유지돼야 한다(회귀 고정).
describe("ActiveFilterChips 고르기 모드 유지", () => {
  afterEach(() => {
    spRef.current = null;
  });
  it("칩 제거 링크가 pick=1을 넘긴다", () => {
    spRef.current = new URLSearchParams("q=grace&pick=1");
    render(<ActiveFilterChips />);
    expect(screen.getByRole("link", { name: /필터 제거/ }).getAttribute("href")).toBe("/sermons?pick=1");
  });
});
