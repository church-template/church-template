import { describe, it, expect } from "vitest";
import { formatLongDate, formatMonthDay, groupByMonth, isWithinWeek } from "./sermonGroups";

const s = (id: number, preachedAt: string) => ({ id, preachedAt });

describe("groupByMonth", () => {
  it("서버 순서(최신순)를 유지한 채 같은 달끼리 묶는다", () => {
    const groups = groupByMonth([s(1, "2026-11-08"), s(2, "2026-11-01"), s(3, "2026-10-25"), s(4, "2025-12-28")]);
    expect(groups.map((g) => g.label)).toEqual(["2026년 11월", "2026년 10월", "2025년 12월"]);
    expect(groups[0].items.map((i) => i.id)).toEqual([1, 2]);
  });

  it("빈 배열이면 빈 묶음", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe("날짜 표기", () => {
  it("문자열에서 바로 읽어 시간대와 무관하게 같은 날", () => {
    expect(formatMonthDay("2026-11-01")).toBe("11월 1일");
    expect(formatLongDate("2026-01-09")).toBe("2026년 1월 9일");
  });

  it("isWithinWeek: 한국 날짜 기준 오늘 포함 7일 안", () => {
    const now = new Date("2026-11-10T08:00:00+09:00");
    expect(isWithinWeek("2026-11-10", now)).toBe(true);
    expect(isWithinWeek("2026-11-04", now)).toBe(true);
    expect(isWithinWeek("2026-11-03", now)).toBe(false);
    expect(isWithinWeek("2026-11-11", now)).toBe(false); // 미래 날짜는 이번 주로 부르지 않는다
    // 한국 자정 직후(UTC로는 전날)에도 한국 날짜로 판단한다
    expect(isWithinWeek("2026-11-10", new Date("2026-11-10T00:30:00+09:00"))).toBe(true);
  });
});
