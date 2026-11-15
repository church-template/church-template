import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WORSHIP, SPECIAL_SERVICES } from "@/constants/content";
import { WorshipSpecial } from "./WorshipSpecial";

afterEach(() => vi.useRealTimers());

describe("WorshipSpecial", () => {
  it("특별 예배를 줄 목록(시기·이름·설명·시간)으로 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipSpecial />);

    expect(screen.getByRole("heading", { level: 2, name: WORSHIP.specialHeading })).toBeDefined();
    // 예배 이름은 h3 — 전부(slice 회귀 방지)
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(SPECIAL_SERVICES.length);
    expect(screen.getAllByRole("listitem")).toHaveLength(SPECIAL_SERVICES.length);

    const first = SPECIAL_SERVICES[0]; // 송구영신 예배 — date/time/desc가 6종 중 유일값
    expect(screen.getByText(first.date)).toBeDefined();
    expect(screen.getByText(first.time)).toBeDefined();
    expect(screen.getByText(first.desc)).toBeDefined();
  });

  it("다음 특별 예배 띠 — 한국 날짜 기준 가장 가까운 예배와 남은 날", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T09:00:00+09:00")); // 추수감사주일 다음 날
    render(<WorshipSpecial />);

    expect(screen.getByText(WORSHIP.specialNextLabel)).toBeDefined();
    expect(screen.getByText("12월 25일 금요일 · 오전 11시")).toBeDefined();
    expect(screen.getByText("39일 남았어요")).toBeDefined();
  });
});
