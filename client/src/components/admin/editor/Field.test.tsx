import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "./Field";
import { FormSection } from "./FormSection";
import { ChangedBadge } from "./ChangedBadge";

describe("Field", () => {
  it("라벨에 필수 표기를 붙여 입력의 접근 이름이 된다", () => {
    render(
      <Field id="dept-name" label="부서명" required>
        <input id="dept-name" />
      </Field>,
    );
    expect(screen.getByLabelText("부서명 (필수)")).toBeDefined();
  });

  it("선택 표기는 흐린 글자다", () => {
    render(
      <Field id="dept-leader" label="담당" required={false}>
        <input id="dept-leader" />
      </Field>,
    );
    expect(screen.getByText("(선택)").className).toContain("text-muted");
  });

  it("설명은 입력칸 뒤에 온다(나란한 두 칸의 입력칸 높이가 맞도록)", () => {
    render(
      <Field id="dept-sort" label="정렬 순서" required={false} help="숫자가 작을수록 앞에 나옵니다.">
        <input id="dept-sort" />
      </Field>,
    );
    const input = screen.getByLabelText("정렬 순서 (선택)");
    const help = screen.getByText("숫자가 작을수록 앞에 나옵니다.");
    expect(input.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("id가 없으면 라벨은 label이 아닌 span이다(사진·편집기처럼 단일 입력이 아닌 칸)", () => {
    const { container } = render(
      <Field label="대표 사진" required={false}>
        <button type="button">사진 고르기</button>
      </Field>,
    );
    expect(container.querySelector("label")).toBeNull();
    expect(screen.getByText("대표 사진")).toBeDefined();
  });
});

describe("FormSection", () => {
  it("제목으로 이름 붙은 구역이다", () => {
    render(
      <FormSection id="sec-photo" title="사진" lead="자주 바꾸지 않는 설정입니다.">
        <p>내용</p>
      </FormSection>,
    );
    const region = screen.getByRole("region", { name: "사진" });
    expect(region.id).toBe("sec-photo");
    expect(screen.getByRole("heading", { level: 2, name: "사진" })).toBeDefined();
    expect(screen.getByText("자주 바꾸지 않는 설정입니다.")).toBeDefined();
  });
});

describe("ChangedBadge", () => {
  it("'바뀜'을 primary 배지로 보인다", () => {
    render(<ChangedBadge />);
    expect(screen.getByText("바뀜").className).toContain("bg-primary-soft");
  });
});
