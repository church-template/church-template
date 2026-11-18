import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

describe("SheetContent side", () => {
  it("bottom은 화면 아래에 붙고 위 모서리만 둥글다(좁은 화면 미리보기 시트)", () => {
    render(
      <Sheet open>
        <SheetContent side="bottom" aria-describedby={undefined}>
          <SheetTitle>미리보기</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    const content = screen.getByRole("dialog", { name: "미리보기" });
    expect(content.className).toContain("bottom-0");
    expect(content.className).toContain("rounded-t-xl");
    expect(content.className).not.toContain("right-0");
  });

  it("기본(right)은 그대로 오른쪽 서랍이다", () => {
    render(
      <Sheet open>
        <SheetContent aria-describedby={undefined}>
          <SheetTitle>메뉴</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("dialog", { name: "메뉴" }).className).toContain("right-0");
  });
});
