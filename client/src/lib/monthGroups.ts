// 월별 묶기·날짜 표기 — 목록 공용(공지·주보). 서버 날짜는 offset 없는 "2026-11-08"·"2026-11-08T10:00:00"이라
// Date로 바꾸지 않고 앞 10자에서 바로 읽는다(시간대에 따라 하루가 밀리는 문제 원천 차단, KST 가정).

export interface MonthGroup<T> {
  key: string; // "2026-11"
  label: string; // "2026년 11월"
  items: T[];
}

const parts = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return { y, m, d };
};

// 받은 순서(서버 정렬)를 유지한 채 연속한 같은 달끼리 묶는다.
export function groupByMonth<T>(items: T[], dateOf: (item: T) => string): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const item of items) {
    const date = dateOf(item);
    const key = date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      const { y, m } = parts(date);
      groups.push({ key, label: `${y}년 ${m}월`, items: [item] });
    }
  }
  return groups;
}

/** "11월 1일" — 월 묶음 안의 행 날짜 */
export function formatMonthDay(date: string): string {
  const { m, d } = parts(date);
  return `${m}월 ${d}일`;
}

/** "2026년 11월 8일" — 최신 항목 띠 */
export function formatLongDate(date: string): string {
  const { y, m, d } = parts(date);
  return `${y}년 ${m}월 ${d}일`;
}

// 날짜가 한국 날짜 기준 오늘 포함 최근 7일 안인지("이번 주" 표기 판단).
export function isWithinWeek(date: string, now: Date): boolean {
  const { y, m, d } = parts(date);
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  const diffDays = (today - Date.UTC(y, m - 1, d)) / 86_400_000;
  return diffDays >= 0 && diffDays < 7;
}
