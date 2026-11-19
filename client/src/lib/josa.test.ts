import { describe, it, expect } from "vitest";
import { josa } from "./josa";

describe("josa", () => {
  it("받침에 맞는 조사", () => {
    expect(josa("일정", "은는")).toBe("일정은");
    expect(josa("갤러리", "은는")).toBe("갤러리는");
    expect(josa("공지", "을를")).toBe("공지를");
    expect(josa("일정", "을를")).toBe("일정을");
    expect(josa("설교", "은는")).toBe("설교는");
    expect(josa("주보", "을를")).toBe("주보를");
  });
  it("한글이 아니면 뒤쪽 조사", () => {
    expect(josa("Q&A", "은는")).toBe("Q&A는");
    expect(josa("", "을를")).toBe("를");
  });
});
