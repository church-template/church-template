import { describe, it, expect } from "vitest";
import { formatDaysLeft, nextSpecial, occursIn, type SpecialRule } from "./specialService";

// 한국 시간 벽시계를 UTC 순간으로 — 보는 기기의 시간대와 무관하게 같은 결과여야 한다.
const kst = (iso: string) => new Date(`${iso}+09:00`);
const svc = (name: string, rule?: SpecialRule) => ({ name, rule });

describe("occursIn", () => {
  it("고정일", () => {
    expect(occursIn({ type: "fixed", month: 12, day: 25 }, 2026)).toEqual({ y: 2026, m: 12, d: 25 });
  });
  it("n째 주일 — 2026년 11월 1일이 주일이라 셋째 주일은 15일", () => {
    expect(occursIn({ type: "nthSunday", month: 11, n: 3 }, 2026)).toEqual({ y: 2026, m: 11, d: 15 });
  });
  it("마지막 주일 — 2026년 6월 30일(화) → 28일", () => {
    expect(occursIn({ type: "lastSunday", month: 6 }, 2026)).toEqual({ y: 2026, m: 6, d: 28 });
  });
  it("부활절(서방 교회력)", () => {
    expect(occursIn({ type: "easter" }, 2026)).toEqual({ y: 2026, m: 4, d: 5 });
    expect(occursIn({ type: "easter" }, 2027)).toEqual({ y: 2027, m: 3, d: 28 });
  });
});

describe("nextSpecial", () => {
  const SERVICES = [
    svc("송구영신", { type: "fixed", month: 1, day: 1 }),
    svc("추수감사", { type: "nthSunday", month: 11, n: 3 }),
    svc("성탄절", { type: "fixed", month: 12, day: 25 }),
  ];

  it("당일이면 그 예배, 0일", () => {
    const n = nextSpecial(SERVICES, kst("2026-11-15T23:59:00"))!;
    expect(n.service.name).toBe("추수감사");
    expect(n.days).toBe(0);
  });
  it("지난 날은 건너뛴다", () => {
    const n = nextSpecial(SERVICES, kst("2026-11-16T00:00:00"))!;
    expect(n.service.name).toBe("성탄절");
    expect(n.days).toBe(39);
  });
  it("연말 이후엔 내년 송구영신", () => {
    const n = nextSpecial(SERVICES, kst("2026-12-26T09:00:00"))!;
    expect(n.service.name).toBe("송구영신");
    expect(n.date).toEqual({ y: 2027, m: 1, d: 1 });
  });
  it("규칙이 없는 예배가 하나라도 있으면 null — 틀린 '다음 예배'를 보이지 않는다", () => {
    expect(nextSpecial([...SERVICES, svc("창립기념")], kst("2026-11-16T00:00:00"))).toBeNull();
  });
});

describe("formatDaysLeft", () => {
  it("오늘·내일·N일", () => {
    expect(formatDaysLeft(0)).toBe("오늘이에요");
    expect(formatDaysLeft(1)).toBe("내일이에요");
    expect(formatDaysLeft(39)).toBe("39일 남았어요");
  });
});
