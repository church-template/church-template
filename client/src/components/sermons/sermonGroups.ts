// 설교 목록 묶기·표기 — 순수 함수. preachedAt은 offset 없는 날짜("2026-11-08")라
// Date로 바꾸지 않고 문자열에서 바로 읽는다(시간대에 따라 하루가 밀리는 문제를 원천 차단).

export interface MonthGroup<T> {
  key: string; // "2026-11"
  label: string; // "2026년 11월"
  items: T[];
}

const parts = (ymd: string) => {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return { y, m, d };
};

// 받은 순서(서버 정렬: 최신순)를 유지한 채 같은 달끼리 묶는다.
export function groupByMonth<T extends { preachedAt: string }>(items: T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const item of items) {
    const key = item.preachedAt.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      const { y, m } = parts(item.preachedAt);
      groups.push({ key, label: `${y}년 ${m}월`, items: [item] });
    }
  }
  return groups;
}

/** "11월 1일" — 월 묶음 안의 행 날짜 */
export function formatMonthDay(ymd: string): string {
  const { m, d } = parts(ymd);
  return `${m}월 ${d}일`;
}

/** "2026년 11월 8일" — 최신 말씀 띠 */
export function formatLongDate(ymd: string): string {
  const { y, m, d } = parts(ymd);
  return `${y}년 ${m}월 ${d}일`;
}

// 최신 설교가 최근 7일 안이면 "이번 주" — 기준일은 한국 날짜(교회 소재지).
export function isWithinWeek(ymd: string, now: Date): boolean {
  const { y, m, d } = parts(ymd);
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  const diffDays = (today - Date.UTC(y, m - 1, d)) / 86_400_000;
  return diffDays >= 0 && diffDays < 7;
}
