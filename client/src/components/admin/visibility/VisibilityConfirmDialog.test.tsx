import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { VisibilityMenu } from "@/lib/api/types";

const { fetchAlbumsMock, fetchSermonsMock } = vi.hoisted(() => ({ fetchAlbumsMock: vi.fn(), fetchSermonsMock: vi.fn() }));
vi.mock("@/lib/api/gallery", () => ({ fetchAlbums: fetchAlbumsMock }));
vi.mock("@/lib/api/sermons", () => ({ fetchSermons: fetchSermonsMock }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: vi.fn() }));
import { useMe } from "@/lib/auth/useMe";
import { VisibilityConfirmDialog } from "./VisibilityConfirmDialog";

const mockMe = (perms: string[]) =>
  (useMe as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: { permissions: perms }, isLoading: false });
const page = (totalElements: number) => ({ content: [], page: { size: 1, number: 0, totalElements, totalPages: totalElements } });
// 필터가 붙은 요청(교인만 수)과 아닌 요청(전체 수)을 응답으로 가른다.
const byFilter = (total: number, members: number) => (p: { membersOnly?: boolean }) =>
  Promise.resolve(page(p.membersOnly ? members : total));

function renderDialog(opened: VisibilityMenu[], extra: Partial<{ pending: boolean; onConfirm: () => void }> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <VisibilityConfirmDialog open opened={opened} pending={false} onConfirm={vi.fn()} onOpenChange={vi.fn()} {...extra} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("VisibilityConfirmDialog", () => {
  it("갤러리 쓰기 권한이 있으면 숫자를 넣은 문장(스펙 4B)", async () => {
    mockMe(["GALLERY_WRITE"]);
    fetchAlbumsMock.mockImplementation(byFilter(32, 9));
    renderDialog(["gallery"]);
    expect(
      await screen.findByText(
        "갤러리를 누구나 볼 수 있게 바꿉니다. 앨범 32개 중 9개는 교인만 보고, 23개는 로그인하지 않은 사람에게도 보입니다.",
      ),
    ).toBeDefined();
    expect(fetchAlbumsMock).toHaveBeenCalledWith({ size: 1 });
    expect(fetchAlbumsMock).toHaveBeenCalledWith({ size: 1, membersOnly: true });
  });

  it("쓰기 권한이 없으면 숫자 없는 문장이고 목록 조회를 하지 않는다", () => {
    mockMe(["VISIBILITY_MANAGE"]);
    renderDialog(["gallery"]);
    expect(screen.getByText("갤러리를 누구나 볼 수 있게 바꿉니다. 교인만으로 표시한 앨범은 계속 교인만 봅니다.")).toBeDefined();
    expect(fetchAlbumsMock).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "바꾸기" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("숫자를 받는 동안 '바꾸기'는 비활성, 받은 뒤 활성", async () => {
    mockMe(["SERMON_WRITE"]);
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    fetchSermonsMock.mockImplementation(async (p: { membersOnly?: boolean }) => { await gate; return page(p.membersOnly ? 2 : 10); });
    renderDialog(["sermons"]);
    expect((screen.getByRole("button", { name: "바꾸기" }) as HTMLButtonElement).disabled).toBe(true);
    release();
    expect(
      await screen.findByText("설교를 누구나 볼 수 있게 바꿉니다. 설교 10편 중 2편은 교인만 보고, 8편은 로그인하지 않은 사람에게도 보입니다."),
    ).toBeDefined();
    expect((screen.getByRole("button", { name: "바꾸기" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("숫자 조회가 실패하면 숫자 없는 문장으로", async () => {
    mockMe(["GALLERY_WRITE"]);
    fetchAlbumsMock.mockRejectedValue(new Error("down"));
    renderDialog(["gallery"]);
    expect(
      await screen.findByText("갤러리를 누구나 볼 수 있게 바꿉니다. 교인만으로 표시한 앨범은 계속 교인만 봅니다."),
    ).toBeDefined();
    await waitFor(() => expect((screen.getByRole("button", { name: "바꾸기" }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("여러 메뉴를 함께 열면 메뉴마다 한 문장", async () => {
    mockMe(["SERMON_WRITE"]);
    fetchSermonsMock.mockImplementation(byFilter(10, 2));
    renderDialog(["notices", "sermons"]);
    expect(screen.getByText("공지를 누구나 볼 수 있게 바꿉니다. 로그인하지 않은 사람에게도 보입니다.")).toBeDefined();
    expect(
      await screen.findByText("설교를 누구나 볼 수 있게 바꿉니다. 설교 10편 중 2편은 교인만 보고, 8편은 로그인하지 않은 사람에게도 보입니다."),
    ).toBeDefined();
  });

  it("'바꾸기'를 누르면 onConfirm", async () => {
    mockMe([]);
    const onConfirm = vi.fn();
    renderDialog(["events"], { onConfirm });
    fireEvent.click(screen.getByRole("button", { name: "바꾸기" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
