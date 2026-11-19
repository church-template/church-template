import { formatMonthDay, groupByMonth } from "@/lib/monthGroups";
import { MonthSection } from "@/components/common/MonthSection";
import { MonthListRow } from "@/components/common/MonthListRow";
import { TagFilter } from "@/components/common/TagFilter";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { SearchPill } from "@/components/common/SearchPill";
import { NEWS_LIST } from "@/constants/news";
import type { Page } from "@/lib/page";
import type { NoticeCardResponse, TagResponse } from "@/lib/api/types";

const row = (n: NoticeCardResponse) => (
  <MonthListRow
    key={n.id}
    href={`/notices/${n.id}`}
    date={formatMonthDay(n.createdAt)}
    title={n.title}
    meta={n.author}
  />
);

// 공지 목록 본문(검색·태그·목록·페이지) — 서버 렌더(누구나)와 브라우저 조회(교인만)가 같이 쓴다(훅 없음).
// 고정 공지는 맨 위에 따로 모으고, 나머지는 월별 목록(month-section). 서버 정렬(고정 우선·최신순)을 그대로 쓴다.
export function NoticeListView({ data, tags }: { data: Page<NoticeCardResponse>; tags: TagResponse[] }) {
  const pinned = data.content.filter((n) => n.isPinned);
  const rest = data.content.filter((n) => !n.isPinned);
  return (
    <>
      <div className="mt-lg flex flex-col gap-base">
        <SearchPill placeholder="제목" ariaLabel="공지 검색" />
        <TagFilter tags={tags} />
      </div>

      {data.content.length === 0 ? (
        <EmptyState message={NEWS_LIST.noticeEmpty} className="mt-xl" />
      ) : (
        <div className="mt-xl flex flex-col gap-xl">
          {pinned.length > 0 ? (
            <MonthSection id="pinned" label={NEWS_LIST.pinnedHeading}>
              {pinned.map(row)}
            </MonthSection>
          ) : null}
          {groupByMonth(rest, (n) => n.createdAt).map((g) => (
            <MonthSection key={g.key} id={g.key} label={g.label}>
              {g.items.map(row)}
            </MonthSection>
          ))}
        </div>
      )}

      {data.page.totalPages > 1 ? (
        <div className="mt-xl">
          <Pagination page={data.page} />
        </div>
      ) : null}
    </>
  );
}
