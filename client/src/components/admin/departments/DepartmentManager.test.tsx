import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMock, deleteMock, getDetailMock, createMock, updateMock, notifySuccess } = vi.hoisted(() => ({
  listMock: vi.fn(),
  deleteMock: vi.fn(),
  getDetailMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/departments.admin", () => ({
  listDepartmentsAdmin: listMock,
  deleteDepartment: deleteMock,
  getDepartmentDetail: getDetailMock,
  createDepartment: createMock,
  updateDepartment: updateMock,
}));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

import { DepartmentManager } from "./DepartmentManager";

const flat = [
  { id: 1, name: "학생부", leader: "김집사", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "이전도", parentId: 1, sortOrder: 10 },
  { id: 3, name: "고등부", leader: "박전도", parentId: 1, sortOrder: 20 },
  { id: 5, name: "1학년부", leader: "김교사", parentId: 2, sortOrder: 10 },
  { id: 4, name: "청년부", leader: "최목사", parentId: null, sortOrder: 20 },
];

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
function renderManager() {
  return render(
    <QueryClientProvider client={qc}>
      <DepartmentManager />
    </QueryClientProvider>,
  );
}

describe("DepartmentManager (접이식 트리)", () => {
  it("기본은 전체 펼침 — 깊은 노드까지 보인다", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("1학년부")).toBeDefined());
  });

  it("전체 접기 → 루트만, 전체 펼치기 → 복귀", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("1학년부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "전체 접기" }));
    await waitFor(() => expect(screen.queryByText("1학년부")).toBeNull());
    expect(screen.queryByText("중등부")).toBeNull();
    expect(screen.getByText("학생부")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "전체 펼치기" }));
    await waitFor(() => expect(screen.getByText("1학년부")).toBeDefined());
  });

  it("chevron으로 개별 접기", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("중등부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "중등부 접기" }));
    await waitFor(() => expect(screen.queryByText("1학년부")).toBeNull());
  });

  it("새 부서는 등록 페이지 링크다", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("중등부")).toBeDefined());
    expect(screen.getByRole("link", { name: "새 부서" }).getAttribute("href")).toBe("/mypage/manage/departments/new");
  });

  it("노드 ＋하위는 그 부모 id로 등록 페이지에 간다", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("중등부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "중등부 하위 추가" }));
    expect(pushMock).toHaveBeenCalledWith("/mypage/manage/departments/new?parentId=2");
  });

  it("노드 수정은 그 부서 수정 페이지로 간다", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("중등부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "중등부 수정" }));
    expect(pushMock).toHaveBeenCalledWith("/mypage/manage/departments/2/edit");
  });

  it("노드 삭제 확인 후 deleteDepartment를 호출한다", async () => {
    listMock.mockResolvedValue(flat);
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    await waitFor(() => expect(screen.getByText("중등부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "중등부 삭제" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(2));
  });

  it("공개 소개와 별개 데이터라는 안내를 보여준다", async () => {
    listMock.mockResolvedValue([]);
    renderManager();
    await waitFor(() => expect(screen.getByText(/자동 반영되지 않습니다/)).toBeDefined());
  });

  it("목록 조회 실패 시 빈 목록 대신 에러 안내를 보인다", async () => {
    listMock.mockRejectedValue(new Error("network"));
    renderManager();
    await waitFor(() => expect(screen.getByText(/불러오지 못했습니다/)).toBeDefined());
    expect(screen.queryByText("등록된 부서가 없습니다.")).toBeNull();
  });
});
