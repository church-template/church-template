import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { useMeMock, refreshMock, dialogMock } = vi.hoisted(() => ({
  useMeMock: vi.fn(),
  refreshMock: vi.fn(),
  dialogMock: vi.fn(),
}));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("@/lib/api/departments.admin", () => ({ listDepartmentsAdmin: vi.fn(async () => []) }));
// 수정 창 자체는 DepartmentFormDialog 테스트가 커버 — 여기선 열림·대상 id만 본다.
vi.mock("@/components/admin/departments/DepartmentFormDialog", () => ({
  DepartmentFormDialog: (props: { open: boolean; editId: number }) => {
    dialogMock(props);
    return props.open ? <div role="dialog">{`edit-${props.editId}`}</div> : null;
  },
}));

import { DeptEditAction } from "./DeptEditAction";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderAction = () =>
  render(<QueryClientProvider client={qc}><DeptEditAction backendId={7} /></QueryClientProvider>);

describe("DeptEditAction", () => {
  it("DEPT_WRITE 보유자에게 수정 버튼을 보이고, 누르면 해당 부서 수정 창을 연다", () => {
    useMeMock.mockReturnValue({ data: { permissions: ["DEPT_WRITE"] }, isLoading: false });
    renderAction();
    fireEvent.click(screen.getByRole("button", { name: "부서 수정" }));
    expect(screen.getByRole("dialog").textContent).toBe("edit-7");
  });

  it("권한이 없으면 아무것도 보이지 않는다", () => {
    useMeMock.mockReturnValue({ data: { permissions: ["NOTICE_WRITE"] }, isLoading: false });
    renderAction();
    expect(screen.queryByRole("button", { name: "부서 수정" })).toBeNull();
  });

  it("비로그인(me 없음)이면 보이지 않는다", () => {
    useMeMock.mockReturnValue({ data: undefined, isLoading: false });
    renderAction();
    expect(screen.queryByRole("button", { name: "부서 수정" })).toBeNull();
  });
});
