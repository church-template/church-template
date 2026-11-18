import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";
import { useFitAbove } from "./useFitAbove";

const rect = (top: number) => ({ top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
let barTop = 480;

function Probe() {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  useFitAbove(a, b);
  return (
    <>
      <div data-testid="a" ref={(el) => { (a as { current: HTMLDivElement | null }).current = el; if (el) el.getBoundingClientRect = () => rect(300); }} />
      <div ref={(el) => { (b as { current: HTMLDivElement | null }).current = el; if (el) el.getBoundingClientRect = () => rect(barTop); }} />
    </>
  );
}
const tick = () => new Promise((r) => setTimeout(r, 40));

afterEach(() => {
  barTop = 480;
  document.documentElement.style.removeProperty("--spacing-base");
  vi.unstubAllGlobals();
});

describe("useFitAbove", () => {
  it("남은 공간이 작아도 그 높이를 넘지 않는다(저장 막대 뒤로 숨지 않게)", async () => {
    document.documentElement.style.setProperty("--spacing-base", "16px");
    const { getByTestId } = render(<Probe />);
    await tick();
    expect(getByTestId("a").style.maxHeight).toBe("164px"); // 480 - 300 - 16
  });

  it("간격은 spacing.base 토큰에서 읽는다", async () => {
    document.documentElement.style.setProperty("--spacing-base", "20px");
    const { getByTestId } = render(<Probe />);
    await tick();
    expect(getByTestId("a").style.maxHeight).toBe("160px");
  });

  it("스크롤·창 크기 변경 없이 레이아웃만 바뀌어도 다시 맞춘다", async () => {
    let notify: () => void = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) { notify = cb; }
        observe() {}
        disconnect() {}
      },
    );
    document.documentElement.style.setProperty("--spacing-base", "16px");
    const { getByTestId } = render(<Probe />);
    await tick();
    barTop = 600; // 위쪽 제목이 줄바꿈되는 등 레이아웃 변화
    notify();
    await tick();
    expect(getByTestId("a").style.maxHeight).toBe("284px");
  });
});
