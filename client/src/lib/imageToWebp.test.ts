import { describe, it, expect, vi, afterEach } from "vitest";
import { fitWithin, shouldConvert, toWebp } from "./imageToWebp";

afterEach(() => vi.unstubAllGlobals());

describe("fitWithin", () => {
  it("긴 변이 1600을 넘으면 비율을 지켜 줄인다", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });
  it("작은 사진은 키우지 않는다", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("shouldConvert", () => {
  it("JPEG·PNG·WEBP만 변환하고 GIF(움직임 유지)·PDF는 건너뛴다", () => {
    expect(shouldConvert("image/jpeg")).toBe(true);
    expect(shouldConvert("image/png")).toBe(true);
    expect(shouldConvert("image/webp")).toBe(true);
    expect(shouldConvert("image/gif")).toBe(false);
    expect(shouldConvert("application/pdf")).toBe(false);
  });
});

describe("toWebp", () => {
  it("변환 대상이 아니면 원본을 그대로 돌려준다", async () => {
    const gif = new File(["g"], "a.gif", { type: "image/gif" });
    expect(await toWebp(gif)).toBe(gif);
  });

  it("브라우저가 디코딩하지 못하면 원본으로 올린다(막지 않음)", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("decode"); }));
    const jpg = new File(["j"], "photo.jpg", { type: "image/jpeg" });
    expect(await toWebp(jpg)).toBe(jpg);
  });

  it("줄인 크기로 그려 품질 0.82 WebP 파일(.webp)로 바꾼다", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 2000, close: vi.fn() })));
    const drawImage = vi.fn();
    const toBlob = vi.fn((cb: (b: Blob | null) => void, type: string) => cb(new Blob(["w"], { type })));
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob };
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) =>
      tag === "canvas" ? (canvas as unknown as HTMLCanvasElement) : realCreate(tag),
    );
    const out = await toWebp(new File(["j"], "photo.JPG", { type: "image/jpeg" }));
    expect(out.name).toBe("photo.webp");
    expect(out.type).toBe("image/webp");
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(800);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.82);
    vi.restoreAllMocks();
  });

  it("WebP 인코딩을 지원하지 않는 브라우저(PNG로 떨어짐)면 원본으로 올린다", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() })));
    const canvas = {
      width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(["p"], { type: "image/png" })),
    };
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) =>
      tag === "canvas" ? (canvas as unknown as HTMLCanvasElement) : realCreate(tag),
    );
    const png = new File(["p"], "a.png", { type: "image/png" });
    expect(await toWebp(png)).toBe(png);
    vi.restoreAllMocks();
  });
});
