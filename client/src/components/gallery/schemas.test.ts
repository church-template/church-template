// src/components/gallery/schemas.test.ts
import { describe, it, expect } from "vitest";
import { albumSchema } from "./schemas";

describe("albumSchema", () => {
  it("제목만 있어도 통과(설명·태그는 선택)", () => {
    expect(albumSchema.safeParse({ title: "앨범", description: "", tagIds: [], membersOnly: false }).success).toBe(true);
  });
  it("제목 비면 실패", () => {
    expect(albumSchema.safeParse({ title: "", description: "", tagIds: [], membersOnly: false }).success).toBe(false);
  });
  // zod는 모르는 칸을 버린다 — 스키마에 없으면 폼의 교인만 체크가 저장 body에서 사라진다.
  it("교인만 보기(membersOnly) 값을 결과에 남긴다", () => {
    const r = albumSchema.safeParse({ title: "앨범", description: "", tagIds: [], membersOnly: true });
    expect(r.success && r.data.membersOnly).toBe(true);
  });
});
