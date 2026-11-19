import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { NEWS_LIST } from "@/constants/news";
import { EventDetailView } from "./EventDetailView";
import { EventDetailActions } from "./EventAdminActions";
import type { EventDetailResponse } from "@/lib/api/types";

// 일정 상세 페이지 본문(뒤로 링크·제목·관리 액션·본문) — 서버 렌더(누구나)와 브라우저 조회(교인만) 공용(훅 없음).
export function EventDetailBody({ event, signed = false }: { event: EventDetailResponse; signed?: boolean }) {
  return (
    <>
      <Link
        href="/events"
        className={cn(typo.bodySm, "inline-flex items-center gap-xxs text-primary")}
      >
        <ChevronLeft size={16} aria-hidden />
        {NEWS_LIST.eventTitle}
      </Link>

      <div className="flex items-start justify-between gap-base mt-lg">
        <h1 className={cn(typo.titleLg, "text-ink")}>{event.title}</h1>
        <EventDetailActions event={event} />
      </div>
      <div className="mt-xs">
        <EventDetailView event={event} signed={signed} />
      </div>
    </>
  );
}
