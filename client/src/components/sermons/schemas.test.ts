import { describe, it, expect } from "vitest";
import { sermonSchema } from "./schemas";

describe("sermonSchema", () => {
  it("필수(title·preacher·preachedAt) 누락 시 실패한다", () => {
    const r = sermonSchema.safeParse({ title: "", preacher: "", preachedAt: "", content: "", tagIds: [] });
    expect(r.success).toBe(false);
  });
  it("필수가 채워지면 통과한다", () => {
    const r = sermonSchema.safeParse({
      title: "주일설교", preacher: "김목사", preachedAt: "2026-06-01",
      series: "", scripture: "", content: "", videoUrl: "", audioUrl: "", tagIds: [], membersOnly: false,
    });
    expect(r.success).toBe(true);
  });
  // zod는 모르는 칸을 버린다 — 스키마에 없으면 폼의 교인만 체크가 저장 body에서 사라진다.
  it("교인만 보기(membersOnly) 값을 결과에 남긴다", () => {
    const r = sermonSchema.safeParse({
      title: "주일설교", preacher: "김목사", preachedAt: "2026-06-01",
      series: "", scripture: "", content: "", videoUrl: "", audioUrl: "", tagIds: [], membersOnly: true,
    });
    expect(r.success && r.data.membersOnly).toBe(true);
  });
});
