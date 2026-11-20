import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const { useAlbumMock } = vi.hoisted(() => ({ useAlbumMock: vi.fn() }));
vi.mock("./queries", () => ({ useAlbum: useAlbumMock }));
vi.mock("./PhotoGrid", () => ({ PhotoGrid: () => "PHOTOGRID" }));
// AlbumDetailActions(useRouter·RequirePermission 포함) 무력화 — 권한 게이트 동작은 GalleryAdminActions.test에서 검증.
vi.mock("./GalleryAdminActions", () => ({ AlbumDetailActions: () => null, AlbumListAction: () => null }));
vi.mock("@/components/common/MarkdownContent", () => ({
  MarkdownContent: ({ source, mediaUrls }: { source: string; mediaUrls?: Record<string, string> }) => (
    <div data-media-urls={JSON.stringify(mediaUrls ?? null)}>{source}</div>
  ),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/gallery/albums/5" }));

import { AlbumDetail } from "./AlbumDetail";
import { ApiError } from "@/lib/auth/apiError";
const state = (over: Record<string, unknown>) => detailState(over);

function detailState(over: Record<string, unknown>) {
  return { data: undefined, isPending: false, isError: false, refetch: vi.fn(), ...over };
}
const album = {
  id: 5, title: "가을 행사", description: "본문 마크다운", tags: [{ id: 2, name: "행사" }],
  author: "관리자", createdAt: "2026-06-14T10:00:00", updatedAt: "x", version: 0,
  photos: [{ id: 1, mediaId: 10, caption: null, sortOrder: 0 }],
};

beforeEach(() => useAlbumMock.mockReset());

describe("AlbumDetail", () => {
  it("로딩 중엔 제목을 렌더하지 않는다", () => {
    useAlbumMock.mockReturnValue(detailState({ isPending: true }));
    render(<AlbumDetail id={5} />);
    expect(screen.queryByText("가을 행사")).toBeNull();
  });

  it("에러면 다시 시도 버튼을 보인다", () => {
    useAlbumMock.mockReturnValue(detailState({ isError: true }));
    render(<AlbumDetail id={5} />);
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
  });

  it("성공 시 제목·메타·태그·마크다운·사진그리드를 렌더한다", () => {
    useAlbumMock.mockReturnValue(detailState({ data: album }));
    render(<AlbumDetail id={5} />);
    expect(screen.getByText("가을 행사")).toBeDefined();
    expect(screen.getByText(/사진 1장/)).toBeDefined();
    expect(screen.getByText("행사").closest("a")?.getAttribute("href")).toBe("/gallery?tagId=2");
    expect(screen.getByText("본문 마크다운")).toBeDefined();
    expect(screen.getByText("PHOTOGRID")).toBeDefined();
  });

  it("description이 없으면 마크다운을 렌더하지 않지만 사진그리드는 보인다", () => {
    useAlbumMock.mockReturnValue(detailState({ data: { ...album, description: null } }));
    render(<AlbumDetail id={5} />);
    expect(screen.queryByText("본문 마크다운")).toBeNull();
    expect(screen.getByText("PHOTOGRID")).toBeDefined();
  });

  it("설명 본문에 응답의 mediaUrls(서명 경로)를 넘긴다", () => {
    const mediaUrls = { "10": "/api/media/10?exp=1&sig=a" };
    useAlbumMock.mockReturnValue(detailState({ data: { ...album, mediaUrls } }));
    render(<AlbumDetail id={5} />);
    expect(screen.getByText("본문 마크다운").getAttribute("data-media-urls")).toBe(JSON.stringify(mediaUrls));
  });
});

// 교인 전용 글·낡은 설정: 401/403은 오류가 아니라 MemberGate와 같은 안내(errorCode 분기)
describe("AlbumDetail 접근 안내", () => {
  it("401 INVALID_TOKEN이면 로그인 안내와 로그인 링크", () => {
    useAlbumMock.mockReturnValue(state({ isError: true, error: new ApiError(401, "INVALID_TOKEN", undefined) }));
    render(<AlbumDetail id={5} />);
    expect(screen.getByText("로그인 후 이용 가능합니다")).toBeDefined();
    expect(screen.getByText("갤러리는 교인 전용입니다. 로그인해 주세요.")).toBeDefined();
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login?next=%2Fgallery%2Falbums%2F5");
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });
  it("403 ACCESS_DENIED면 승인 안내", () => {
    useAlbumMock.mockReturnValue(state({ isError: true, error: new ApiError(403, "ACCESS_DENIED", undefined) }));
    render(<AlbumDetail id={5} />);
    expect(screen.getByText("교인 승인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });
  it("대조: 500이면 지금처럼 '불러오지 못했습니다' + 다시 시도", () => {
    useAlbumMock.mockReturnValue(state({ isError: true, error: new ApiError(500, "INTERNAL_ERROR", undefined) }));
    render(<AlbumDetail id={5} />);
    expect(screen.getByText("앨범을 불러오지 못했습니다.")).toBeDefined();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
    expect(screen.queryByText("로그인 후 이용 가능합니다")).toBeNull();
  });
});

describe("AlbumDetail 교인만 배지", () => {
  it("교인만 앨범이면 제목 옆에 '교인만' 배지", () => {
    useAlbumMock.mockReturnValue(detailState({ data: { ...album, membersOnly: true } }));
    render(<AlbumDetail id={5} />);
    expect(screen.getByText("교인만")).toBeDefined();
  });
  it("대조: 일반 앨범은 배지 없음", () => {
    useAlbumMock.mockReturnValue(detailState({ data: { ...album, membersOnly: false } }));
    render(<AlbumDetail id={5} />);
    expect(screen.queryByText("교인만")).toBeNull();
  });
  // #201 — 메뉴 전체가 교인만이면 글 단위 표시는 의미가 없어 누구에게도 보이지 않는다.
  it("메뉴가 교인만이면 표시한 앨범에도 배지 없음", () => {
    useAlbumMock.mockReturnValue(detailState({ data: { ...album, membersOnly: true } }));
    render(<AlbumDetail id={5} menuLevel="MEMBERS" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(screen.queryByText("교인만")).toBeNull();
  });
  it("회귀: 메뉴가 누구나면 표시한 앨범에 배지", () => {
    useAlbumMock.mockReturnValue(detailState({ data: { ...album, membersOnly: true } }));
    render(<AlbumDetail id={5} menuLevel="PUBLIC" />);
    expect(screen.getByText("교인만")).toBeDefined();
  });
});
