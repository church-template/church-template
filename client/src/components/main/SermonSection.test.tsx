import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MAIN_SECTIONS } from "@/constants/content";
import { SERMON_LIST } from "@/constants/sermons";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SermonSection } from "./SermonSection";

const base = { viewCount: 3, tags: [{ id: 1, name: "부활" }] };
const latest = {
  ...base,
  id: 1,
  title: "부활의 증인",
  preacher: "김목사",
  series: "요한복음 시리즈",
  scripture: "요한복음 20:19-23",
  preachedAt: "2026-06-07",
};
const older = { ...base, id: 2, title: "믿음의 경주", preacher: "이목사", series: null, scripture: "히브리서 12:1-2", preachedAt: "2026-05-31" };
const oldest = { ...base, id: 3, title: "소망의 닻", preacher: "김목사", series: "히브리서 강해", scripture: null, preachedAt: "2026-05-24" };
const now = new Date("2026-06-09T03:00:00Z"); // KST 6월 9일 — 6월 7일 설교는 "이번 주"

describe("SermonSection", () => {
  it("첫 설교는 말씀 띠 — 라벨·본문·제목(h3)·날짜 줄·상세 링크", () => {
    render(<SermonSection sermons={[latest, older]} now={now} />);
    const title = screen.getByRole("heading", { level: 3, name: "부활의 증인" });
    const feature = title.closest("a");
    expect(feature?.getAttribute("href")).toBe("/sermons/1");
    expect(within(feature!).getByText(SERMON_LIST.featuredRecent)).toBeDefined();
    expect(within(feature!).getByText("요한복음 20:19-23")).toBeDefined();
    expect(within(feature!).getByText("2026년 6월 7일 · 김목사 · 요한복음 시리즈")).toBeDefined();
  });

  it("나머지는 '지난 말씀' 줄 목록 — 날짜·제목·시리즈/본문·설교자·링크", () => {
    render(<SermonSection sermons={[latest, older, oldest]} now={now} />);
    expect(screen.getByText(MAIN_SECTIONS.sermons.pastTitle)).toBeDefined();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("5월 31일")).toBeDefined();
    expect(within(rows[0]).getByText("히브리서 12:1-2")).toBeDefined();
    expect(within(rows[0]).getByText("이목사")).toBeDefined();
    expect(within(rows[0]).getByRole("link").getAttribute("href")).toBe("/sermons/2");
    expect(within(rows[1]).getByText("히브리서 강해")).toBeDefined();
  });

  it("설교가 하나뿐이면 '지난 말씀' 묶음을 그리지 않는다", () => {
    render(<SermonSection sermons={[latest]} now={now} />);
    expect(screen.queryByText(MAIN_SECTIONS.sermons.pastTitle)).toBeNull();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("설교 전체 보기 링크", () => {
    render(<SermonSection sermons={[latest]} now={now} />);
    expect(screen.getByRole("link", { name: MAIN_SECTIONS.sermons.more }).getAttribute("href")).toBe("/sermons");
  });

  it("빈 배열이면 섹션 유지 + EmptyState", () => {
    render(<SermonSection sermons={[]} now={now} />);
    expect(screen.getByText(MAIN_SECTIONS.sermons.title)).toBeDefined();
    expect(screen.getByText(MAIN_SECTIONS.sermons.empty)).toBeDefined();
  });
});
