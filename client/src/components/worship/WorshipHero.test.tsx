import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";
import { WorshipHero } from "./WorshipHero";

describe("WorshipHero", () => {
  it("페이지 제목(h1)과 대표 예배(주일)의 시간·이름·장소를 보여 준다", () => {
    render(<WorshipHero />);
    const main = WORSHIP_SERVICES.find((s) => s.primary)!;
    expect(main.name).toBe("주일예배");
    expect(screen.getByRole("heading", { level: 1, name: WORSHIP.title })).toBeDefined();
    expect(screen.getByText(main.time)).toBeDefined();
    expect(screen.getByText(`${main.name} · ${main.place}`)).toBeDefined();
    expect(screen.getByRole("img").getAttribute("alt")).toBe(WORSHIP.hero.alt);
  });
});
