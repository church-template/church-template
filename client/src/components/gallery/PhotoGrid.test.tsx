import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PhotoGrid } from "./PhotoGrid";
import type { GalleryPhotoResponse } from "@/lib/api/types";

const photos: GalleryPhotoResponse[] = [
  { id: 1, mediaId: 10, caption: "첫째", sortOrder: 0 },
  { id: 2, mediaId: 20, caption: null, sortOrder: 1 },
  { id: 3, mediaId: 30, caption: "셋째", sortOrder: 2 },
];

describe("PhotoGrid", () => {
  it("사진이 없으면 EmptyState를 보인다", () => {
    render(<PhotoGrid photos={[]} albumTitle="앨범" />);
    expect(screen.getByText("등록된 사진이 없습니다.")).toBeDefined();
  });

  it("사진 수만큼 썸네일 버튼을 렌더한다", () => {
    render(<PhotoGrid photos={photos} albumTitle="앨범" />);
    expect(
      screen.getAllByRole("button", { name: /번째 사진 크게 보기/ }).length,
    ).toBe(photos.length);
  });

  it("썸네일 클릭 시 라이트박스(dialog)가 열린다", () => {
    render(<PhotoGrid photos={photos} albumTitle="앨범" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "1번째 사진 크게 보기" }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("사진 url(서명 경로)이 있으면 그것을, 없으면 mediaId로 조립한다", () => {
    const { container } = render(
      <PhotoGrid photos={[{ ...photos[0], url: "/api/media/10?exp=1&sig=a" }, photos[1]]} albumTitle="앨범" />,
    );
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src") ?? "");
    expect(srcs[0]).toBe("/api/media/10?exp=1&sig=a");
    expect(srcs[1]).toBe("/api/media/20"); // 공개 범위가 바뀔 수 있어 최적화하지 않는다(6.6-16)
  });

  it("사진은 서명 주소가 없어도 최적화하지 않는다", () => {
    const { container } = render(<PhotoGrid photos={[photos[1]]} albumTitle="앨범" />);
    const src = container.querySelector("img")?.getAttribute("src") ?? "";
    expect(src.startsWith("/_next/image")).toBe(false);
  });

  it("라이트박스도 서명 url을 쓴다", () => {
    render(<PhotoGrid photos={[{ ...photos[0], url: "/api/media/10?exp=1&sig=a" }]} albumTitle="앨범" />);
    fireEvent.click(screen.getByRole("button", { name: "1번째 사진 크게 보기" }));
    const big = screen.getByRole("dialog").querySelector("img");
    expect(big?.getAttribute("src")).toBe("/api/media/10?exp=1&sig=a");
  });
});
