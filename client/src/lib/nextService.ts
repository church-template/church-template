// "다음 예배" 계산 — 순수 함수. 요일·시각은 모두 한국 시간(교회 소재지) 기준이라
// 해외에서 보는 기기에서도 같은 답이 나오도록 기기 시간대가 아니라 UTC+9로 직접 읽는다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_MIN = 7 * 24 * 60;
const DAY_NAMES = ["주일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export interface Scheduled {
  schedule: { days: number[]; hour: number; minute: number }; // days: 0=주일 … 6=토
}

export interface NextService<T> {
  service: T;
  day: number; // 그 예배가 열리는 요일
  minutes: number; // 지금부터 남은 분(0 = 지금 시작)
}

// 정기 예배만 본다 — 특별 예배·휴일 변동은 상수에 요일 구조가 없어 반영하지 않는다.
export function nextService<T extends Scheduled>(services: T[], now: Date): NextService<T> | null {
  const k = new Date(now.getTime() + KST_OFFSET_MS); // UTC getter로 읽으면 한국 벽시계
  const nowMin = k.getUTCDay() * 1440 + k.getUTCHours() * 60 + k.getUTCMinutes();
  let best: NextService<T> | null = null;
  for (const service of services) {
    const { days, hour, minute } = service.schedule;
    for (const day of days) {
      const minutes = (day * 1440 + hour * 60 + minute - nowMin + WEEK_MIN) % WEEK_MIN;
      if (!best || minutes < best.minutes) {
        best = { service, day, minutes };
      }
    }
  }
  return best;
}

export function formatSlot(day: number, hour: number, minute: number): string {
  const meridiem = hour < 12 ? "오전" : "오후";
  const h = hour % 12 || 12;
  return `${DAY_NAMES[day]} ${meridiem} ${h}:${String(minute).padStart(2, "0")}`;
}

export function formatRemaining(minutes: number): string {
  if (minutes <= 0) return "지금 시작합니다";
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0) return h > 0 ? `${d}일 ${h}시간 뒤` : `${d}일 뒤`;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분 뒤` : `${h}시간 뒤`;
  return `${m}분 뒤`;
}
