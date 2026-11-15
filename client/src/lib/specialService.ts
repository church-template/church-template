// 특별 예배의 "다음 예배" 계산 — 한국 날짜 기준 순수 함수.
// 상수의 날짜 표기("5월 셋째 주일" 등)는 사람이 읽는 문구라, 계산은 따로 둔 규칙(rule)으로만 한다.
import { civilKey, civilWeekday, kstCivilFromDate, type CivilDate } from "@/lib/calendar";

export type SpecialRule =
  | { type: "fixed"; month: number; day: number }
  | { type: "nthSunday"; month: number; n: number }
  | { type: "lastSunday"; month: number }
  | { type: "easter" };

// 부활절(서방 교회력) — 익명 그레고리력 계산법.
function easter(y: number): CivilDate {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  return { y, m: month, d: ((h + l - 7 * m + 114) % 31) + 1 };
}

export function occursIn(rule: SpecialRule, y: number): CivilDate {
  switch (rule.type) {
    case "fixed":
      return { y, m: rule.month, d: rule.day };
    case "easter":
      return easter(y);
    case "nthSunday": {
      const firstSunday = 1 + ((7 - civilWeekday({ y, m: rule.month, d: 1 })) % 7);
      return { y, m: rule.month, d: firstSunday + 7 * (rule.n - 1) };
    }
    case "lastSunday": {
      const last = new Date(Date.UTC(y, rule.month, 0)).getUTCDate();
      return { y, m: rule.month, d: last - civilWeekday({ y, m: rule.month, d: last }) };
    }
  }
}

const dayNumber = (c: CivilDate) => Date.UTC(c.y, c.m - 1, c.d) / 86_400_000;

export interface NextSpecial<T> {
  service: T;
  date: CivilDate;
  days: number; // 오늘이면 0
}

// 규칙이 빠진 예배가 하나라도 있으면 null — 그 예배가 실제로 더 가까울 수 있어 틀린 "다음"을 보이지 않는다.
export function nextSpecial<T extends { rule?: SpecialRule }>(services: T[], now: Date): NextSpecial<T> | null {
  if (services.length === 0 || services.some((s) => !s.rule)) return null;
  const today = kstCivilFromDate(now);
  let best: NextSpecial<T> | null = null;
  for (const service of services) {
    let date = occursIn(service.rule!, today.y);
    if (civilKey(date) < civilKey(today)) date = occursIn(service.rule!, today.y + 1);
    const days = dayNumber(date) - dayNumber(today);
    if (!best || days < best.days) best = { service, date, days };
  }
  return best;
}

export function formatDaysLeft(days: number): string {
  if (days === 0) return "오늘이에요";
  if (days === 1) return "내일이에요";
  return `${days}일 남았어요`;
}
