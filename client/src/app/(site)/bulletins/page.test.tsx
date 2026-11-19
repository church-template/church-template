import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { getBulletins } = vi.hoisted(() => ({ getBulletins: vi.fn() }));
// 상태 표시(VISIBILITY_MANAGE 게이트)는 VisibilityStatusLink.test가 본다 — 여기선 페이지가 넘기는 값만.
vi.mock("@/components/visibility/VisibilityStatusLink", () => ({
  VisibilityStatusLink: ({ level }: { level: string | null }) => <div data-testid="status" data-level={String(level)} />,
}));
vi.mock("@/lib/api/bulletins", () => ({ getBulletins }));
const { getVisibilityMock } = vi.hoisted(() => ({ getVisibilityMock: vi.fn() }));
vi.mock("@/lib/api/visibility", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/visibility")>()),
  getVisibility: getVisibilityMock,
}));
vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ permission, domainLabel, children }: { permission: string; domainLabel: string; children: React.ReactNode }) => (
    <div data-testid="gate" data-permission={permission} data-domain={domainLabel}>{children}</div>
  ),
}));
vi.mock("@/components/bulletins/BulletinMemberViews", () => ({
  BulletinListClient: ({ page }: { page?: number }) => <div data-testid="client-list" data-page={String(page)} />,
}));
// 클라이언트 자식은 스텁(next/navigation 의존 차단) — 자체 단위 테스트가 커버.
vi.mock("@/components/common/Pagination", () => ({
  Pagination: ({ page }: { page: { totalPages: number } }) => (
    <div data-testid="pagination" data-total={page.totalPages} />
  ),
}));
// 어드민 인라인 액션은 클라이언트 컴포넌트(QueryClient 필요) — 무력화.
vi.mock("@/components/bulletins/BulletinAdminActions", () => ({
  BulletinListAction: () => null,
  BulletinRowActions: () => null,
}));

import BulletinsPage, { generateMetadata } from "./page";
import { MembersOnlyError } from "@/lib/api/visibility";

afterEach(() => { vi.clearAllMocks(); getVisibilityMock.mockReset(); });

const emptyPage = {
  content: [],
  page: { size: 10, number: 0, totalElements: 0, totalPages: 0 },
};

describe("BulletinsPage (목록)", () => {
  it("searchParams의 page를 파싱해 getBulletins에 전달", async () => {
    getBulletins.mockResolvedValueOnce(emptyPage);
    render(
      await BulletinsPage({ searchParams: Promise.resolve({ page: "2" }) }),
    );
    expect(getBulletins).toHaveBeenCalledWith({ page: 2 });
  });

  it("잘못된 page 파라미터는 undefined로 방어", async () => {
    getBulletins.mockResolvedValueOnce(emptyPage);
    render(
      await BulletinsPage({ searchParams: Promise.resolve({ page: "xyz" }) }),
    );
    expect(getBulletins).toHaveBeenCalledWith({ page: undefined });
  });

  it("빈 목록이면 EmptyState", async () => {
    getBulletins.mockResolvedValueOnce(emptyPage);
    render(await BulletinsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("등록된 주보가 없습니다.")).toBeDefined();
  });

  it("첫 페이지의 최신 주보는 띠로, 나머지는 월별 목록으로(서버 순서 그대로)·PDF 새 탭 링크·작성자, totalPages>1이면 Pagination", async () => {
    getBulletins.mockResolvedValueOnce({
      content: [
        { id: 7, title: "6월 둘째 주 주보", serviceDate: "2026-06-07", mediaId: 31, createdAt: "2026-06-05T10:00:00", author: "김집사" },
        { id: 6, title: "6월 첫째 주 주보", serviceDate: "2026-05-31", mediaId: 28, createdAt: "2026-05-29T10:00:00", author: null },
      ],
      page: { size: 10, number: 0, totalElements: 12, totalPages: 2 },
    });
    render(await BulletinsPage({ searchParams: Promise.resolve({}) }));
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2); // 띠 1 + 행 1 = content 수(초과 렌더 회귀 방지)
    expect(links[0].getAttribute("href")).toBe("/api/media/31");
    expect(links[0].getAttribute("target")).toBe("_blank");
    expect(links[0].textContent).toContain("주보 보기");
    expect(links[1].getAttribute("href")).toBe("/api/media/28");
    expect(screen.getByRole("heading", { level: 2, name: "2026년 5월" })).toBeDefined();
    expect(screen.getByText("5월 31일")).toBeDefined();
    expect(screen.getByText(/김집사/)).toBeDefined();
    expect(screen.getByTestId("pagination").getAttribute("data-total")).toBe("2");
  });

  it("두 번째 페이지부터는 띠 없이 월별 목록만", async () => {
    getBulletins.mockResolvedValueOnce({
      content: [
        { id: 3, title: "4월 주보", serviceDate: "2026-04-05", mediaId: 9, createdAt: "2026-04-03T10:00:00", author: null },
      ],
      page: { size: 10, number: 1, totalElements: 12, totalPages: 2 },
    });
    render(await BulletinsPage({ searchParams: Promise.resolve({ page: "1" }) }));
    expect(screen.queryByText("주보 보기")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "2026년 4월" })).toBeDefined();
  });

  it("totalPages가 1이면 Pagination을 렌더하지 않는다", async () => {
    getBulletins.mockResolvedValueOnce({
      content: [
        { id: 1, title: "주보", serviceDate: "2026-06-07", mediaId: 3, createdAt: "2026-06-05T10:00:00", author: null },
      ],
      page: { size: 10, number: 0, totalElements: 1, totalPages: 1 },
    });
    render(await BulletinsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByTestId("pagination")).toBeNull();
  });
});

const levels = (v: "PUBLIC" | "MEMBERS") =>
  ({ notices: "PUBLIC", events: "PUBLIC", bulletins: v, sermons: "MEMBERS", gallery: "MEMBERS" }) as const;

describe("BulletinsPage 공개 범위·서명 주소", () => {
  it("주보가 교인만이면 BULLETIN_VIEW 게이트 + BulletinListClient, 서버 조회 0회", async () => {
    getVisibilityMock.mockResolvedValue(levels("MEMBERS"));
    render(await BulletinsPage({ searchParams: Promise.resolve({ page: "2" }) }));
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("BULLETIN_VIEW");
    expect(screen.getByTestId("client-list").getAttribute("data-page")).toBe("2");
    expect(getBulletins).not.toHaveBeenCalled();
  });
  it("설정은 누구나인데 getBulletins가 MembersOnlyError면 게이트 경로", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    getBulletins.mockRejectedValueOnce(new MembersOnlyError("401"));
    render(await BulletinsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("client-list")).toBeDefined();
  });
  // 서버 렌더 페이지는 60초 캐시(stale-while-revalidate)라 1시간짜리 서명 주소가 만료된 채 나갈 수 있다 →
  // 응답에 url이 있어도 무서명 주소로 그린다(누구나 주보라 무서명이 늘 열린다). 서명 주소 대조는 BulletinMemberViews.test.
  it("응답에 url(서명 주소)이 있어도 서버 렌더는 무서명 /api/media/{mediaId}로 링크한다", async () => {
    getBulletins.mockResolvedValueOnce({
      content: [
        { id: 7, title: "띠 주보", serviceDate: "2026-06-07", mediaId: 31, createdAt: "x", author: null, url: "/api/media/31?exp=1&sig=a" },
        { id: 6, title: "행 주보", serviceDate: "2026-05-31", mediaId: 28, createdAt: "x", author: null, url: "/api/media/28?exp=1&sig=b" },
      ],
      page: { size: 10, number: 0, totalElements: 2, totalPages: 1 },
    });
    render(await BulletinsPage({ searchParams: Promise.resolve({}) }));
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/api/media/31", "/api/media/28"]);
  });
});

describe("제목 줄 공개 상태 표시", () => {
  it("그 메뉴의 설정 값을 넘기고, 설정을 못 읽으면 폴백이 아닌 null을 넘긴다", async () => {
    getBulletins.mockResolvedValue(emptyPage);
    const allPublic = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "PUBLIC" } as const;
    getVisibilityMock.mockResolvedValue({ ...allPublic, bulletins: "MEMBERS" });
    const first = render(await BulletinsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("status").getAttribute("data-level")).toBe("MEMBERS");
    first.unmount();
    getVisibilityMock.mockResolvedValue(null);
    render(await BulletinsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("status").getAttribute("data-level")).toBe("null");
  });
});

describe("목록 메타데이터(검색 로봇)", () => {
  const allPublic = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "PUBLIC", gallery: "PUBLIC" } as const;
  it("bulletins 메뉴가 교인만이면 noindex", async () => {
    getVisibilityMock.mockResolvedValue({ ...allPublic, bulletins: "MEMBERS" });
    const meta = await generateMetadata();
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toBe("/bulletins");
  });
  it("대조: 누구나면 robots 없음, canonical 유지", async () => {
    getVisibilityMock.mockResolvedValue(allPublic);
    const meta = await generateMetadata();
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toBe("/bulletins");
  });
  it("설정을 못 읽으면 지금처럼 색인 허용", async () => {
    getVisibilityMock.mockResolvedValue(null);
    expect((await generateMetadata()).robots).toBeUndefined();
  });
});
