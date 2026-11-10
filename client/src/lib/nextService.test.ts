import { describe, it, expect } from "vitest";
import { formatRemaining, formatSlot, nextService } from "./nextService";

const svc = (name: string, days: number[], hour: number, minute: number) => ({
  name,
  schedule: { days, hour, minute },
});
const SERVICES = [
  svc("새벽예배", [1, 2, 3, 4, 5, 6], 5, 30),
  svc("주일예배", [0], 11, 0),
  svc("수요예배", [3], 19, 20),
  svc("학생·청년예배", [6], 11, 0),
];
// 한국 시간 벽시계를 UTC 순간으로 — 보는 기기의 시간대와 무관하게 같은 결과여야 한다.
const kst = (iso: string) => new Date(`${iso}+09:00`);

describe("nextService", () => {
  it("화요일 오후면 다음은 수요일 새벽예배", () => {
    const n = nextService(SERVICES, kst("2026-11-10T17:28:00"))!; // 화요일
    expect(n.service.name).toBe("새벽예배");
    expect(n.day).toBe(3);
    expect(n.minutes).toBe(12 * 60 + 2);
  });

  it("수요일 새벽예배가 지나면 같은 날 저녁 수요예배", () => {
    const n = nextService(SERVICES, kst("2026-11-11T05:31:00"))!;
    expect(n.service.name).toBe("수요예배");
    expect(n.minutes).toBe(13 * 60 + 49);
  });

  it("토요일 낮이면 다음은 주일예배(주가 넘어가도 이어진다)", () => {
    const n = nextService(SERVICES, kst("2026-11-14T12:00:00"))!;
    expect(n.service.name).toBe("주일예배");
    expect(n.day).toBe(0);
    expect(n.minutes).toBe(23 * 60);
  });

  it("주일예배가 끝난 주일 오후면 월요일 새벽예배", () => {
    const n = nextService(SERVICES, kst("2026-11-15T11:01:00"))!;
    expect(n.service.name).toBe("새벽예배");
    expect(n.day).toBe(1);
  });

  it("시작 시각 정각은 지금 시작으로 본다", () => {
    expect(nextService(SERVICES, kst("2026-11-15T11:00:00"))!.minutes).toBe(0);
  });

  it("예배가 없으면 null", () => {
    expect(nextService([], kst("2026-11-10T17:28:00"))).toBeNull();
  });
});

describe("표시 문자열", () => {
  it("formatSlot: 요일 + 오전/오후 시각", () => {
    expect(formatSlot(3, 5, 30)).toBe("수요일 오전 5:30");
    expect(formatSlot(3, 19, 20)).toBe("수요일 오후 7:20");
    expect(formatSlot(0, 11, 0)).toBe("주일 오전 11:00");
    expect(formatSlot(6, 12, 5)).toBe("토요일 오후 12:05");
  });

  it("formatRemaining: 큰 단위 둘까지만, 0인 단위는 생략", () => {
    expect(formatRemaining(0)).toBe("지금 시작합니다");
    expect(formatRemaining(45)).toBe("45분 뒤");
    expect(formatRemaining(60)).toBe("1시간 뒤");
    expect(formatRemaining(722)).toBe("12시간 2분 뒤");
    expect(formatRemaining(1440)).toBe("1일 뒤");
    expect(formatRemaining(3 * 1440 + 5 * 60 + 9)).toBe("3일 5시간 뒤");
  });
});
