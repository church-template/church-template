import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";
import { WorshipRegular } from "./WorshipRegular";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe("WorshipRegular (주중 예배 표)", () => {
  it("대표 예배(주일)를 뺀 예배를 이름·시간·찬양 시간과 함께 행으로 렌더한다", () => {
    // Reveal이 useEffect에서 matchMedia 호출 — jsdom 미구현이라 reduced 경로로 스텁(about/* 관례).
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipRegular />);

    expect(screen.getByRole("heading", { level: 2, name: WORSHIP.weekdayHeading })).toBeDefined();
    const weekday = WORSHIP_SERVICES.filter((s) => !s.primary);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
      weekday.map((s) => s.name),
    );
    expect(screen.queryByRole("heading", { level: 3, name: "주일예배" })).toBeNull();

    const wed = WORSHIP_SERVICES.find((s) => s.name === "수요예배")!;
    expect(screen.getByText(wed.time)).toBeDefined();
    expect(screen.getByText(new RegExp(wed.praise!))).toBeDefined();
  });

  it("시간을 강조 위계(datetime-lg·primary)로 렌더하고 설교 진입 CTA를 둔다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipRegular />);

    const wed = WORSHIP_SERVICES.find((s) => s.name === "수요예배")!;
    const time = screen.getByText(wed.time);
    expect(time.className).toContain("text-datetime-lg");
    expect(time.className).toContain("text-primary");

    const cta = screen.getByRole("link", { name: WORSHIP.sermonCta });
    expect(cta.getAttribute("href")).toBe("/sermons");
  });
});
