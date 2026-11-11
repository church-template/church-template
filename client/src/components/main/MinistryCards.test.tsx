import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MINISTRY, MINISTRIES } from "@/constants/content";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { MinistryCards } from "./MinistryCards";

const trigger = (title: string) => screen.getByRole("button", { name: new RegExp(title) });

describe("MinistryCards (사역 사진 패널)", () => {
  it("섹션 헤딩 + 사역마다 사진·제목 버튼", () => {
    const { container } = render(<MinistryCards />);
    expect(screen.getByRole("heading", { level: 2, name: MINISTRY.title })).toBeDefined();
    for (const m of MINISTRIES) expect(trigger(m.title)).toBeDefined();
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(srcs).toEqual(MINISTRIES.map((m) => m.image));
  });

  it("처음엔 첫 패널만 펼쳐져 설명·링크가 보인다", () => {
    render(<MinistryCards />);
    const [first, ...rest] = MINISTRIES;
    expect(trigger(first.title).getAttribute("aria-expanded")).toBe("true");
    for (const m of rest) expect(trigger(m.title).getAttribute("aria-expanded")).toBe("false");
    const panel = document.getElementById(trigger(first.title).getAttribute("aria-controls")!)!;
    expect(within(panel).getByText(first.desc)).toBeDefined();
    expect(within(panel).getByRole("link", { name: first.cta }).getAttribute("href")).toBe(first.href);
  });

  it("다른 패널을 누르면(터치) 그 패널이 펼쳐지고 앞 패널은 접힌다", () => {
    render(<MinistryCards />);
    const [first, second] = MINISTRIES;
    fireEvent.click(trigger(second.title));
    expect(trigger(second.title).getAttribute("aria-expanded")).toBe("true");
    expect(trigger(first.title).getAttribute("aria-expanded")).toBe("false");
  });

  it("마우스를 올려도 펼쳐진다(PC)", () => {
    render(<MinistryCards />);
    const third = MINISTRIES[2];
    fireEvent.pointerEnter(trigger(third.title), { pointerType: "mouse" });
    expect(trigger(third.title).getAttribute("aria-expanded")).toBe("true");
  });

  it("접힌 패널의 링크는 키보드 순서에서 빠진다", () => {
    render(<MinistryCards />);
    const second = MINISTRIES[1];
    const panel = document.getElementById(trigger(second.title).getAttribute("aria-controls")!)!;
    expect(panel.hasAttribute("hidden") || panel.getAttribute("inert") !== null).toBe(true);
  });
});
