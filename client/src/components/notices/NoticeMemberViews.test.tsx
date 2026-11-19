import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

const { fetchNoticesMock, fetchNoticeMock, mounts } = vi.hoisted(() => ({
  fetchNoticesMock: vi.fn(),
  fetchNoticeMock: vi.fn(),
  mounts: { count: 0 },
}));
vi.mock("@/lib/api/memberReads", () => ({ fetchNotices: fetchNoticesMock, fetchNotice: fetchNoticeMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/notices/5" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// URL을 다루는 자식·어드민 island는 각자 테스트가 맡는다.
vi.mock("@/components/common/SearchPill", () => ({ SearchPill: () => null }));
vi.mock("@/components/common/TagFilter", () => ({ TagFilter: () => null }));
vi.mock("@/components/common/Pagination", () => ({ Pagination: () => null }));
vi.mock("./NoticeAdminActions", () => ({ NoticeDetailActions: () => null }));
// 폼이 새로 마운트될 때마다 세어 409 뒤 재시드(keyed 마운트)를 확인한다.
vi.mock("./NoticeForm", () => ({
  NoticeForm: ({ initial }: { initial: { version: number } }) => {
    const [n] = useState(() => ++mounts.count);
    return <div data-testid="form" data-version={initial.version} data-mount={n} />;
  },
}));

import { NoticeListClient, NoticeDetailClient, NoticeEditLoader } from "./NoticeMemberViews";
import { ApiError } from "@/lib/auth/apiError";

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  fetchNoticesMock.mockReset();
  fetchNoticeMock.mockReset();
  mounts.count = 0;
});
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

const detail = {
  id: 5, title: "교인 공지", content: "본문", isPinned: false, viewCount: 1,
  createdAt: "2026-06-01T09:00:00", updatedAt: "2026-06-01T09:00:00", version: 3, tags: [], author: null,
};

describe("NoticeListClient", () => {
  it("fetchNotices 결과를 서버 목록과 같은 행으로 그린다(고정 공지 묶음 + 월 묶음)", async () => {
    fetchNoticesMock.mockResolvedValue({
      content: [
        { id: 5, title: "고정 글", isPinned: true, viewCount: 1, createdAt: "2026-06-01T09:00:00", tags: [], author: null },
        { id: 4, title: "일반 글", isPinned: false, viewCount: 1, createdAt: "2026-05-28T09:00:00", tags: [], author: null },
      ],
      page: { size: 10, number: 0, totalElements: 2, totalPages: 1 },
    });
    wrap(<NoticeListClient params={{ q: "글" }} tags={[]} />);
    await waitFor(() => expect(screen.getByText("고정 글")).toBeDefined());
    expect(fetchNoticesMock).toHaveBeenCalledWith({ q: "글" });
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["고정 공지", "2026년 5월"]);
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/notices/5", "/notices/4"]);
  });

  it("목록 401이면 로그인 안내(낡은 설정으로 게이트를 지난 경우)", async () => {
    fetchNoticesMock.mockRejectedValue(new ApiError(401, "INVALID_TOKEN", undefined));
    wrap(<NoticeListClient params={{}} tags={[]} />);
    expect(await screen.findByText("공지는 교인 전용입니다. 로그인해 주세요.")).toBeDefined();
  });
});

describe("NoticeDetailClient", () => {
  it("상세를 그리고 본문 이미지는 응답 mediaUrls로", async () => {
    fetchNoticeMock.mockResolvedValue({ ...detail, content: "![](media:42)", mediaUrls: { "42": "/api/media/42?exp=1&sig=s" } });
    const { container } = wrap(<NoticeDetailClient id={5} />);
    expect(await screen.findByRole("heading", { name: "교인 공지" })).toBeDefined();
    expect(container.querySelector(".prose-church img")?.getAttribute("src")?.endsWith("sig=s")).toBe(true);
  });
  it("대조: 브라우저 조회 경로는 mediaUrls에 없는 media 이미지를 그리지 않는다", async () => {
    fetchNoticeMock.mockResolvedValue({
      ...detail,
      content: "![](media:42)\n\n![](media:43)",
      mediaUrls: { "42": "/api/media/42?exp=1&sig=s" },
    });
    const { container } = wrap(<NoticeDetailClient id={5} />);
    expect(await screen.findByRole("heading", { name: "교인 공지" })).toBeDefined();
    expect(container.querySelectorAll(".prose-church img")).toHaveLength(1);
  });
  it("401이면 로그인 안내", async () => {
    fetchNoticeMock.mockRejectedValue(new ApiError(401, "INVALID_TOKEN", undefined));
    wrap(<NoticeDetailClient id={5} />);
    expect(await screen.findByText("로그인 후 이용 가능합니다")).toBeDefined();
  });
  it("403이면 승인 안내", async () => {
    fetchNoticeMock.mockRejectedValue(new ApiError(403, "ACCESS_DENIED", undefined));
    wrap(<NoticeDetailClient id={5} />);
    expect(await screen.findByText("교인 승인 후 이용 가능합니다")).toBeDefined();
  });
  it("대조: 500이면 다시 시도", async () => {
    fetchNoticeMock.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", undefined));
    wrap(<NoticeDetailClient id={5} />);
    fireEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(fetchNoticeMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("로그인 후 이용 가능합니다")).toBeNull();
  });
});

describe("NoticeEditLoader", () => {
  it("409 뒤 상세 쿼리가 무효화되면 새 version으로 폼을 다시 마운트한다", async () => {
    fetchNoticeMock.mockResolvedValueOnce(detail).mockResolvedValueOnce({ ...detail, version: 4 });
    wrap(<NoticeEditLoader id={5} />);
    expect((await screen.findByTestId("form")).getAttribute("data-version")).toBe("3");
    await qc.invalidateQueries({ queryKey: ["notice", 5] }); // NoticeForm onReedit이 하는 일
    await waitFor(() => expect(screen.getByTestId("form").getAttribute("data-version")).toBe("4"));
    expect(screen.getByTestId("form").getAttribute("data-mount")).toBe("2");
  });
  it("대조: 없는 글(404)이면 불러오지 못했다는 안내", async () => {
    fetchNoticeMock.mockRejectedValue(new ApiError(404, "RESOURCE_NOT_FOUND", undefined));
    wrap(<NoticeEditLoader id={5} />);
    expect(await screen.findByText("공지를 불러오지 못했습니다.")).toBeDefined();
    expect(screen.queryByTestId("form")).toBeNull();
  });
});
