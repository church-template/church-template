"use client";

import { useSyncExternalStore } from "react";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";
import { formatRemaining, formatSlot, nextService } from "@/lib/nextService";

// 현재 시각(분 단위)을 외부 스토어로 구독 — 30초마다 확인해 분이 바뀌면 다시 그린다.
const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
};
const currentMinute = () => Math.floor(Date.now() / 60_000);
const noMinuteOnServer = () => null;

// "다음 예배" 띠(next-service-band) — 지금 시각 기준 다음 정기 예배와 남은 시간(한국 시간).
// 정적 페이지라 서버는 시각을 모른다: 서버 렌더에는 자리만 잡고(레이아웃 밀림 방지) 값은 클라이언트에서 채운다.
export function NextServiceBand() {
  const minute = useSyncExternalStore(subscribe, currentMinute, noMinuteOnServer);
  const next = minute === null ? null : nextService(WORSHIP_SERVICES, new Date(minute * 60_000));
  return (
    <div className="flex flex-col gap-xxs rounded-xl bg-primary-soft p-lg break-keep sm:flex-row sm:items-center sm:gap-md">
      <span className={cn(typo.captionStrong, "text-primary")}>{WORSHIP.nextLabel}</span>
      <span className={cn(typo.titleLg, "min-h-9 tabular-nums text-ink")}>
        {next
          ? `${next.service.name} · ${formatSlot(next.day, next.service.schedule.hour, next.service.schedule.minute)}`
          : null}
      </span>
      <span className={cn(typo.bodyMd, "tabular-nums text-body sm:ml-auto")}>
        {next ? formatRemaining(next.minutes) : null}
      </span>
    </div>
  );
}
