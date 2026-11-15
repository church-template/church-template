"use client";

import { useSyncExternalStore } from "react";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, SPECIAL_SERVICES } from "@/constants/content";
import { civilWeekday } from "@/lib/calendar";
import { formatDaysLeft, nextSpecial } from "@/lib/specialService";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// NextServiceBand와 같은 구독 — 자정을 넘기면 다음 예배·남은 날이 바뀐다.
const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
};
const currentMinute = () => Math.floor(Date.now() / 60_000);
const noMinuteOnServer = () => null;

// "다음 특별 예배" 띠 — 방문자가 실제로 묻는 "다음은 언제?"를 한 곳에만 크게 답한다.
// 정적 페이지라 서버 렌더에는 자리만 잡고 값은 클라이언트에서 채운다. 규칙이 빠진 예배가 있으면 띠째 숨긴다.
export function SpecialNextBand() {
  const minute = useSyncExternalStore(subscribe, currentMinute, noMinuteOnServer);
  if (SPECIAL_SERVICES.some((s) => !s.rule)) return null;
  const next = minute === null ? null : nextSpecial(SPECIAL_SERVICES, new Date(minute * 60_000));
  return (
    <div className="mt-xxl flex flex-col gap-xxs rounded-xl bg-primary-soft p-xl break-keep md:flex-row md:items-end md:gap-md">
      <div>
        <p className={cn(typo.captionStrong, "text-primary")}>{WORSHIP.specialNextLabel}</p>
        <p className={cn(typo.titleLg, "mt-xxs min-h-10 text-ink")}>{next ? next.service.name : null}</p>
        <p className={cn(typo.datetimeLg, "min-h-8 text-ink")}>
          {next
            ? `${next.date.m}월 ${next.date.d}일 ${WEEKDAYS[civilWeekday(next.date)]}요일 · ${next.service.time}`
            : null}
        </p>
      </div>
      <p className={cn(typo.bodyMd, "text-body md:ml-auto")}>{next ? formatDaysLeft(next.days) : null}</p>
    </div>
  );
}
