import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditPageShell, type EditPageShellProps } from "./EditPageShell";

function renderShell(over: Partial<EditPageShellProps> = {}) {
  const props: EditPageShellProps = {
    title: "학생부 수정",
    back: { href: "/departments/student", label: "학생부 화면으로 돌아가기" },
    formId: "dept-edit-form",
    dirty: false,
    submitting: false,
    canSubmit: true,
    onCancel: vi.fn(),
    previewTitle: "방문자에게 이렇게 보입니다",
    preview: <p>미리보기 내용</p>,
    children: <form id="dept-edit-form" />,
    ...over,
  };
  render(<EditPageShell {...props} />);
  return props;
}

describe("EditPageShell", () => {
  it("제목과 돌아가기 링크를 보인다", () => {
    renderShell();
    expect(screen.getByRole("heading", { level: 1, name: "학생부 수정" })).toBeDefined();
    expect(screen.getByRole("link", { name: "학생부 화면으로 돌아가기" }).getAttribute("href")).toBe("/departments/student");
  });

  it("바꾼 게 없으면 상태 문구가 없고, 있으면 알린다", () => {
    renderShell();
    expect(screen.queryByText("저장하지 않은 변경이 있습니다.")).toBeNull();
  });

  it("바꾼 게 있으면 상태 문구를 status로 알린다", () => {
    renderShell({ dirty: true });
    expect(screen.getByRole("status").textContent).toBe("저장하지 않은 변경이 있습니다.");
  });

  it("저장은 폼 밖에서도 그 폼을 제출하고, 제출할 수 없으면 비활성이다", () => {
    renderShell({ canSubmit: false });
    const save = screen.getByRole("button", { name: "저장" });
    expect(save.getAttribute("form")).toBe("dept-edit-form");
    expect(save.getAttribute("type")).toBe("submit");
    expect((save as HTMLButtonElement).disabled).toBe(true);
  });

  it("취소는 onCancel을 한 번 부른다", () => {
    const p = renderShell();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it("넓은 화면 미리보기 칸은 미리보기 제목으로 이름 붙는다", () => {
    renderShell();
    expect(screen.getByRole("complementary", { name: "방문자에게 이렇게 보입니다" }).textContent).toContain("미리보기 내용");
  });

  it("미리보기 버튼은 아래 시트로 같은 미리보기를 연다", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));
    const sheet = screen.getByRole("dialog", { name: "방문자에게 이렇게 보입니다" });
    expect(sheet.textContent).toContain("미리보기 내용");
  });
});
