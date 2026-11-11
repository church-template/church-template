import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PASTOR } from "@/constants/content";
import { PastorQuote } from "./PastorQuote";

afterEach(() => vi.unstubAllGlobals());

describe("PastorQuote", () => {
  it("맺음말 인용문과 직분·이름 서명을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<PastorQuote />);
    expect(screen.getByText(PASTOR.pullQuote)).toBeDefined();
    const sign = container.querySelector("figcaption");
    expect(sign?.textContent).toContain(PASTOR.position);
    expect(sign?.textContent).toContain(PASTOR.name);
    // 편지의 맺음말 — 카드·장식 글리프 없이 글만 둔다
    expect(container.querySelector("svg")).toBeNull();
  });
});
