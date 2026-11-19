// src/components/admin/MediaPicker.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMediaMock } = vi.hoisted(() => ({ listMediaMock: vi.fn() }));
vi.mock("@/lib/api/media.admin", () => ({ listMedia: listMediaMock }));
// MediaUploader는 별도 테스트됨 — 여기선 무력화
vi.mock("./MediaUploader", () => ({ MediaUploader: () => null }));

import { MediaPicker } from "./MediaPicker";

afterEach(() => vi.clearAllMocks());
function renderQc(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("MediaPicker", () => {
  it("라이브러리 항목을 선택해 확정하면 onConfirm(mediaIds)을 호출한다", async () => {
    listMediaMock.mockResolvedValue({
      content: [{ id: 3, filename: "a.pdf", mimeType: "application/pdf", size: 1, uploadedBy: 1, createdAt: "2026-06-15T00:00:00" }],
      page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
    });
    const onConfirm = vi.fn();
    renderQc(<MediaPicker open accept="pdf" onOpenChange={() => {}} onConfirm={onConfirm} />);
    await waitFor(() => expect(screen.getByText("a.pdf")).toBeDefined());
    fireEvent.click(screen.getByText("a.pdf"));
    fireEvent.click(screen.getByRole("button", { name: /선택/ }));
    expect(onConfirm).toHaveBeenCalledWith([3], [expect.objectContaining({ id: 3 })]);
  });

  it("서명 url이 있으면 썸네일을 그 주소로 최적화 없이 그리고, 확정 시 항목(url 포함)을 넘긴다", async () => {
    const item = { id: 5, filename: "p.jpg", mimeType: "image/jpeg", size: 1, uploadedBy: 1, createdAt: "", url: "/api/media/5?exp=1&sig=x" };
    listMediaMock.mockResolvedValue({ content: [item], page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } });
    const onConfirm = vi.fn();
    renderQc(<MediaPicker open accept="image" onOpenChange={() => {}} onConfirm={onConfirm} />);
    const img = await screen.findByAltText("p.jpg");
    expect(img.getAttribute("src")).toBe("/api/media/5?exp=1&sig=x"); // unoptimized → /_next/image 미경유
    fireEvent.click(img);
    fireEvent.click(screen.getByRole("button", { name: /선택/ }));
    expect(onConfirm).toHaveBeenCalledWith([5], [item]);
  });

  // 스펙 6.6-16: 공지·설교 등의 공개 범위가 바뀌면 같은 파일이 교인 전용이 된다. 최적화 캐시(31일)는 지울 수 없으니
  // 무서명 주소라도 /_next/image를 거치지 않는다.
  it("서명 url이 없어도 썸네일을 최적화하지 않는다(무서명 주소 그대로)", async () => {
    const item = { id: 6, filename: "q.jpg", mimeType: "image/jpeg", size: 1, uploadedBy: 1, createdAt: "" };
    listMediaMock.mockResolvedValue({ content: [item], page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } });
    renderQc(<MediaPicker open accept="image" onOpenChange={() => {}} onConfirm={() => {}} />);
    const img = await screen.findByAltText("q.jpg");
    expect(img.getAttribute("src")).toBe("/api/media/6");
  });
});
