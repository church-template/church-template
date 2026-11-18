import { describe, it, expect } from "vitest";
import { mediaSrc } from "./mediaUrl";

describe("mediaSrc", () => {
  it("서명 경로가 없으면 기존 무서명 주소를 조립한다", () => {
    expect(mediaSrc(7)).toBe("/api/media/7");
    expect(mediaSrc(7, undefined)).toBe("/api/media/7");
  });

  it("서명 경로가 있으면 그대로 API 베이스 뒤에 붙인다", () => {
    expect(mediaSrc(7, "/api/media/7?exp=1&sig=abc")).toBe("/api/media/7?exp=1&sig=abc");
  });
});
