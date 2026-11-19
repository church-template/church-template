import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { AlbumCard } from "./AlbumCard";
import type { GalleryAlbumCardResponse } from "@/lib/api/types";

const base: GalleryAlbumCardResponse = {
  id: 3,
  title: "여름 수련회",
  thumbnailMediaId: 42,
  photoCount: 12,
  createdAt: "2026-06-14T10:00:00",
  tags: [{ id: 1, name: "수련회" }],
  author: "관리자",
};

describe("AlbumCard", () => {
  it("상세 링크와 썸네일 URL을 렌더한다", () => {
    const { container } = render(<AlbumCard album={base} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/gallery/albums/3");
    const src = container.querySelector("img")?.getAttribute("src") ?? "";
    expect(src).toBe("/api/media/42");
  });

  // 공개 범위가 바뀔 수 있는 미디어 — 최적화 캐시(31일)는 지울 수 없어 교인만으로 바꿔도 남는다(6.6-16).
  it("썸네일은 서명 주소가 없어도 최적화하지 않는다", () => {
    const { container } = render(<AlbumCard album={{ ...base, thumbnailUrl: undefined }} />);
    const src = container.querySelector("img")?.getAttribute("src") ?? "";
    expect(src.startsWith("/_next/image")).toBe(false);
  });

  it("대조: 서명 주소가 있으면 그 주소를 그대로 쓴다", () => {
    const { container } = render(<AlbumCard album={{ ...base, thumbnailUrl: "/api/media/42?exp=1&sig=t" }} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/api/media/42?exp=1&sig=t");
  });

  it("thumbnailMediaId가 null이면 이미지 대신 플레이스홀더를 렌더한다", () => {
    const { container } = render(<AlbumCard album={{ ...base, thumbnailMediaId: null }} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("제목·작성일·사진 수·작성자·태그를 표시한다", () => {
    render(<AlbumCard album={base} />);
    expect(screen.getByText("여름 수련회")).toBeDefined();
    expect(screen.getByText(/사진 12장/)).toBeDefined();
    expect(screen.getByText(/관리자/)).toBeDefined();
    expect(screen.getByText("수련회")).toBeDefined();
  });

  it("작성자가 없으면 작성자 텍스트를 생략한다", () => {
    render(<AlbumCard album={{ ...base, author: null }} />);
    expect(screen.queryByText(/관리자/)).toBeNull();
  });

  it("thumbnailUrl(서명 경로)이 있으면 그 주소를 최적화 없이 쓴다", () => {
    const { container } = render(<AlbumCard album={{ ...base, thumbnailUrl: "/api/media/42?exp=9&sig=s" }} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/api/media/42?exp=9&sig=s");
  });

  it("thumbnailUrl이 null이면 thumbnailMediaId가 있어도 플레이스홀더(썸네일 없음)", () => {
    const { container } = render(<AlbumCard album={{ ...base, thumbnailUrl: null }} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("교인만 앨범이면 제목 옆에 '교인만' 배지", () => {
    render(<AlbumCard album={{ ...base, membersOnly: true }} />);
    expect(screen.getByText("교인만")).toBeDefined();
  });

  it("대조: 일반 앨범에는 배지가 없다", () => {
    render(<AlbumCard album={{ ...base, membersOnly: false }} />);
    expect(screen.queryByText("교인만")).toBeNull();
  });
});
