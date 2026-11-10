import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WORSHIP } from "@/constants/content";
import { SundayFlow } from "./SundayFlow";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SundayFlow", () => {
  it("주일 아침 흐름을 시간순 3단계로 보여 준다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<SundayFlow />);
    expect(screen.getByRole("heading", { level: 2, name: WORSHIP.flowHeading })).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
      WORSHIP.flow.map((s) => s.title),
    );
    expect(screen.getByText("10:40")).toBeDefined();
  });

  it("다음 예배 띠가 지금 시각(한국 시간) 기준 다음 예배와 남은 시간을 보여 준다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T17:28:00+09:00")); // 화요일 오후
    render(<SundayFlow />);
    expect(screen.getByText(WORSHIP.nextLabel)).toBeDefined();
    expect(screen.getByText("새벽예배 · 수요일 오전 5:30")).toBeDefined();
    expect(screen.getByText("12시간 2분 뒤")).toBeDefined();
  });
});
