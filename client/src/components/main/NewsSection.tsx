import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/shell/Container";
import { EmptyState } from "@/components/common/EmptyState";
import { MonthListRow } from "@/components/common/MonthListRow";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatMonthDay } from "@/components/sermons/sermonGroups";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatEventTime } from "@/lib/date";
import { MAIN_SECTIONS } from "@/constants/content";
import type { EventCardResponse, NoticeCardResponse } from "@/lib/api/types";

const NOTICE = "notice";
const EVENT = "event";

function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={cn(typo.button, "mt-lg inline-flex min-h-12 items-center text-primary")}>
      {children}
    </Link>
  );
}

// 13.4 ④⑤ 공지·다가오는 일정 → "교회 소식" 탭 하나(news-tabs). 두 목록 모두 month-list-row 줄로 설교 섹션과 결을 맞춘다.
// 정렬은 서버 보장(공지 고정글 우선, 일정 startAt asc) — 재정렬 금지. 날짜는 서버 문자열 앞 10자에서 읽는다.
// 메뉴가 교인만이면 그 탭을 뺀다(홈은 방문자에게 같은 화면 — 안내 문구 없이). 둘 다 빼는 경우는 홈이 섹션째 그리지 않는다.
export function NewsSection({
  notices,
  events,
  showNotices = true,
  showEvents = true,
}: {
  notices: NoticeCardResponse[];
  events: EventCardResponse[];
  showNotices?: boolean;
  showEvents?: boolean;
}) {
  return (
    <section className="py-section">
      <Container>
        <h2 className={cn(typo.displayLg, "text-ink")}>{MAIN_SECTIONS.news.title}</h2>
        <Tabs defaultValue={showNotices ? NOTICE : EVENT} className="mt-lg">
          <TabsList>
            {showNotices ? <TabsTrigger value={NOTICE}>{MAIN_SECTIONS.notices.title}</TabsTrigger> : null}
            {showEvents ? <TabsTrigger value={EVENT}>{MAIN_SECTIONS.events.title}</TabsTrigger> : null}
          </TabsList>
          {showNotices ? (
            <TabsContent value={NOTICE}>
              {notices.length === 0 ? (
                <EmptyState message={MAIN_SECTIONS.notices.empty} className="mt-base" />
              ) : (
                <ul>
                  {notices.map((n) => (
                    <MonthListRow
                      key={n.id}
                      href={`/notices/${n.id}`}
                      date={formatMonthDay(n.createdAt)}
                      title={n.title}
                      badge={n.isPinned ? "고정" : undefined}
                    />
                  ))}
                </ul>
              )}
              <MoreLink href="/notices">{MAIN_SECTIONS.notices.more}</MoreLink>
            </TabsContent>
          ) : null}
          {showEvents ? (
            <TabsContent value={EVENT}>
              {events.length === 0 ? (
                <EmptyState message={MAIN_SECTIONS.events.empty} className="mt-base" />
              ) : (
                <ul>
                  {events.map((e) => (
                    <MonthListRow
                      key={e.id}
                      href={`/events/${e.id}`}
                      date={formatMonthDay(e.startAt)}
                      title={e.title}
                      sub={[formatEventTime(e.startAt, e.endAt, e.allDay), e.location].filter(Boolean).join(" · ") || null}
                    />
                  ))}
                </ul>
              )}
              <MoreLink href="/events">{MAIN_SECTIONS.events.more}</MoreLink>
            </TabsContent>
          ) : null}
        </Tabs>
      </Container>
    </section>
  );
}
