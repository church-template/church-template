import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// 헤더 전환 시점은 HeroReveal이 스크롤로 판정해 onSolid로 알린다 — 여기선 그 배선만 본다(콜백 캡처 후 수동 발화).
let onSolid: ((solid: boolean) => void) | undefined;
vi.mock("@/hero/HeroReveal", () => ({
  default: (props: { onSolid?: (solid: boolean) => void }) => {
    onSolid = props.onSolid;
    return <section data-testid="hero" />;
  },
}));

import { HeroHeaderSync } from "./HeroHeaderSync";

function setup(reduced = false) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reduced,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  render(
    <HeroHeaderSync media={{ type: "image", src: "/bg.jpg" }} caption="카피" posterAspect={1.32}>
      <p>본문</p>
    </HeroHeaderSync>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  onSolid = undefined;
});

describe("HeroHeaderSync", () => {
  it("초기에는 투명(on-dark) 헤더다", () => {
    setup();
    expect(screen.getByRole("banner").className).toContain("bg-transparent");
  });

  it("히어로 이탈 시 solid(라이트 스킨)로 전환한다", () => {
    setup();
    act(() => onSolid?.(true));
    expect(screen.getByRole("banner").className).toContain("bg-canvas");
  });

  it("본문 children은 main 랜드마크 안에 렌더된다", () => {
    setup();
    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getByText("본문")).toBeDefined();
  });

  it("히어로로 복귀 시 on-dark로 되돌아간다", () => {
    setup();
    act(() => onSolid?.(true));
    act(() => onSolid?.(false));
    expect(screen.getByRole("banner").className).toContain("bg-transparent");
  });

  it("reduced-motion이면 처음부터 라이트 스킨으로 고정한다", () => {
    setup(true);
    expect(screen.getByRole("banner").className).toContain("bg-canvas");
  });
});
