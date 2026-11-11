import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { MAIN_SECTIONS } from "@/constants/content";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { NewsSection } from "./NewsSection";

const notices = [
  { id: 2, title: "전교인 수련회 안내", isPinned: true, viewCount: 10, createdAt: "2026-06-02T09:00:00", tags: [] },
  { id: 5, title: "주차장 공사 안내", isPinned: false, viewCount: 1, createdAt: "2026-05-28T09:00:00", tags: [] },
];
const events = [
  { id: 3, title: "성가대 연습", location: "본당", startAt: "2026-06-14T10:00:00", endAt: "2026-06-14T12:00:00", allDay: false, tags: [] },
  { id: 4, title: "전교인 야유회", location: null, startAt: "2026-06-20T00:00:00", endAt: null, allDay: true, tags: [] },
];
// Radix Tabs는 jsdom에서 click 미동작 — mouseDown으로 전환(MarkdownEditor 관례)
const openTab = (name: string) => fireEvent.mouseDown(screen.getByRole("tab", { name }));

describe("NewsSection (교회 소식)", () => {
  it("제목 + 공지·일정 탭, 처음엔 공지 탭", () => {
    render(<NewsSection notices={notices} events={events} />);
    expect(screen.getByRole("heading", { level: 2, name: MAIN_SECTIONS.news.title })).toBeDefined();
    expect(screen.getByRole("tab", { name: MAIN_SECTIONS.notices.title }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: MAIN_SECTIONS.events.title }).getAttribute("aria-selected")).toBe("false");
  });

  it("공지 행 — 날짜·고정 배지·제목·상세 링크", () => {
    render(<NewsSection notices={notices} events={events} />);
    const panel = screen.getByRole("tabpanel");
    const rows = within(panel).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("6월 2일")).toBeDefined();
    expect(within(rows[0]).getByText("고정")).toBeDefined();
    expect(within(rows[0]).getByRole("link").getAttribute("href")).toBe("/notices/2");
    expect(within(panel).getByRole("link", { name: MAIN_SECTIONS.notices.more }).getAttribute("href")).toBe("/notices");
  });

  it("일정 탭 — 날짜·시간·장소·상세 링크, 종일은 시간 생략", () => {
    render(<NewsSection notices={notices} events={events} />);
    openTab(MAIN_SECTIONS.events.title);
    const panel = screen.getByRole("tabpanel");
    const rows = within(panel).getAllByRole("listitem");
    expect(within(rows[0]).getByText("6월 14일")).toBeDefined();
    expect(within(rows[0]).getByText("10:00 ~ 12:00 · 본당")).toBeDefined();
    expect(within(rows[0]).getByRole("link").getAttribute("href")).toBe("/events/3");
    expect(within(rows[1]).getByText("전교인 야유회")).toBeDefined();
    expect(within(rows[1]).queryByText(/\d{2}:\d{2}/)).toBeNull();
    expect(within(panel).getByRole("link", { name: MAIN_SECTIONS.events.more }).getAttribute("href")).toBe("/events");
  });

  it("빈 목록이면 탭 안에 EmptyState", () => {
    render(<NewsSection notices={[]} events={[]} />);
    expect(screen.getByText(MAIN_SECTIONS.notices.empty)).toBeDefined();
    openTab(MAIN_SECTIONS.events.title);
    expect(screen.getByText(MAIN_SECTIONS.events.empty)).toBeDefined();
  });
});
