import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/components/admin/RequirePermission", () => ({
  RequirePermission: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/admin/EditGate", () => ({ EditAccessDenied: () => <div data-testid="access-denied" /> }));
vi.mock("@/components/admin/departments/DepartmentEditForm", () => ({
  DepartmentEditForm: (p: { mode: string; editId?: number; from?: string | null; defaultParentId?: number | null }) => (
    <div
      data-testid="form"
      data-mode={p.mode}
      data-id={p.editId}
      data-from={p.from ?? ""}
      data-parent={p.defaultParentId === undefined ? "undefined" : String(p.defaultParentId)}
    />
  ),
}));

import DepartmentEditPage from "./page";
import DepartmentNewPage from "../../new/page";

const sp = (o: Record<string, string> = {}) => Promise.resolve(o);

describe("부서 수정 페이지", () => {
  it.each([["abc"], ["0"], ["-3"], ["1.5"]])("잘못된 id %s는 notFound", async (id) => {
    await expect(DepartmentEditPage({ params: Promise.resolve({ id }), searchParams: sp() })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("숫자 id와 from을 폼에 넘긴다", async () => {
    render(await DepartmentEditPage({ params: Promise.resolve({ id: "7" }), searchParams: sp({ from: "/departments/student" }) }));
    const form = screen.getByTestId("form");
    expect(form.dataset.mode).toBe("edit");
    expect(form.dataset.id).toBe("7");
    expect(form.dataset.from).toBe("/departments/student");
  });
});

describe("부서 등록 페이지", () => {
  it("parentId가 양의 정수면 상위로 넘긴다", async () => {
    render(await DepartmentNewPage({ searchParams: sp({ parentId: "2" }) }));
    const form = screen.getByTestId("form");
    expect(form.dataset.mode).toBe("create");
    expect(form.dataset.parent).toBe("2");
  });

  it.each([["abc"], ["0"], [""]])("parentId %s는 최상위(null)로 둔다", async (parentId) => {
    render(await DepartmentNewPage({ searchParams: sp({ parentId }) }));
    expect(screen.getByTestId("form").dataset.parent).toBe("null");
  });
});
