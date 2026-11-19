import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VISIBILITY_COPY } from "@/constants/visibility";
import type { GalleryAlbumDetailResponse } from "@/lib/api/types";

const { createAlbumMock, patchAlbumMock, pushMock } = vi.hoisted(() => ({
  createAlbumMock: vi.fn(),
  patchAlbumMock: vi.fn(),
  pushMock: vi.fn(),
}));
vi.mock("@/lib/api/gallery.admin", () => ({ createAlbum: createAlbumMock, patchAlbum: patchAlbumMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, back: vi.fn() }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/tags", () => ({ getTags: vi.fn().mockResolvedValue([]) }));

import { AlbumForm } from "./AlbumForm";

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());
const renderForm = (ui: React.ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

const INITIAL: GalleryAlbumDetailResponse = {
  id: 5, title: "달란트 시장", description: null, author: null,
  createdAt: "2026-06-01T00:00:00", updatedAt: "2026-06-01T00:00:00",
  version: 2, tags: [], photos: [], membersOnly: false, departmentLinked: false,
} as unknown as GalleryAlbumDetailResponse;

describe("AlbumForm 교인만 보기", () => {
  it("부서 연결 앨범의 '이 앨범은 교인만 보기'는 비활성 + 안내", () => {
    renderForm(<AlbumForm mode="edit" initial={{ ...INITIAL, departmentLinked: true }} />);
    const box = screen.getByLabelText(VISIBILITY_COPY.albumCheckbox) as HTMLInputElement;
    expect(box.disabled).toBe(true);
    expect(screen.getByText(VISIBILITY_COPY.deptLinked)).toBeDefined();
  });

  it("대조: 연결 안 된 앨범은 체크 가능하고 저장 body에 membersOnly가 실린다", async () => {
    patchAlbumMock.mockResolvedValue({});
    renderForm(<AlbumForm mode="edit" initial={INITIAL} />);
    const box = screen.getByLabelText(VISIBILITY_COPY.albumCheckbox) as HTMLInputElement;
    expect(box.disabled).toBe(false);
    expect(screen.queryByText(VISIBILITY_COPY.deptLinked)).toBeNull();
    fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(patchAlbumMock).toHaveBeenCalledWith(5, expect.objectContaining({ membersOnly: true, version: 2 })),
    );
  });

  it("대조: 부서 연결 앨범이라도 이미 교인만이면 체크를 풀 수 있다", () => {
    renderForm(<AlbumForm mode="edit" initial={{ ...INITIAL, departmentLinked: true, membersOnly: true }} />);
    const box = screen.getByLabelText(VISIBILITY_COPY.albumCheckbox) as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(box.disabled).toBe(false);
  });

  it("등록 모드는 체크하지 않으면 membersOnly === false로 보낸다", async () => {
    createAlbumMock.mockResolvedValue({ id: 9 });
    renderForm(<AlbumForm mode="create" />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "새 앨범" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createAlbumMock).toHaveBeenCalledWith(expect.objectContaining({ membersOnly: false })));
  });
});
