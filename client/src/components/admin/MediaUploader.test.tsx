// src/components/admin/MediaUploader.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { uploadMediaMock, notifyError } = vi.hoisted(() => ({ uploadMediaMock: vi.fn(), notifyError: vi.fn() }));
vi.mock("@/lib/api/media.admin", () => ({ uploadMedia: uploadMediaMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: notifyError } }));

import { MediaUploader } from "./MediaUploader";

afterEach(() => vi.clearAllMocks());

function fileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe("MediaUploader", () => {
  it("허용 형식을 업로드하면 onUploaded로 결과를 올린다", async () => {
    uploadMediaMock.mockResolvedValue({ id: 9, filename: "a.png" });
    const onUploaded = vi.fn();
    const { container } = render(<MediaUploader accept="image" onUploaded={onUploaded} />);
    fireEvent.change(fileInput(container), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith([{ id: 9, filename: "a.png" }]));
  });

  it("미허용 형식은 검증 에러를 보이고 업로드하지 않는다", async () => {
    const onUploaded = vi.fn();
    const { container } = render(<MediaUploader accept="pdf" onUploaded={onUploaded} />);
    fireEvent.change(fileInput(container), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(screen.getByText(/허용하지 않는 형식/)).toBeDefined());
    expect(uploadMediaMock).not.toHaveBeenCalled();
  });

  it("다중 업로드 중 일부만 실패해도 성공분을 onUploaded로 전달한다", async () => {
    uploadMediaMock
      .mockResolvedValueOnce({ id: 1, filename: "a.png" })
      .mockRejectedValueOnce(new Error("network"));
    const onUploaded = vi.fn();
    const { container } = render(<MediaUploader accept="image" multiple onUploaded={onUploaded} />);
    fireEvent.change(fileInput(container), {
      target: {
        files: [
          new File(["x"], "a.png", { type: "image/png" }),
          new File(["y"], "b.png", { type: "image/png" }),
        ],
      },
    });
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith([{ id: 1, filename: "a.png" }]));
  });

  it("10MB 넘는 사진은 WebP로 줄여 올리므로 막지 않고, GIF·PDF는 막는다", async () => {
    uploadMediaMock.mockResolvedValue({ id: 3, filename: "big.webp" });
    const big = (name: string, type: string) => {
      const f = new File(["x"], name, { type });
      Object.defineProperty(f, "size", { value: 11 * 1024 * 1024 });
      return f;
    };
    const onUploaded = vi.fn();
    const { container } = render(<MediaUploader accept="all" onUploaded={onUploaded} />);
    fireEvent.change(fileInput(container), { target: { files: [big("big.jpg", "image/jpeg")] } });
    // jsdom엔 createImageBitmap이 없어 변환 실패 → 원본 그대로 업로드(막지 않음).
    await waitFor(() => expect(uploadMediaMock).toHaveBeenCalledTimes(1));
    fireEvent.change(fileInput(container), { target: { files: [big("big.gif", "image/gif")] } });
    await waitFor(() => expect(screen.getByText(/10MB를 초과/)).toBeDefined());
    expect(uploadMediaMock).toHaveBeenCalledTimes(1);
  });

  it("JPEG는 브라우저에서 WebP(.webp)로 바꿔 올리고, GIF·PDF는 원본 그대로 올린다", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (cb: (b: Blob | null) => void, type: string) => cb(new Blob(["w"], { type })),
    };
    const realCreate = document.createElement.bind(document);
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) =>
      tag === "canvas" ? (canvas as unknown as HTMLCanvasElement) : realCreate(tag),
    );
    try {
      uploadMediaMock.mockImplementation(async (f: File) => ({ id: 1, filename: f.name }));
      const { container } = render(<MediaUploader accept="all" multiple onUploaded={vi.fn()} />);
      fireEvent.change(fileInput(container), {
        target: {
          files: [
            new File(["j"], "photo.JPG", { type: "image/jpeg" }),
            new File(["g"], "move.gif", { type: "image/gif" }),
            new File(["p"], "doc.pdf", { type: "application/pdf" }),
          ],
        },
      });
      await waitFor(() => expect(uploadMediaMock).toHaveBeenCalledTimes(3));
      const sent = uploadMediaMock.mock.calls.map((args) => [(args[0] as File).name, (args[0] as File).type]);
      expect(sent).toEqual([
        ["photo.webp", "image/webp"],
        ["move.gif", "image/gif"],
        ["doc.pdf", "application/pdf"],
      ]);
      expect(canvas.width).toBe(1600);
      expect(canvas.height).toBe(1200);
    } finally {
      spy.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("10MB 넘는 PDF는 지금처럼 막는다", async () => {
    const pdf = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(pdf, "size", { value: 11 * 1024 * 1024 });
    const { container } = render(<MediaUploader accept="pdf" onUploaded={vi.fn()} />);
    fireEvent.change(fileInput(container), { target: { files: [pdf] } });
    await waitFor(() => expect(screen.getByText(/10MB를 초과/)).toBeDefined());
    expect(uploadMediaMock).not.toHaveBeenCalled();
  });
});
