import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryBand } from "./HistoryBand";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const motion = (reduced: boolean) => vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced })));
const items = () => [...document.querySelectorAll("[data-history-item]")];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("HistoryBand (그려지는 타임라인)", () => {
  it("연혁 항목마다 연도·연월·헤드라인·설명·사진", () => {
    motion(true);
    const { container } = render(<HistoryBand />);
    expect(screen.getByRole("heading", { level: 2, name: HISTORY.headline })).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(HISTORY.items.length);
    for (const item of HISTORY.items) {
      expect(screen.getByText(item.year)).toBeDefined();
      expect(screen.getByRole("heading", { level: 3, name: item.text })).toBeDefined();
      expect(screen.getByText(item.desc)).toBeDefined();
    }
    const withMedia = HISTORY.items.filter((i) => i.media).length;
    expect(container.querySelectorAll("li img, li video")).toHaveLength(withMedia);
  });

  it("'전체 연혁 보기' 링크가 /about/history를 가리킨다", () => {
    motion(true);
    render(<HistoryBand />);
    expect(screen.getByText("전체 연혁 보기").getAttribute("href")).toBe("/about/history");
  });

  it("JS가 붙기 전(SSR)·reduced-motion이면 숨김 연출을 걸지 않는다", () => {
    motion(true);
    const { container } = render(<HistoryBand />);
    expect(container.querySelector("[data-armed]")).toBeNull();
  });

  it("스크롤로 선이 점에 닿은 항목만 켜지고, 켜진 항목은 다시 꺼지지 않는다", () => {
    motion(false);
    vi.stubGlobal("innerHeight", 1000);
    // 스크롤 갱신은 rAF로 모은다 — 테스트에선 즉시 실행(반환 0 = 대기 중인 프레임 없음)
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => (cb(0), 0));
    // 항목 i의 점 위치 = 300 + i*400 → 뷰포트 60%(600) 위인 항목 0만 켜진다
    let shift = 0;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const i = Number((this.closest("[data-history-item]") as HTMLElement | null)?.dataset.index ?? -1);
      const top = (i < 0 ? 200 : 300 + i * 400) - shift;
      return { top, bottom: top + 2800, height: 2800, left: 0, right: 0, width: 0, x: 0, y: top, toJSON() {} } as DOMRect;
    });
    const { container } = render(<HistoryBand />);
    expect(container.querySelector("[data-armed]")).not.toBeNull();
    expect(items().map((el) => el.hasAttribute("data-on"))).toEqual(HISTORY.items.map((_, i) => i === 0));

    shift = 450; // 항목 1의 점이 250 → 켜짐
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(items()[1].hasAttribute("data-on")).toBe(true);

    shift = 0; // 위로 되돌아가도 유지
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(items()[1].hasAttribute("data-on")).toBe(true);
  });
});
