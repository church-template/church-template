import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const m = vi.hoisted(() => ({
  fetchAlbums: vi.fn(),
  fetchAlbum: vi.fn(),
  createAlbum: vi.fn(),
  addPhotos: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  canWrite: true,
}));
vi.mock("@/lib/api/gallery", () => ({ fetchAlbums: m.fetchAlbums, fetchAlbum: m.fetchAlbum }));
vi.mock("@/lib/api/gallery.admin", () => ({ createAlbum: m.createAlbum, addPhotos: m.addPhotos }));
vi.mock("@/lib/notify", () => ({ notify: { success: m.success, error: m.error } }));
vi.mock("@/lib/auth/useMe", () => ({ useHasPermission: () => m.canWrite }));
// 사진 고르기 창은 열리면 두 장을 고른 것처럼 확정한다(실제 창은 MediaPicker 테스트가 맡는다).
vi.mock("@/components/admin/MediaPicker", () => ({
  MediaPicker: ({ open, onConfirm }: { open: boolean; onConfirm: (ids: number[], picked: unknown[]) => void }) =>
    open ? (
      <button type="button" onClick={() => onConfirm([11, 12], [])}>
        두 장 고르기
      </button>
    ) : null,
}));

import { DeptAlbumField } from "./DeptAlbumField";

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  m.canWrite = true;
  m.fetchAlbums.mockResolvedValue({ content: [] });
  m.fetchAlbum.mockResolvedValue({ id: 5, title: "학생부", photos: [] });
});
afterEach(() => vi.clearAllMocks());

function renderField(over: Partial<Parameters<typeof DeptAlbumField>[0]> = {}) {
  const props = { deptName: "학생부", value: null, onChange: vi.fn(), onPhotosAdded: vi.fn(), ...over };
  render(
    <QueryClientProvider client={qc}>
      <DeptAlbumField {...props} />
    </QueryClientProvider>,
  );
  return props;
}
const photos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, mediaId: 100 + i, sortOrder: i, url: `/api/media/${100 + i}?sig=x` }));

describe("DeptAlbumField", () => {
  it("앨범이 하나도 없으면 빈 상태 안내와 만들기 버튼을 보인다", async () => {
    renderField();
    await waitFor(() =>
      expect(screen.getByText("아직 만든 앨범이 없습니다. 앨범을 만들어 연결하면 부서 화면에 활동 사진 구역이 생깁니다.")).toBeDefined(),
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("button", { name: "새 앨범 만들기" })).toBeDefined();
  });

  it("새 앨범을 만들면 부서 이름으로 기본 이름을 채우고, 만든 앨범을 바로 고른다", async () => {
    m.createAlbum.mockResolvedValue({ id: 42, title: "학생부 활동 사진", photos: [] });
    const p = renderField();
    fireEvent.click(await screen.findByRole("button", { name: "새 앨범 만들기" }));
    const name = screen.getByLabelText("앨범 이름 (필수)") as HTMLInputElement;
    expect(name.value).toBe("학생부 활동 사진");
    expect(screen.getByText("만들면 바로 이 부서에 선택됩니다. 부서 수정을 취소해도 앨범은 남습니다.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "만들고 연결" }));
    await waitFor(() => expect(m.createAlbum).toHaveBeenCalledWith({ title: "학생부 활동 사진" }));
    await waitFor(() => expect(p.onChange).toHaveBeenCalledWith(42));
    expect(m.success).toHaveBeenCalledWith("앨범을 만들어 연결했습니다.");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "새 앨범 만들기" })).toBeNull());
  });

  it("부서 이름이 나중에 도착해도(수정 화면 상세 로딩) 열 때 그 이름으로 기본 이름을 채운다", async () => {
    const props = { value: null, onChange: vi.fn(), onPhotosAdded: vi.fn() };
    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <DeptAlbumField deptName="" {...props} />
      </QueryClientProvider>,
    );
    rerender(
      <QueryClientProvider client={qc}>
        <DeptAlbumField deptName="학생부" {...props} />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "새 앨범 만들기" }));
    expect((screen.getByLabelText("앨범 이름 (필수)") as HTMLInputElement).value).toBe("학생부 활동 사진");
  });

  it("앨범 만들기가 실패하면 고르지 않고, 창과 입력한 이름이 남는다", async () => {
    m.createAlbum.mockRejectedValue(new Error("network"));
    const p = renderField();
    fireEvent.click(await screen.findByRole("button", { name: "새 앨범 만들기" }));
    fireEvent.change(screen.getByLabelText("앨범 이름 (필수)"), { target: { value: "여름 사진" } });
    fireEvent.click(screen.getByRole("button", { name: "만들고 연결" }));
    await waitFor(() => expect(m.error).toHaveBeenCalled());
    expect(p.onChange).not.toHaveBeenCalled();
    expect((screen.getByLabelText("앨범 이름 (필수)") as HTMLInputElement).value).toBe("여름 사진");
  });

  it("만드는 중에 Enter를 또 눌러도 한 번만 만든다", async () => {
    m.createAlbum.mockReturnValue(new Promise(() => {})); // 응답 대기 중
    renderField();
    fireEvent.click(await screen.findByRole("button", { name: "새 앨범 만들기" }));
    const name = screen.getByLabelText("앨범 이름 (필수)");
    fireEvent.keyDown(name, { key: "Enter" });
    await waitFor(() => expect(m.createAlbum).toHaveBeenCalledTimes(1));
    fireEvent.keyDown(name, { key: "Enter" });
    fireEvent.keyDown(name, { key: "Enter" });
    await new Promise((r) => setTimeout(r, 20)); // mutate는 다음 틱에 실행된다 — 기다린 뒤 센다
    expect(m.createAlbum).toHaveBeenCalledTimes(1);
  });

  it("한글 조합 중 Enter로는 만들지 않는다(마지막 글자가 덜 들어간 이름 방지)", async () => {
    renderField();
    fireEvent.click(await screen.findByRole("button", { name: "새 앨범 만들기" }));
    fireEvent.keyDown(screen.getByLabelText("앨범 이름 (필수)"), { key: "Enter", isComposing: true });
    await new Promise((r) => setTimeout(r, 20));
    expect(m.createAlbum).not.toHaveBeenCalled();
  });

  it("만드는 중에는 창이 닫히지 않는다(닫은 뒤 늦게 끝나 다른 선택을 덮지 않게)", async () => {
    m.createAlbum.mockReturnValue(new Promise(() => {}));
    renderField();
    fireEvent.click(await screen.findByRole("button", { name: "새 앨범 만들기" }));
    fireEvent.click(screen.getByRole("button", { name: "만들고 연결" }));
    await waitFor(() => expect(m.createAlbum).toHaveBeenCalled());
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByRole("dialog", { name: "새 앨범 만들기" })).toBeDefined();
  });

  it("이름이 비면 만들지 않는다", async () => {
    renderField();
    fireEvent.click(await screen.findByRole("button", { name: "새 앨범 만들기" }));
    fireEvent.change(screen.getByLabelText("앨범 이름 (필수)"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "만들고 연결" }));
    expect(await screen.findByText("앨범 이름을 입력해 주세요.")).toBeDefined();
    expect(m.createAlbum).not.toHaveBeenCalled();
  });

  it("갤러리 쓰기 권한이 없으면 만들기·사진 넣기를 보이지 않는다", async () => {
    m.canWrite = false;
    m.fetchAlbums.mockResolvedValue({ content: [{ id: 5, title: "학생부" }] });
    m.fetchAlbum.mockResolvedValue({ id: 5, title: "학생부", photos: photos(3) });
    renderField({ value: 5 });
    await screen.findByText("사진 3장");
    expect(screen.queryByRole("button", { name: "새 앨범 만들기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "사진 넣기" })).toBeNull();
  });

  it("연결된 앨범은 장수와 썸네일 4장까지, 앨범 열기 새 탭 링크, 공개 안내를 보인다", async () => {
    m.fetchAlbums.mockResolvedValue({ content: [{ id: 5, title: "학생부" }] });
    m.fetchAlbum.mockResolvedValue({ id: 5, title: "학생부", photos: photos(6) });
    renderField({ value: 5 });
    expect(await screen.findByText("사진 6장")).toBeDefined();
    // 장식용 썸네일(alt="")이라 img 역할이 아니다 — 요소로 센다
    expect(document.querySelectorAll("img")).toHaveLength(4);
    const open = screen.getByRole("link", { name: /앨범 열기/ });
    expect(open.getAttribute("href")).toBe("/gallery/albums/5");
    expect(open.getAttribute("target")).toBe("_blank");
    expect(screen.getByText(/누구에게나 공개됩니다/)).toBeDefined();
  });

  it("사진이 없는 앨범은 안내 문구를 보인다", async () => {
    m.fetchAlbums.mockResolvedValue({ content: [{ id: 5, title: "학생부" }] });
    renderField({ value: 5 });
    expect(await screen.findByText("아직 사진이 없습니다.")).toBeDefined();
  });

  it("사진 넣기는 고른 사진을 앨범에 넣고 넣은 장수를 알린다", async () => {
    m.fetchAlbums.mockResolvedValue({ content: [{ id: 5, title: "학생부" }] });
    m.addPhotos.mockResolvedValue({ id: 5, photos: photos(2) });
    const p = renderField({ value: 5 });
    fireEvent.click(await screen.findByRole("button", { name: "사진 넣기" }));
    fireEvent.click(screen.getByRole("button", { name: "두 장 고르기" }));
    await waitFor(() => expect(m.addPhotos).toHaveBeenCalledWith(5, [11, 12]));
    await waitFor(() => expect(p.onPhotosAdded).toHaveBeenCalledWith(2));
  });

  it("앨범 목록을 못 불러와도 현재 앨범은 옵션으로 남는다", async () => {
    m.fetchAlbums.mockRejectedValue(new Error("403"));
    renderField({ value: 5 });
    await waitFor(() => expect((screen.getByLabelText("활동 사진 앨범 선택") as HTMLSelectElement).value).toBe("5"));
    expect(screen.getByRole("option", { name: "현재 앨범 #5" })).toBeDefined();
  });

  it("앨범을 고르면 onChange로 알린다", async () => {
    m.fetchAlbums.mockResolvedValue({ content: [{ id: 5, title: "학생부" }, { id: 8, title: "찬양의 밤" }] });
    const p = renderField({ value: 5 });
    await screen.findByRole("option", { name: "찬양의 밤" });
    fireEvent.change(screen.getByLabelText("활동 사진 앨범 선택"), { target: { value: "8" } });
    expect(p.onChange).toHaveBeenCalledWith(8);
  });
});
