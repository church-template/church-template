import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createNoticeMock, updateNoticeMock, pushMock, refreshMock, notifySuccess, revalidateNoticesMock } = vi.hoisted(() => ({
  createNoticeMock: vi.fn(),
  updateNoticeMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  notifySuccess: vi.fn(),
  revalidateNoticesMock: vi.fn(),
}));
vi.mock("@/lib/api/notices.admin", () => ({ createNotice: createNoticeMock, updateNotice: updateNoticeMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/api/tags", () => ({ getTags: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateNotices: revalidateNoticesMock }));

import { NoticeForm } from "./NoticeForm";
import { ApiError } from "@/lib/auth/apiError";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
function renderForm(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("NoticeForm", () => {
  it("title 누락 시 검증 메시지를 보인다", async () => {
    renderForm(<NoticeForm mode="create" />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("제목을 입력해 주세요.")).toBeDefined());
    expect(createNoticeMock).not.toHaveBeenCalled();
  });

  it("등록 시 isPinned를 포함해 전송하고 상세로 이동한다", async () => {
    createNoticeMock.mockResolvedValue({ id: 5 });
    revalidateNoticesMock.mockResolvedValue(undefined);
    renderForm(<NoticeForm mode="create" />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "주차 안내" } });
    fireEvent.click(screen.getByLabelText("상단 고정"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(createNoticeMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "주차 안내", isPinned: true }),
      ),
    );
    await waitFor(() => expect(revalidateNoticesMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/notices/5");
  });

  it("수정 모드는 initial.version을 PUT body에 포함한다", async () => {
    updateNoticeMock.mockResolvedValue({ id: 5 });
    revalidateNoticesMock.mockResolvedValue(undefined);
    const initial = {
      id: 5, title: "원본", content: "", isPinned: false, viewCount: 0,
      createdAt: "2026-06-01T00:00:00", updatedAt: "2026-06-01T00:00:00",
      version: 2, tags: [], author: null,
    };
    renderForm(<NoticeForm mode="edit" initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(updateNoticeMock).toHaveBeenCalledWith(5, expect.objectContaining({ version: 2 })),
    );
    await waitFor(() => expect(revalidateNoticesMock).toHaveBeenCalled());
  });
});

describe("NoticeForm 교인만 모드(#198)", () => {
  const initial = {
    id: 5, title: "원본", content: "![](media:42)", isPinned: false, viewCount: 0,
    createdAt: "2026-06-01T00:00:00", updatedAt: "2026-06-01T00:00:00",
    version: 2, tags: [], author: null, mediaUrls: { "42": "/api/media/42?exp=1&sig=n" },
  };
  it("저장 성공 시 ['notices']·['notice',id]를 무효화한다", async () => {
    updateNoticeMock.mockResolvedValue({ id: 5 });
    revalidateNoticesMock.mockResolvedValue(undefined);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    renderForm(<NoticeForm mode="edit" initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notice", 5] }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notices"] });
  });
  it("409면 ['notice', id]를 무효화한다(로더가 최신 version으로 다시 마운트)", async () => {
    updateNoticeMock.mockRejectedValue(new ApiError(409, "OPTIMISTIC_LOCK_CONFLICT", undefined));
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    renderForm(<NoticeForm mode="edit" initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notice", 5] }));
  });
  it("공지 편집 미리보기에 mediaUrls를 넘긴다", () => {
    const { container } = renderForm(<NoticeForm mode="edit" initial={initial} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "미리보기" }));
    expect(container.querySelector("img")?.getAttribute("src")).toContain("sig=n");
  });
});
