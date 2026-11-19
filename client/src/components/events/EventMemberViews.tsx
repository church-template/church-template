"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { NEWS_LIST } from "@/constants/news";
import { EVENTS_PAGE_SIZE } from "@/lib/api/events";
import { buildCalendarModel, kstCivilFromDate } from "@/lib/calendar";
import { DetailSkeleton } from "@/components/common/DetailSkeleton";
import { MemberQueryFallback } from "@/components/common/MemberGate";
import { useEvent, useEvents } from "./queries";
import { EventCalendar } from "./EventCalendar";
import { EventDetailBody } from "./EventDetailBody";
import { EventForm } from "./EventForm";

const LABEL = NEWS_LIST.eventTitle;

// 교인만 메뉴의 일정 캘린더(MemberGate 안) — 서버 경로와 같은 쿼리·같은 캘린더 모델.
export function EventCalendarClient({ year, month, tagId }: { year: number; month: number; tagId?: number }) {
  const q = useEvents({ year, month, tagId, size: EVENTS_PAGE_SIZE });
  const [now] = useState(() => new Date()); // "오늘" 판정 기준 — 렌더마다 바뀌지 않게 마운트 시 고정
  if (q.isPending || q.isError || !q.data) {
    return <MemberQueryFallback query={q} domainLabel={LABEL} loadError={NEWS_LIST.eventLoadError} />;
  }
  const model = buildCalendarModel({ year, month, today: kstCivilFromDate(now), events: q.data.content });
  return <EventCalendar model={model} tagId={tagId} />;
}

export function EventDetailClient({ id }: { id: number }) {
  const q = useEvent(id);
  if (q.isPending || q.isError || !q.data) {
    return (
      <MemberQueryFallback query={q} domainLabel={LABEL} loadError={NEWS_LIST.eventLoadError} pending={<DetailSkeleton />} />
    );
  }
  return <EventDetailBody event={q.data} signed />;
}

// 수정 화면 시드 — 설정과 무관하게 브라우저에서 읽는다. version을 key에 넣어 409 뒤 최신 version으로 다시 마운트.
export function EventEditLoader({ id }: { id: number }) {
  const q = useEvent(id);
  if (q.isPending || q.isError || !q.data) {
    return (
      <MemberQueryFallback
        query={q}
        domainLabel={LABEL}
        loadError={NEWS_LIST.eventLoadError}
        pending={<p className={cn(typo.bodySm, "text-muted")}>{NEWS_LIST.loading}</p>}
      />
    );
  }
  return <EventForm key={`${q.data.id}-${q.data.version}`} mode="edit" initial={q.data} />;
}
