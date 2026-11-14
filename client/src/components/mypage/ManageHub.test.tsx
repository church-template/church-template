import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ManageHub } from "./ManageHub";

vi.mock("@/lib/auth/useMe", () => ({ useMe: vi.fn() }));
vi.mock("@/lib/api/inquiries.admin", () => ({ listInquiries: vi.fn() }));
import { useMe } from "@/lib/auth/useMe";
import { listInquiries } from "@/lib/api/inquiries.admin";

const mockMe = (perms: string[] | null, isLoading = false) =>
  (useMe as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: perms ? { permissions: perms } : undefined,
    isLoading,
  });

function renderHub() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ManageHub />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("ManageHub", () => {
  it("보유 권한 도메인만 이름·설명과 함께 노출한다", () => {
    mockMe(["SERMON_WRITE"]);
    renderHub();
    expect(screen.queryByText("설교 관리")).not.toBeNull();
    expect(screen.queryByText("설교를 올리고 고쳐요")).not.toBeNull();
    expect(screen.queryByText("공지 관리")).toBeNull();
    expect(screen.queryByText("역할·권한 관리")).toBeNull();
  });

  it("테마별 카테고리로 묶고, 카드 0개인 카테고리 제목은 숨긴다", () => {
    mockMe(["SERMON_WRITE", "GALLERY_WRITE"]); // content + media 카테고리
    renderHub();
    expect(screen.queryByText("콘텐츠")).not.toBeNull();
    expect(screen.queryByText("미디어·업로드")).not.toBeNull();
    expect(screen.queryByText("조직")).toBeNull();
    expect(screen.queryByText("회원·권한")).toBeNull();
  });

  it("찾기 칸에 입력하면 이름·설명이 맞는 메뉴만 남고, 없으면 안내한다", () => {
    mockMe(["SERMON_WRITE", "BULLETIN_WRITE", "MEMBER_MANAGE"]);
    renderHub();
    const box = screen.getByRole("searchbox", { name: "관리 메뉴 찾기" });
    fireEvent.change(box, { target: { value: "주보" } });
    expect(screen.queryByText("주보 관리")).not.toBeNull();
    expect(screen.queryByText("설교 관리")).toBeNull();
    expect(screen.queryByText("콘텐츠")).toBeNull(); // 걸린 메뉴가 없는 분류는 제목째 숨김
    fireEvent.change(box, { target: { value: "없는말" } });
    expect(screen.getByRole("status").textContent).toContain("찾는 관리 메뉴가 없어요");
  });

  it("최근에 연 관리는 이 기기 기록 중 권한 있는 것만 보여주고, 누르면 맨 앞으로 기록한다", () => {
    localStorage.setItem("mypage:recent-manage", JSON.stringify(["roles", "bulletins"]));
    mockMe(["SERMON_WRITE", "BULLETIN_WRITE"]); // roles 권한 없음
    renderHub();
    expect(screen.queryByText("최근에 연 관리")).not.toBeNull();
    const links = screen.getAllByRole("link", { name: /주보 관리/ });
    expect(links).toHaveLength(2); // 최근 + 분류 목록
    expect(screen.queryByText("역할·권한 관리")).toBeNull();
    fireEvent.click(screen.getAllByRole("link", { name: /설교 관리/ })[0]);
    expect(JSON.parse(localStorage.getItem("mypage:recent-manage") ?? "[]")).toEqual(["sermons", "roles", "bulletins"]);
  });

  it("최근 기록이 깨져 있어도 목록 없이 동작한다", () => {
    localStorage.setItem("mypage:recent-manage", "{broken");
    mockMe(["SERMON_WRITE"]);
    renderHub();
    expect(screen.queryByText("최근에 연 관리")).toBeNull();
    expect(screen.queryByText("설교 관리")).not.toBeNull();
  });

  it("문의 권한이 있으면 미처리 문의 건수를 배지로 보여준다", async () => {
    (listInquiries as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: [],
      page: { size: 1, number: 0, totalElements: 3, totalPages: 3 },
    });
    mockMe(["INQUIRY_MANAGE"]);
    renderHub();
    await waitFor(() => expect(screen.getByLabelText("미처리 3건")).toBeDefined());
    expect(listInquiries).toHaveBeenCalledWith({ completed: false, page: 0, size: 1 });
  });

  it("문의 권한이 없으면 문의 건수를 조회하지 않는다", () => {
    mockMe(["SERMON_WRITE"]);
    renderHub();
    expect(listInquiries).not.toHaveBeenCalled();
  });

  it("관리 권한이 하나도 없으면 섹션 자체를 렌더하지 않는다", () => {
    mockMe(["GALLERY_VIEW"]);
    const { container } = renderHub();
    expect(container.querySelector("section")).toBeNull();
  });

  it("로딩 중이면 렌더하지 않는다", () => {
    mockMe(null, true);
    const { container } = renderHub();
    expect(container.querySelector("section")).toBeNull();
  });
});
