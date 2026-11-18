import { describe, it, expect } from "vitest";
import { safeReturnPath } from "./returnPath";

const F = "/mypage/manage/departments";

describe("safeReturnPath", () => {
  it("같은 사이트 경로는 그대로 돌려준다", () => {
    expect(safeReturnPath("/departments/student", F)).toBe("/departments/student");
  });

  it.each([
    ["//evil.example"],
    ["https://evil.example"],
    ["javascript:alert(1)"],
    ["/\\evil.example"],
    ["/\t/evil.example"],
    ["/\n/evil.example"],
    ["/\r/evil.example"],
    ["/a/..//evil.example"],
    ["/a/../\\evil.example"],
    ["departments/student"],
    [""],
  ])("외부·비정상 주소 %s는 기본 주소로 바꾼다", (from) => {
    expect(safeReturnPath(from, F)).toBe(F);
  });

  it("쿼리·조각은 그대로 둔다", () => {
    expect(safeReturnPath("/departments/student?x=1#y", F)).toBe("/departments/student?x=1#y");
  });

  it("없으면 기본 주소", () => {
    expect(safeReturnPath(null, F)).toBe(F);
    expect(safeReturnPath(undefined, F)).toBe(F);
  });
});
