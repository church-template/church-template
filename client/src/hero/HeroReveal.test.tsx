import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HeroReveal from "./HeroReveal";

afterEach(() => vi.unstubAllGlobals());

const reducedMotion = () =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })),
  );

describe("HeroReveal", () => {
  it("십자가 덮개·영상·포스터·카피만 그린다 — 콜라주 타일은 히어로 밖 섹션(#157)", () => {
    reducedMotion();
    const { container } = render(
      <HeroReveal
        media={{ type: "video", src: "/hero.mp4", poster: "/hero-poster.jpeg" }}
        caption="함께함이 축복이 되는 교회"
        posterAspect={1.32}
      />,
    );
    expect(container.querySelector("video")).not.toBeNull();
    expect(container.querySelector("mask#crossMask")).not.toBeNull();
    expect([...container.querySelectorAll("img")].map((i) => i.getAttribute("src"))).toEqual(["/hero-poster.jpeg"]);
    expect(screen.getByText("함께함이 축복이 되는 교회")).toBeDefined();
  });
});
