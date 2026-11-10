import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { getBulletins } = vi.hoisted(() => ({ getBulletins: vi.fn() }));
vi.mock("@/lib/api/bulletins", () => ({ getBulletins }));
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

import BulletinsPage from "./page";

afterEach(() => vi.clearAllMocks());

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
