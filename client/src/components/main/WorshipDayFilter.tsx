"use client";

import { useState, useSyncExternalStore } from "react";
import { ScheduleCard } from "@/components/cards/ScheduleCard";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, type WorshipService } from "@/constants/content";
import { kstWeekday } from "@/lib/nextService";

// 요일은 하루 안에서만 바뀌므로 구독은 필요 없다 — 서버는 시각을 몰라 "오늘" 표시를 비우고 클라이언트에서 채운다.
const noop = () => () => {};
const todayOnClient = () => kstWeekday(new Date());
const unknownOnServer = () => null;

type Day = "all" | number;

// 요일 칩(worship-day-filter) — 누른 요일에 드리는 예배만 켜고 나머지는 흐리게(지우지 않는다, 고령 가독).
export function WorshipDayFilter({ services }: { services: WorshipService[] }) {
  const [day, setDay] = useState<Day>("all");
  const today = useSyncExternalStore(noop, todayOnClient, unknownOnServer);
  const days: Day[] = ["all", 0, 1, 2, 3, 4, 5, 6];

  return (
    <>
      <div
        role="group"
        aria-label={WORSHIP.dayFilterLabel}
        className="-mx-[var(--container-padding)] flex gap-sm overflow-x-auto px-[var(--container-padding)] pb-xxs sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {days.map((d) => {
          const pressed = day === d;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={pressed}
              onClick={() => setDay(d)}
              className={cn(
                typo.button,
                // 56px(히어로 CTA와 같은 대형 터치 타깃) — 한 글자 요일도 넓게 누를 수 있게 최소 폭을 높이와 맞춘다
                "h-14 min-w-14 shrink-0 rounded-lg border px-lg transition-colors",
                "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                pressed ? "border-ink bg-ink text-on-dark" : "border-hairline bg-canvas text-ink hover:border-ink",
              )}
            >
              {d === "all" ? WORSHIP.dayAll : WORSHIP.dayShort[d]}
              {d === today ? ` · ${WORSHIP.dayToday}` : null}
            </button>
          );
        })}
      </div>
      <div className="mt-lg grid gap-base sm:grid-cols-2 lg:grid-cols-4">
        {services.map((s) => {
          const match = day === "all" ? "all" : s.schedule.days.includes(day) ? "on" : "off";
          return (
            <div
              key={s.name}
              data-match={match}
              className={cn(
                "rounded-xl transition duration-300 ease-out",
                match === "on" && "ring-2 ring-primary",
                match === "off" && "opacity-55",
              )}
            >
              <ScheduleCard name={s.name} time={s.time} place={s.place} />
            </div>
          );
        })}
      </div>
    </>
  );
}
