import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { fetchBulletinsMock, fetchBulletinMock } = vi.hoisted(() => ({ fetchBulletinsMock: vi.fn(), fetchBulletinMock: vi.fn() }));
vi.mock("@/lib/api/memberReads", () => ({ fetchBulletins: fetchBulletinsMock, fetchBulletin: fetchBulletinMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/bulletins" }));
vi.mock("@/components/common/Pagination", () => ({ Pagination: () => null }));
vi.mock("./BulletinAdminActions", () => ({ BulletinRowActions: () => null }));
vi.mock("./BulletinForm", () => ({
  BulletinForm: ({ initial }: { initial: { version: number } }) => <div data-testid="form" data-version={initial.version} />,
}));

import { BulletinListClient, BulletinEditLoader } from "./BulletinMemberViews";
import { ApiError } from "@/lib/auth/apiError";

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  fetchBulletinsMock.mockReset();
  fetchBulletinMock.mockReset();
});
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

describe("BulletinListClient", () => {
  it("주보 목록을 그리고 PDF는 응답 url(서명 주소)로 연다", async () => {
    fetchBulletinsMock.mockResolvedValue({
      content: [
        { id: 7, title: "띠 주보", serviceDate: "2026-06-07", mediaId: 31, createdAt: "x", author: null, url: "/api/media/31?exp=1&sig=a" },
        { id: 6, title: "행 주보", serviceDate: "2026-05-31", mediaId: 28, createdAt: "x", author: null },
        { id: 5, title: "PDF 없는 주보", serviceDate: "2026-05-24", mediaId: 20, createdAt: "x", author: null, url: null },
      ],
      page: { size: 10, number: 0, totalElements: 3, totalPages: 1 },
    });
    wrap(<BulletinListClient />);
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(3));
    // 둘째는 url 칸이 없는 응답(구 백엔드), 셋째는 url: null(백엔드 DTO — PDF 없음) → /api/media/{mediaId} 대조
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/api/media/31?exp=1&sig=a",
      "/api/media/28",
      "/api/media/20",
    ]);
    expect(fetchBulletinsMock).toHaveBeenCalledWith({ page: undefined });
  });
  it("401이면 로그인 안내", async () => {
    fetchBulletinsMock.mockRejectedValue(new ApiError(401, "INVALID_TOKEN", undefined));
    wrap(<BulletinListClient page={1} />);
    expect(await screen.findByText("주보는 교인 전용입니다. 로그인해 주세요.")).toBeDefined();
  });
});

describe("BulletinEditLoader", () => {
  it("최신 version으로 폼을 시드하고, 무효화되면 다시 받는다", async () => {
    const d = { id: 7, title: "주보", serviceDate: "2026-06-07", mediaId: 31, version: 1 };
    fetchBulletinMock.mockResolvedValueOnce(d).mockResolvedValueOnce({ ...d, version: 2 });
    wrap(<BulletinEditLoader id={7} />);
    expect((await screen.findByTestId("form")).getAttribute("data-version")).toBe("1");
    await qc.invalidateQueries({ queryKey: ["bulletin", 7] });
    await waitFor(() => expect(screen.getByTestId("form").getAttribute("data-version")).toBe("2"));
  });
});
