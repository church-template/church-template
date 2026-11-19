import { describe, it, expect } from "vitest";
import { permissionLabel } from "./permissions";

describe("permissionLabel", () => {
  it("정의된 권한은 한글 라벨", () => {
    expect(permissionLabel("SERMON_WRITE")).toBe("설교 관리");
    expect(permissionLabel("GALLERY_VIEW")).toBe("갤러리 열람");
  });
  it("공개 범위 기능의 새 권한도 한글 라벨(역할 관리 화면 raw 키 노출 방지)", () => {
    expect(permissionLabel("NOTICE_VIEW")).toBe("공지 열람");
    expect(permissionLabel("EVENT_VIEW")).toBe("일정 열람");
    expect(permissionLabel("BULLETIN_VIEW")).toBe("주보 열람");
    expect(permissionLabel("SERMON_VIEW")).toBe("설교 열람");
    expect(permissionLabel("VISIBILITY_MANAGE")).toBe("공개 범위 관리");
  });
  it("미정의 권한은 raw 폴백", () => {
    expect(permissionLabel("UNKNOWN_PERM")).toBe("UNKNOWN_PERM");
  });
});
