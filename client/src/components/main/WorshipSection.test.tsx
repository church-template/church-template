import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";
import { WorshipSection } from "./WorshipSection";

// 카드 = h3 예배명을 가진 가장 가까운 [data-match] 래퍼
const card = (name: string) => screen.getByRole("heading", { level: 3, name }).closest("[data-match]")!;

afterEach(() => vi.useRealTimers());

describe("WorshipSection", () => {
  it("타이틀·다음 예배 띠·모든 예배 카드를 렌더한다", () => {
    render(<WorshipSection />);
    expect(screen.getByText(WORSHIP.title)).toBeDefined();
    expect(screen.getByText(WORSHIP.nextLabel)).toBeDefined();
    for (const s of WORSHIP_SERVICES) {
      expect(screen.getByText(s.name)).toBeDefined();
      expect(screen.getByText(s.time)).toBeDefined();
    }
  });

  it("처음엔 '전체'가 눌려 있고 모든 카드가 켜져 있다", () => {
    render(<WorshipSection />);
    const group = screen.getByRole("group", { name: WORSHIP.dayFilterLabel });
    expect(within(group).getByRole("button", { name: "전체" }).getAttribute("aria-pressed")).toBe("true");
    for (const s of WORSHIP_SERVICES) expect(card(s.name).getAttribute("data-match")).toBe("all");
  });

  it("수요일을 누르면 그날 드리는 예배만 켜지고 나머지는 흐려진다", () => {
    render(<WorshipSection />);
    const group = screen.getByRole("group", { name: WORSHIP.dayFilterLabel });
    fireEvent.click(within(group).getByRole("button", { name: /^수/ }));
    expect(within(group).getByRole("button", { name: /^수/ }).getAttribute("aria-pressed")).toBe("true");
    for (const s of WORSHIP_SERVICES) {
      expect(card(s.name).getAttribute("data-match")).toBe(s.schedule.days.includes(3) ? "on" : "off");
    }
  });

  it("오늘 요일 칩에 '오늘' 표시(한국 시간)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-10T16:00:00Z")); // KST 11/11(수)
    render(<WorshipSection />);
    const group = screen.getByRole("group", { name: WORSHIP.dayFilterLabel });
    expect(within(group).getByRole("button", { name: /오늘/ }).textContent).toMatch(/^수/);
  });
});
