import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { COLLAGE_SECTION } from "@/constants/content";
import { COLLAGE_TILES } from "@/constants/church";
import { CollageStory, sceneFrame } from "./CollageStory";

const motion = (reduced: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reduced, addEventListener: () => {}, removeEventListener: () => {} })),
  );
afterEach(() => vi.unstubAllGlobals());

describe("CollageStory (이렇게 모이고, 나눕니다)", () => {
  it("서브타이틀·제목 + 장면마다 사진·제목·설명이 모두 문서에 있다(JS 없이도 읽힌다)", () => {
    motion(true);
    const { container } = render(<CollageStory />);
    expect(screen.getByText(COLLAGE_SECTION.eyebrow)).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: COLLAGE_SECTION.title })).toBeDefined();
    expect(container.querySelectorAll("[data-scene]")).toHaveLength(COLLAGE_TILES.length);
    for (const t of COLLAGE_TILES) {
      expect(screen.getByRole("heading", { level: 3, name: t.title })).toBeDefined();
      expect(screen.getByText(t.desc)).toBeDefined();
      expect(container.querySelector(`img[src="${t.src}"]`)).not.toBeNull();
    }
  });

  it("reduced-motion은 고정·페이드를 걸지 않는다(정적 목록), 섹션 길이는 장면 수 변수로 잡는다", () => {
    motion(true);
    const { container } = render(<CollageStory />);
    const root = container.querySelector("section")!;
    expect(root.hasAttribute("data-armed")).toBe(false);
    expect(root.style.getPropertyValue("--scenes")).toBe(String(COLLAGE_TILES.length));
  });
});

describe("CollageStory 장착", () => {
  it("모션 허용이면 장착하고 첫 장면만 켠다, 언마운트하면 되돌린다", () => {
    motion(false);
    const { container, unmount } = render(<CollageStory />);
    const root = container.querySelector("section")!;
    const scenes = [...container.querySelectorAll<HTMLElement>("[data-scene]")];
    expect(root.hasAttribute("data-armed")).toBe(true);
    expect(scenes.map((s) => s.style.opacity)).toEqual(["1", ...scenes.slice(1).map(() => "0")]);
    unmount();
    expect(root.hasAttribute("data-armed")).toBe(false);
    expect(scenes[1].style.opacity).toBe("");
  });
});

describe("sceneFrame (스크롤 진행도 → 장면 상태)", () => {
  it("처음엔 첫 장면만, 끝엔 마지막 장면만 보인다", () => {
    expect(sceneFrame(0, 4)).toEqual({ photo: [1, 0, 0, 0], caption: [1, 0, 0, 0] });
    expect(sceneFrame(1, 4)).toEqual({ photo: [1, 1, 1, 1], caption: [0, 0, 0, 1] });
  });

  it("전환 중간엔 다음 사진이 반쯤 나타나고 글은 둘 다 꺼져 있다(글이 겹쳐 보이지 않게)", () => {
    // 4장 = 전환 3번. 첫 전환의 45% 지점 — 사진 페이드 구간(0.2~0.7)의 정중앙
    const { photo, caption } = sceneFrame(0.45 / 3, 4);
    expect(photo[0]).toBe(1);
    expect(photo[1]).toBeCloseTo(0.5);
    expect(photo[2]).toBe(0);
    expect(caption).toEqual([0, 0, 0, 0]);
  });

  it("범위를 벗어난 진행도는 잘라 낸다", () => {
    expect(sceneFrame(-1, 3)).toEqual(sceneFrame(0, 3));
    expect(sceneFrame(2, 3)).toEqual(sceneFrame(1, 3));
    expect(sceneFrame(NaN, 3)).toEqual(sceneFrame(0, 3)); // 레이아웃 전(높이 0) 0/0
  });
});
