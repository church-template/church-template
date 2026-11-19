import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { getEvents, EVENTS_PAGE_SIZE } from "@/lib/api/events";
import { getTags } from "@/lib/api/tags";
import { buildCalendarModel, resolveMonth, kstCivilFromDate } from "@/lib/calendar";
import { VisibilityStatusLink } from "@/components/visibility/VisibilityStatusLink";
import { getVisibility, loadPublic, resolveVisibility } from "@/lib/api/visibility";
import { TagFilter } from "@/components/common/TagFilter";
import { MemberGate } from "@/components/common/MemberGate";
import { EventCalendarClient } from "@/components/events/EventMemberViews";
import { NEWS_LIST } from "@/constants/news";
import { EventCalendar } from "@/components/events/EventCalendar";
import { EventListAction } from "@/components/events/EventAdminActions";
import { CHURCH_NAME } from "@/constants/church";

// 교인만이면 목록도 색인하지 않는다(robots.txt 차단과 이중 방어). 설정을 못 읽으면 지금처럼 색인 허용.
export async function generateMetadata(): Promise<Metadata> {
  const levels = resolveVisibility(await getVisibility());
  return {
    title: "일정",
    description: `${CHURCH_NAME} 행사와 일정을 안내합니다.`,
    alternates: { canonical: "/events" },
    ...(levels.events === "MEMBERS" ? { robots: { index: false, follow: false } } : {}),
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

function toNum(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

// 일정 캘린더. 메뉴가 누구나면 서버 렌더(ISR 태그 events), 교인만이면(또는 낡은 설정으로 서버 조회가 401/403이면)
// 서버는 일정을 읽지 않고 EVENT_VIEW 게이트 + 브라우저 조회로 같은 달을 그린다. 태그는 공개라 서버가 읽는다.
// searchParams 접근 → 동적 렌더(CI 빌드 prerender 미시도).
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const { year, month } = resolveMonth({ year: toNum(sp.year), month: toNum(sp.month) }, now);
  const tagId = toNum(sp.tagId);
  const visibility = await getVisibility();
  const levels = resolveVisibility(visibility);

  const [loaded, tags] = await Promise.all([
    loadPublic(levels.events, () => getEvents({ year, month, tagId, size: EVENTS_PAGE_SIZE })),
    getTags(),
  ]);

  return (
    <Container as="section" className="py-section">
      <div className="flex items-center justify-between gap-base">
        <div className="flex flex-wrap items-center gap-x-base">
          <h1 className={cn(typo.displayMd, "text-ink")}>{NEWS_LIST.eventTitle}</h1>
          <VisibilityStatusLink level={visibility ? visibility.events : null} />
        </div>
        <EventListAction />
      </div>
      <div className="mt-lg">
        <TagFilter tags={tags} />
      </div>
      <div className="mt-lg">
        {loaded ? (
          <EventCalendar
            model={buildCalendarModel({ year, month, today: kstCivilFromDate(now), events: loaded.data.content })}
            tagId={tagId}
          />
        ) : (
          <MemberGate permission="EVENT_VIEW" domainLabel={NEWS_LIST.eventTitle}>
            <EventCalendarClient year={year} month={month} tagId={tagId} />
          </MemberGate>
        )}
      </div>
    </Container>
  );
}
