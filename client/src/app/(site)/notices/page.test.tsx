import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { getNotices, getTags } = vi.hoisted(() => ({
  getNotices: vi.fn(),
  getTags: vi.fn(async () => [{ id: 3, name: "행사" }]),
}));
// 상태 표시(VISIBILITY_MANAGE 게이트)는 VisibilityStatusLink.test가 본다 — 여기선 페이지가 넘기는 값만.
vi.mock("@/components/visibility/VisibilityStatusLink", () => ({
  VisibilityStatusLink: ({ level }: { level: string | null }) => <div data-testid="status" data-level={String(level)} />,
}));
vi.mock("@/lib/api/notices", () => ({ getNotices }));
// 설정 조회만 바꾸고 분기 helper(loadPublic·MembersOnlyError)는 실제 구현을 쓴다. 기본 null = 폴백(공지 누구나).
const { getVisibilityMock } = vi.hoisted(() => ({ getVisibilityMock: vi.fn() }));
vi.mock("@/lib/api/visibility", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/visibility")>()),
  getVisibility: getVisibilityMock,
}));
vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ permission, domainLabel, children }: { permission: string; domainLabel: string; children: ReactNode }) => (
    <div data-testid="gate" data-permission={permission} data-domain={domainLabel}>{children}</div>
  ),
}));
vi.mock("@/components/notices/NoticeMemberViews", () => ({
  NoticeListClient: ({ params, tags }: { params: unknown; tags: unknown[] }) => (
    <div data-testid="client-list" data-params={JSON.stringify(params)} data-tags={tags.length} />
  ),
}));
vi.mock("@/lib/api/tags", () => ({ getTags }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// 클라이언트 자식은 스텁(next/navigation·useMe 의존 차단) — 각자 단위 테스트가 커버.
vi.mock("@/components/common/SearchPill", () => ({ SearchPill: () => <div data-testid="search" /> }));
vi.mock("@/components/notices/NoticeAdminActions", () => ({ NoticeListAction: () => null }));
vi.mock("@/components/common/TagFilter", () => ({
  TagFilter: ({ tags }: { tags: unknown[] }) => <div data-testid="tagfilter" data-count={tags.length} />,
}));
vi.mock("@/components/common/Pagination", () => ({
  Pagination: ({ page }: { page: { totalPages: number } }) => (
    <div data-testid="pagination" data-total={page.totalPages} />
  ),
}));

import NoticesPage, { generateMetadata } from "./page";
import { MembersOnlyError } from "@/lib/api/visibility";

afterEach(() => { vi.clearAllMocks(); getVisibilityMock.mockReset(); });

const emptyPage = { content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } };

describe("NoticesPage (목록)", () => {
  it("searchParams를 파싱해 getNotices에 전달", async () => {
    getNotices.mockResolvedValueOnce(emptyPage);
    render(await NoticesPage({ searchParams: Promise.resolve({ q: "수련회", tagId: "3", page: "0" }) }));
    expect(getNotices).toHaveBeenCalledWith(
      expect.objectContaining({ q: "수련회", tagId: 3, page: 0 }),
    );
    expect(getTags).toHaveBeenCalled();
  });

  it("잘못된 쿼리 파라미터는 기본값으로 방어", async () => {
    getNotices.mockResolvedValueOnce(emptyPage);
    render(await NoticesPage({ searchParams: Promise.resolve({ tagId: "abc", page: "xyz" }) }));
    expect(getNotices).toHaveBeenCalledWith(
      expect.objectContaining({ tagId: undefined, page: undefined }),
    );
  });

  it("빈 목록이면 EmptyState", async () => {
    getNotices.mockResolvedValueOnce(emptyPage);
    render(await NoticesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("조건에 맞는 공지가 없습니다.")).toBeDefined();
  });

  it("고정 공지는 맨 위 '고정 공지'로, 나머지는 월별로 묶고 상세 링크·월일 날짜, totalPages>1이면 Pagination", async () => {
    getNotices.mockResolvedValueOnce({
      content: [
        { id: 5, title: "고정 공지글", isPinned: true, viewCount: 10, createdAt: "2026-06-01T09:00:00", tags: [], author: null },
        { id: 4, title: "일반 공지", isPinned: false, viewCount: 3, createdAt: "2026-05-28T09:00:00", tags: [], author: "김집사" },
      ],
      page: { size: 10, number: 0, totalElements: 20, totalPages: 2 },
    });
    render(await NoticesPage({ searchParams: Promise.resolve({}) }));
    // 서버가 준 순서 그대로 — 고정 공지(id 5)가 먼저
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/notices/5", "/notices/4"]);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["고정 공지", "2026년 5월"]);
    expect(screen.getByText("5월 28일")).toBeDefined();
    expect(screen.getByText("김집사")).toBeDefined();
    expect(screen.getByTestId("pagination").getAttribute("data-total")).toBe("2");
  });
});

const levels = (notices: "PUBLIC" | "MEMBERS") =>
  ({ notices, events: "PUBLIC", bulletins: "PUBLIC", sermons: "MEMBERS", gallery: "MEMBERS" }) as const;

// 공개 범위(#198) — 교인만이면 서버는 공지를 읽지 않고 게이트 + 브라우저 조회로 그린다.
describe("NoticesPage 공개 범위", () => {
  it("공지가 교인만이면 NOTICE_VIEW 게이트 + 브라우저 목록, 서버 조회 0회", async () => {
    getVisibilityMock.mockResolvedValue(levels("MEMBERS"));
    render(await NoticesPage({ searchParams: Promise.resolve({ q: "수련회" }) }));
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("NOTICE_VIEW");
    expect(screen.getByTestId("gate").getAttribute("data-domain")).toBe("공지");
    expect(screen.getByTestId("client-list").getAttribute("data-params")).toContain("수련회");
    expect(screen.getByTestId("client-list").getAttribute("data-tags")).toBe("1"); // 태그는 공개라 서버가 읽어 넘긴다
    expect(getNotices).not.toHaveBeenCalled();
  });

  it("대조: 공지가 누구나면 서버 목록(게이트 없음)", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    getNotices.mockResolvedValueOnce({
      content: [{ id: 4, title: "일반 공지", isPinned: false, viewCount: 3, createdAt: "2026-05-28T09:00:00", tags: [], author: null }],
      page: { size: 10, number: 0, totalElements: 1, totalPages: 1 },
    });
    render(await NoticesPage({ searchParams: Promise.resolve({}) }));
    expect(getNotices).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("gate")).toBeNull();
    expect(screen.getByText("일반 공지")).toBeDefined();
  });

  it("설정은 누구나인데 getNotices가 MembersOnlyError면 게이트 경로로 그린다(오류 화면 아님)", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    getNotices.mockRejectedValueOnce(new MembersOnlyError("401"));
    render(await NoticesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("NOTICE_VIEW");
    expect(screen.getByTestId("client-list")).toBeDefined();
  });

  it("대조: getNotices가 일반 Error면 지금처럼 throw", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    getNotices.mockRejectedValueOnce(new Error("GET /api/notices 실패: 500"));
    await expect(NoticesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("500");
  });
});

describe("제목 줄 공개 상태 표시", () => {
  it("그 메뉴의 설정 값을 넘기고, 설정을 못 읽으면 폴백이 아닌 null을 넘긴다", async () => {
    getNotices.mockResolvedValue(emptyPage);
    const allPublic = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "PUBLIC" } as const;
    getVisibilityMock.mockResolvedValue({ ...allPublic, notices: "MEMBERS" });
    const first = render(await NoticesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("status").getAttribute("data-level")).toBe("MEMBERS");
    first.unmount();
    getVisibilityMock.mockResolvedValue(null);
    render(await NoticesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("status").getAttribute("data-level")).toBe("null");
  });
});

describe("목록 메타데이터(검색 로봇)", () => {
  const allPublic = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "PUBLIC" } as const;
  it("notices 메뉴가 교인만이면 noindex", async () => {
    getVisibilityMock.mockResolvedValue({ ...allPublic, notices: "MEMBERS" });
    const meta = await generateMetadata();
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toBe("/notices");
  });
  it("대조: 누구나면 robots 없음, canonical 유지", async () => {
    getVisibilityMock.mockResolvedValue(allPublic);
    const meta = await generateMetadata();
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toBe("/notices");
  });
  it("설정을 못 읽으면 지금처럼 색인 허용", async () => {
    getVisibilityMock.mockResolvedValue(null);
    expect((await generateMetadata()).robots).toBeUndefined();
  });
});
