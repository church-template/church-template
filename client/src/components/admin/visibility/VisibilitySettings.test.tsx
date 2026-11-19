import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { VisibilityResponse } from "@/lib/api/types";

const { fetchVisibilityMock, updateVisibilityMock, revalidateVisibilityMock, notifySuccess } = vi.hoisted(() => ({
  fetchVisibilityMock: vi.fn(),
  updateVisibilityMock: vi.fn(),
  revalidateVisibilityMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/visibility.admin", () => ({ fetchVisibility: fetchVisibilityMock, updateVisibility: updateVisibilityMock }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateVisibility: revalidateVisibilityMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
// 확인창의 숫자 조회는 VisibilityConfirmDialog.test가 본다 — 여기선 쓰기 권한 없음(숫자 없는 문장)으로 둔다.
vi.mock("@/lib/auth/useMe", () => ({ useMe: () => ({ data: { permissions: ["VISIBILITY_MANAGE"] }, isLoading: false }) }));
vi.mock("@/lib/api/gallery", () => ({ fetchAlbums: vi.fn() }));
vi.mock("@/lib/api/sermons", () => ({ fetchSermons: vi.fn() }));

import { VisibilitySettings } from "./VisibilitySettings";

// 지금 동작(설정을 못 읽을 때의 값과 같다): 공지·일정·주보 누구나, 설교·갤러리 교인만.
const saved: VisibilityResponse = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "MEMBERS", gallery: "MEMBERS" };

let qc: QueryClient;
function renderSettings() {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <VisibilitySettings />
    </QueryClientProvider>,
  );
}
const group = (name: string) => screen.getByRole("group", { name });
const radio = (menu: string, label: "누구나" | "교인만") =>
  within(group(menu)).getByRole("radio", { name: label }) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  fetchVisibilityMock.mockResolvedValue(saved);
  updateVisibilityMock.mockImplementation(async (b: VisibilityResponse) => b);
  revalidateVisibilityMock.mockResolvedValue(undefined);
});

describe("VisibilitySettings", () => {
  it("메뉴 5행을 서버 값으로 선택해 보여 준다", async () => {
    renderSettings();
    await screen.findByRole("group", { name: "설교" });
    for (const m of ["공지", "일정", "주보", "설교", "갤러리"]) expect(group(m)).toBeDefined();
    expect(radio("설교", "교인만").checked).toBe(true);
    expect(radio("설교", "누구나").checked).toBe(false);
    expect(radio("공지", "누구나").checked).toBe(true);
  });

  it("라디오는 native input type=radio이고 라벨 행이 48px 누름 영역", async () => {
    renderSettings();
    await screen.findByRole("group", { name: "공지" });
    const r = radio("공지", "교인만");
    expect(r.tagName).toBe("INPUT");
    expect(r.type).toBe("radio");
    expect(r.closest("label")?.className).toContain("min-h-12");
  });

  it("설교·갤러리 아래에만 '글마다 교인만으로 따로 정할 수 있어요'", async () => {
    renderSettings();
    await screen.findByRole("group", { name: "공지" });
    expect(screen.getAllByText("글마다 교인만으로 따로 정할 수 있어요").length).toBe(2);
    expect(within(group("설교")).getByText("글마다 교인만으로 따로 정할 수 있어요")).toBeDefined();
    expect(within(group("공지")).queryByText("글마다 교인만으로 따로 정할 수 있어요")).toBeNull();
  });

  it("교인만으로 바꾸는 저장은 확인창 없이 바로 PUT", async () => {
    renderSettings();
    await screen.findByRole("group", { name: "공지" });
    fireEvent.click(radio("공지", "교인만"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(updateVisibilityMock).toHaveBeenCalledWith({ ...saved, notices: "MEMBERS" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("누구나로 여는 메뉴가 있으면 저장 전에 확인창, '바꾸기'를 눌러야 PUT", async () => {
    renderSettings();
    await screen.findByRole("group", { name: "갤러리" });
    fireEvent.click(radio("갤러리", "누구나"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("누구나 볼 수 있게 바꿀까요?")).toBeDefined();
    expect(updateVisibilityMock).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "바꾸기" }));
    await waitFor(() => expect(updateVisibilityMock).toHaveBeenCalledWith({ ...saved, gallery: "PUBLIC" }));
    expect(updateVisibilityMock).toHaveBeenCalledTimes(1);
  });

  it("확인창에서 취소하면 저장하지 않는다", async () => {
    renderSettings();
    await screen.findByRole("group", { name: "설교" });
    fireEvent.click(radio("설교", "누구나"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(updateVisibilityMock).not.toHaveBeenCalled();
  });

  it("저장 성공 시 '저장했습니다.' + revalidateVisibility 1회 + 설정 다시 읽기", async () => {
    renderSettings();
    await screen.findByRole("group", { name: "주보" });
    fireEvent.click(radio("주보", "교인만"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith("저장했습니다."));
    expect(revalidateVisibilityMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(fetchVisibilityMock).toHaveBeenCalledTimes(2));
  });

  it("캐시 지우기가 실패해도 저장 성공 Toast와 설정 다시 읽기는 그대로(실패는 로그만)", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    revalidateVisibilityMock.mockRejectedValueOnce(new Error("server action failed"));
    renderSettings();
    await screen.findByRole("group", { name: "주보" });
    fireEvent.click(radio("주보", "교인만"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith("저장했습니다."));
    await waitFor(() => expect(fetchVisibilityMock).toHaveBeenCalledTimes(2));
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it("취소는 서버 값으로 되돌린다", async () => {
    renderSettings();
    await screen.findByRole("group", { name: "일정" });
    fireEvent.click(radio("일정", "교인만"));
    expect(radio("일정", "교인만").checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(radio("일정", "누구나").checked).toBe(true);
    expect(updateVisibilityMock).not.toHaveBeenCalled();
  });

  it("설정을 못 읽으면 안내와 다시 시도", async () => {
    fetchVisibilityMock.mockRejectedValue(new Error("down"));
    renderSettings();
    expect(await screen.findByText("공개 범위를 불러오지 못했습니다.")).toBeDefined();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("화면 문구에 '권한'·'퍼블릭'이 없다(대조: 누구나·교인만은 있다)", async () => {
    const { container } = renderSettings();
    await screen.findByRole("group", { name: "공지" });
    fireEvent.click(radio("갤러리", "누구나"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    const dialog = await screen.findByRole("dialog");
    const text = `${container.textContent} ${dialog.textContent}`;
    expect(text).not.toMatch(/권한|퍼블릭/);
    expect(text).toMatch(/누구나/);
    expect(text).toMatch(/교인만/);
  });
});
