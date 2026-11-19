import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate, formatEventTime } from "@/lib/date";
import { formatAllDayRange } from "@/lib/calendar";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import type { EventDetailResponse } from "@/lib/api/types";

// 상세 본문(제목 제외 — 소비처가 헤딩 제공). 시각줄·장소·태그·마크다운. 서버·클라 공용.
// signed: 브라우저 조회 결과일 때만 true(본문 이미지를 응답의 서명 주소로). 서버 렌더는 넘기지 않는다 —
// 페이지가 60초 캐시라 1시간짜리 서명이 만료된 채 나가면 404(누구나 일정이라 무서명이 늘 열린다).
export function EventDetailView({ event, signed = false }: { event: EventDetailResponse; signed?: boolean }) {
  // all-day 범위는 버킷과 동일한 lastC에서 파생(formatAllDayRange), 타임드는 formatEventTime.
  const range = event.allDay
    ? formatAllDayRange(event.startAt, event.endAt ?? null)
    : formatEventTime(event.startAt, event.endAt, event.allDay);
  const timeLine = range ? `${formatDate(event.startAt)} ${range}` : formatDate(event.startAt);

  return (
    <div>
      <p className={cn(typo.datetime, "text-muted")}>{timeLine}</p>
      {event.location ? (
        <p className={cn(typo.bodyMd, "mt-xxs text-muted")}>{event.location}</p>
      ) : null}
      {event.tags.length > 0 ? (
        <div className="mt-base flex flex-wrap gap-xs">
          {event.tags.map((t) => (
            <Link key={t.id} href={`/events?tagId=${t.id}`}>
              <Badge>{t.name}</Badge>
            </Link>
          ))}
        </div>
      ) : null}
      {event.description ? (
        <>
          <div className="mt-lg border-t border-hairline" />
          {/* 교인만 일정의 무서명 /api/media/{id}는 404 — 브라우저 조회는 응답의 서명 주소 맵으로 그린다(스펙 6.2) */}
          <MarkdownContent source={event.description} mediaUrls={signed ? event.mediaUrls : undefined} className="mt-lg" />
        </>
      ) : null}
    </div>
  );
}
