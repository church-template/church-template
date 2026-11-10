import { describe, it, expect } from "vitest";
import { formatLongDate, formatMonthDay, groupByMonth, isWithinWeek } from "./monthGroups";

describe("groupByMonth", () => {
  it("서버 순서를 유지한 채 같은 달끼리 묶고, 날짜 꺼내는 함수를 받는다", () => {
    const items = [
      { id: 1, createdAt: "2026-11-08T10:00:00" },
      { id: 2, createdAt: "2026-11-01T09:00:00" },
      { id: 3, createdAt: "2026-10-25T09:00:00" },
    ];
    const groups = groupByMonth(items, (i) => i.createdAt);
    expect(groups.map((g) => g.label)).toEqual(["2026년 11월", "2026년 10월"]);
    expect(groups[0].items.map((i) => i.id)).toEqual([1, 2]);
  });

  it("빈 배열이면 빈 묶음", () => {
    expect(groupByMonth([], (i: { d: string }) => i.d)).toEqual([]);
  });
});

describe("날짜 표기", () => {
  it("날짜·날짜시각 문자열 모두 앞 10자로 읽는다", () => {
    expect(formatMonthDay("2026-11-01")).toBe("11월 1일");
    expect(formatMonthDay("2026-11-01T23:59:00")).toBe("11월 1일");
    expect(formatLongDate("2026-01-09")).toBe("2026년 1월 9일");
  });

  it("isWithinWeek: 한국 날짜 기준 오늘 포함 7일 안, 미래는 아님", () => {
    const now = new Date("2026-11-10T08:00:00+09:00");
    expect(isWithinWeek("2026-11-08", now)).toBe(true);
    expect(isWithinWeek("2026-11-03", now)).toBe(false);
    expect(isWithinWeek("2026-11-11", now)).toBe(false);
  });
});
