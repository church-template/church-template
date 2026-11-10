import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { MinistryShowcase } from "./MinistryShowcase";
import type { Department } from "@/constants/departments";

const dept = (slug: string, name: string): Department => ({
  slug,
  name,
  description: "",
  media: { type: "image", src: `/dept/${slug}.webp`, alt: name },
  caption: [`${name} 문구`],
  summary: `${name} 소개`,
  when: "매주 토요일 오전 11시",
});
const depts = [dept("student", "학생부"), dept("youth", "청년부"), dept("praise", "예배부")];

// IntersectionObserver 콜백을 붙잡아 "가운데 띠에 들어옴"을 흉내 낸다.
let fire: (target: Element) => void = () => {};
function stubIO() {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: { isIntersecting: boolean; target: Element }[]) => void) {
        fire = (target) => cb([{ isIntersecting: true, target }]);
      }
      observe() {}
      disconnect() {}
    },
  );
}
afterEach(() => vi.unstubAllGlobals());

describe("MinistryShowcase", () => {
  it("모든 부서의 문구·소개·모임 시간·상세 링크를 처음부터 보여 준다", () => {
    stubIO();
    render(<MinistryShowcase departments={depts} />);
    for (const d of depts) {
      expect(screen.getByRole("heading", { level: 2, name: `${d.name} 문구` })).toBeDefined();
      expect(screen.getByText(`${d.name} 소개`)).toBeDefined();
      expect(screen.getByRole("link", { name: `${d.name} 자세히 보기` }).getAttribute("href")).toBe(
        `/departments/${d.slug}`,
      );
    }
    expect(screen.getAllByText("매주 토요일 오전 11시")).toHaveLength(3);
  });

  it("처음에는 첫 부서가 켜져 있고, 가운데 띠에 들어온 부서로 바뀐다", () => {
    stubIO();
    render(<MinistryShowcase departments={depts} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-active"))).toEqual(["true", "false", "false"]);
    expect(screen.getByText("1 / 3")).toBeDefined();

    act(() => fire(items[2]));
    expect(items.map((li) => li.getAttribute("data-active"))).toEqual(["false", "false", "true"]);
    expect(screen.getByText("3 / 3")).toBeDefined();
  });

  it("고정 무대의 사진은 장식(중복)이라 숨기고, 부서별 사진만 대체 텍스트를 갖는다", () => {
    stubIO();
    render(<MinistryShowcase departments={depts} />);
    expect(screen.getAllByRole("img").map((i) => i.getAttribute("alt"))).toEqual(["학생부", "청년부", "예배부"]);
  });
});
