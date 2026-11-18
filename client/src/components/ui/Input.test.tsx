import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./Input";

describe("Input aria-describedby", () => {
  it("호출한 쪽의 설명 id를 그대로 쓴다(칸 아래 설명을 스크린리더가 읽게)", () => {
    render(<Input id="sort" aria-label="정렬 순서" aria-describedby="sort-help" />);
    expect(screen.getByLabelText("정렬 순서").getAttribute("aria-describedby")).toBe("sort-help");
  });

  it("오류가 있으면 설명 id와 오류 id를 둘 다 건다", () => {
    render(<Input id="sort" aria-label="정렬 순서" aria-describedby="sort-help" error="0 이상" />);
    const ids = (screen.getByLabelText("정렬 순서").getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toContain("sort-help");
    expect(ids).toContain("sort-error");
  });
});
