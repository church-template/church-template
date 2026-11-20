import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

// next/link → plain <a> (DepartmentCard.test.tsx 컨벤션과 동일)
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const { useAlbumsMock, useGalleryTagsMock, searchParamsRef, perms } = vi.hoisted(() => ({
  searchParamsRef: { current: new URLSearchParams("") },
  perms: { current: ["GALLERY_WRITE"] as string[] },
  useAlbumsMock: vi.fn(),
  useGalleryTagsMock: vi.fn(),
}));
vi.mock("./queries", () => ({ useAlbums: useAlbumsMock, useGalleryTags: useGalleryTagsMock }));
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParamsRef.current, usePathname: () => "/gallery" }));
vi.mock("@/lib/auth/useMe", () => ({ useHasPermission: (p: string) => perms.current.includes(p) }));
// 자식 컴포넌트는 격리 — 링크 중복/Suspense 회피.
vi.mock("@/components/common/TagFilter", () => ({ TagFilter: () => null }));
vi.mock("@/components/common/Pagination", () => ({ Pagination: () => "PAGINATION" }));
// AlbumListAction(RequirePermission 포함) 무력화 — 권한 게이트 동작은 GalleryAdminActions.test에서 검증.
vi.mock("./GalleryAdminActions", () => ({ AlbumListAction: () => null, AlbumDetailActions: () => null }));
// 글 단위 버튼·배너의 권한·저장 동작은 MembersOnlyToggle.test에서 — 여기선 자리(카드 밖·1회)만 본다.
vi.mock("@/components/visibility/MembersOnlyToggle", () => ({
  MembersOnlyToggle: ({ id, departmentLinked, pickMode }: { id: number; departmentLinked?: boolean; pickMode?: boolean }) => (
    <button type="button" data-linked={String(!!departmentLinked)} data-pick={String(!!pickMode)}>{`TOGGLE-${id}`}</button>
  ),
  MembersOnlyBanner: ({ menuLevel }: { menuLevel: string }) =>
    menuLevel === "MEMBERS" ? <p>지금은 전체가 교인 전용입니다</p> : null,
}));

import { AlbumList } from "./AlbumList";
import { ApiError } from "@/lib/auth/apiError";
const state = (over: Record<string, unknown>) => albumsState(over);

function albumsState(over: Record<string, unknown>) {
  return { data: undefined, isPending: false, isError: false, refetch: vi.fn(), ...over };
}
const card = {
  id: 1, title: "A", thumbnailMediaId: null, photoCount: 0,
  createdAt: "2026-06-14T10:00:00", tags: [], author: null,
};

beforeEach(() => {
  useAlbumsMock.mockReset();
  useGalleryTagsMock.mockReturnValue({ data: [], isPending: false, isError: false });
  searchParamsRef.current = new URLSearchParams("");
  perms.current = ["GALLERY_WRITE"];
});

describe("AlbumList", () => {
  it("로딩 중엔 카드 링크가 없다(스켈레톤)", () => {
    useAlbumsMock.mockReturnValue(albumsState({ isPending: true }));
    render(<AlbumList menuLevel="PUBLIC" />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("빈 배열이면 EmptyState를 보인다", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [], page: { size: 12, number: 0, totalElements: 0, totalPages: 0 } } }));
    render(<AlbumList menuLevel="PUBLIC" />);
    expect(screen.getByText("등록된 앨범이 없습니다.")).toBeDefined();
  });

  it("앨범이 있으면 카드 그리드를 보인다", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [card], page: { size: 12, number: 0, totalElements: 1, totalPages: 1 } } }));
    render(<AlbumList menuLevel="PUBLIC" />);
    expect(screen.getByText("A")).toBeDefined();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/gallery/albums/1");
  });

  it("여러 페이지면 페이지네이션을 보인다", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [card], page: { size: 12, number: 0, totalElements: 30, totalPages: 3 } } }));
    render(<AlbumList menuLevel="PUBLIC" />);
    expect(screen.queryByText("PAGINATION")).not.toBeNull();
  });

  it("한 페이지면 페이지네이션을 숨긴다", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [card], page: { size: 12, number: 0, totalElements: 1, totalPages: 1 } } }));
    render(<AlbumList menuLevel="PUBLIC" />);
    expect(screen.queryByText("PAGINATION")).toBeNull();
  });

  it("에러면 다시 시도 버튼을 보이고, 클릭하면 refetch를 호출한다", () => {
    const refetch = vi.fn();
    useAlbumsMock.mockReturnValue(albumsState({ isError: true, refetch }));
    render(<AlbumList menuLevel="PUBLIC" />);
    const btn = screen.getByRole("button", { name: "다시 시도" });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(refetch).toHaveBeenCalled();
  });
});

// 교인 전용 글·낡은 설정: 401/403은 오류가 아니라 MemberGate와 같은 안내(errorCode 분기)
describe("AlbumList 접근 안내", () => {
  it("401 INVALID_TOKEN이면 로그인 안내와 로그인 링크", () => {
    useAlbumsMock.mockReturnValue(state({ isError: true, error: new ApiError(401, "INVALID_TOKEN", undefined) }));
    render(<AlbumList menuLevel="PUBLIC" />);
    expect(screen.getByText("로그인 후 이용 가능합니다")).toBeDefined();
    expect(screen.getByText("갤러리는 교인 전용입니다. 로그인해 주세요.")).toBeDefined();
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login?next=%2Fgallery");
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });
  it("403 ACCESS_DENIED면 승인 안내", () => {
    useAlbumsMock.mockReturnValue(state({ isError: true, error: new ApiError(403, "ACCESS_DENIED", undefined) }));
    render(<AlbumList menuLevel="PUBLIC" />);
    expect(screen.getByText("교인 승인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });
  it("대조: 500이면 지금처럼 '불러오지 못했습니다' + 다시 시도", () => {
    useAlbumsMock.mockReturnValue(state({ isError: true, error: new ApiError(500, "INTERNAL_ERROR", undefined) }));
    render(<AlbumList menuLevel="PUBLIC" />);
    expect(screen.getByText("앨범을 불러오지 못했습니다.")).toBeDefined();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
    expect(screen.queryByText("로그인 후 이용 가능합니다")).toBeNull();
  });
});

// 앨범 한 건의 교인만(#198) — 카드 전체가 링크라 버튼은 카드 밖 형제, 배너는 목록 위 한 번.
describe("AlbumList 교인만 표시", () => {
  const pg = { size: 12, number: 0, totalElements: 3, totalPages: 1 };
  const a1 = { ...card, id: 1, title: "A1", version: 1, membersOnly: false, departmentLinked: true };
  const a2 = { ...card, id: 2, title: "A2", version: 1, membersOnly: true };
  const a3 = { ...card, id: 3, title: "A3", version: 1, membersOnly: false };

  it("토글 버튼은 카드 링크 밖 형제이고 부서 연결 여부를 넘긴다", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [a1, a2, a3], page: pg } }));
    render(<AlbumList menuLevel="PUBLIC" />);
    const btn = screen.getByRole("button", { name: "TOGGLE-1" });
    expect(btn.closest("a")).toBeNull();
    expect(btn.getAttribute("data-linked")).toBe("true");
    expect(screen.getByRole("button", { name: "TOGGLE-2" }).getAttribute("data-linked")).toBe("false");
  });

  it("메뉴가 교인만이면 배너는 목록 위에 정확히 1개", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [a1, a2, a3], page: pg } }));
    render(<AlbumList menuLevel="MEMBERS" />);
    expect(screen.getAllByText("지금은 전체가 교인 전용입니다")).toHaveLength(1);
  });

  it("대조: 메뉴가 누구나면 배너 없음", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [a1, a2, a3], page: pg } }));
    render(<AlbumList menuLevel="PUBLIC" />);
    expect(screen.queryByText("지금은 전체가 교인 전용입니다")).toBeNull();
  });

  it("version이 없는 카드(구 백엔드)는 버튼을 그리지 않는다", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [a3, { ...card, id: 4, title: "A4" }], page: pg } }));
    render(<AlbumList menuLevel="PUBLIC" />);
    expect(screen.getByRole("button", { name: "TOGGLE-3" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "TOGGLE-4" })).toBeNull();
  });
});

// 교인만 메뉴(#201) — 기본은 글 단위 버튼·배지를 숨기고, 쓰기 권한자의 고르기 모드(?pick=1)에서만 버튼을 보인다.
describe("AlbumList 교인만 메뉴의 고르기 모드", () => {
  const pg = { size: 12, number: 0, totalElements: 3, totalPages: 1 };
  const a1 = { ...card, id: 1, title: "A1", version: 1, membersOnly: false, departmentLinked: true };
  const a2 = { ...card, id: 2, title: "A2", version: 1, membersOnly: true };
  const toggles = () => screen.queryAllByRole("button").filter((el) => el.textContent?.startsWith("TOGGLE-"));

  it("교인만 메뉴 기본: 쓰기 권한자에게도 버튼·배지가 없다", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [a1, a2], page: pg } }));
    const { container } = render(<AlbumList menuLevel="MEMBERS" />);
    expect(toggles()).toHaveLength(0);
    expect(container.textContent).not.toContain("교인만");
  });

  it("교인만 메뉴 + pick=1 + 쓰기 권한: 카드마다 고르기 버튼(카드 링크 밖, 부서 연결 전달), 배지 없음", () => {
    searchParamsRef.current = new URLSearchParams("pick=1");
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [a1, a2], page: pg } }));
    const { container } = render(<AlbumList menuLevel="MEMBERS" />);
    const btns = toggles();
    expect(btns.map((el) => el.getAttribute("data-pick"))).toEqual(["true", "true"]);
    expect(btns[0].getAttribute("data-linked")).toBe("true");
    btns.forEach((el) => expect(el.closest("a")).toBeNull());
    expect(container.textContent).not.toContain("교인만");
  });

  it("pick은 목록 조회 조건이 아니다", () => {
    searchParamsRef.current = new URLSearchParams("pick=1&tagId=2");
    useAlbumsMock.mockReturnValue(albumsState({ isPending: true }));
    render(<AlbumList menuLevel="MEMBERS" />);
    expect(useAlbumsMock).toHaveBeenCalledWith({ page: 0, tagId: 2 });
  });

  it("대조: pick=1이라도 쓰기 권한이 없으면 버튼이 없다", () => {
    perms.current = [];
    searchParamsRef.current = new URLSearchParams("pick=1");
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [a1, a2], page: pg } }));
    render(<AlbumList menuLevel="MEMBERS" />);
    expect(toggles()).toHaveLength(0);
  });

  it("회귀: 누구나 메뉴는 지금 그대로 — 지금 상태 글자 버튼 + 교인만 배지, pick=1도 무시", () => {
    searchParamsRef.current = new URLSearchParams("pick=1");
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [a1, a2], page: pg } }));
    render(<AlbumList menuLevel="PUBLIC" />);
    expect(toggles().map((el) => el.getAttribute("data-pick"))).toEqual(["false", "false"]);
    expect((screen.getByText("A2").closest("a") as HTMLElement).textContent).toContain("교인만");
    expect((screen.getByText("A1").closest("a") as HTMLElement).textContent).not.toContain("교인만");
  });
});
