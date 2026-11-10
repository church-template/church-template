// src/app/(site)/notices/page.tsx
import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatMonthDay, groupByMonth } from "@/lib/monthGroups";
import { getNotices, type NoticeListParams } from "@/lib/api/notices";
import { getTags } from "@/lib/api/tags";
import { MonthSection } from "@/components/common/MonthSection";
import { MonthListRow } from "@/components/common/MonthListRow";
import { TagFilter } from "@/components/common/TagFilter";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { SearchPill } from "@/components/common/SearchPill";
import { NoticeListAction } from "@/components/notices/NoticeAdminActions";
import { CHURCH_NAME } from "@/constants/church";
import { NEWS_LIST } from "@/constants/news";
import type { NoticeCardResponse } from "@/lib/api/types";

export const metadata: Metadata = {
  title: NEWS_LIST.noticeTitle,
  description: `${CHURCH_NAME} 공지사항 — 교회 소식과 안내를 확인하세요.`,
  alternates: { canonical: "/notices" },
};

type SearchParams = Record<string, string | string[] | undefined>;

// 문자열 정규화: 배열이면 첫 값, trim 후 빈 값은 undefined.
function toStr(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t ? t : undefined;
}
function toNum(v: string | string[] | undefined): number | undefined {
  const s = toStr(v);
  if (s == null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined; // NaN 방어
}

function parseParams(sp: SearchParams): NoticeListParams {
  return {
    page: toNum(sp.page),
    tagId: toNum(sp.tagId),
    q: toStr(sp.q),
  };
}

const row = (n: NoticeCardResponse) => (
  <MonthListRow
    key={n.id}
    href={`/notices/${n.id}`}
    date={formatMonthDay(n.createdAt)}
    title={n.title}
    meta={n.author}
  />
);

// 공개 공지 목록 — 고정 공지는 맨 위에 따로 모으고, 나머지는 월별 목록(month-section, 설교 목록과 같은 결).
// searchParams 접근 → 동적 렌더. 목록·태그 병렬 fetch. 서버 정렬(고정 우선·최신순)을 그대로 쓴다.
export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const params = parseParams(sp);
  const [data, tags] = await Promise.all([getNotices(params), getTags()]);
  const pinned = data.content.filter((n) => n.isPinned);
  const rest = data.content.filter((n) => !n.isPinned);

  return (
    <Container as="section" className="py-section">
      <div className="flex items-center justify-between gap-base">
        <h1 className={cn(typo.displayMd, "text-ink")}>{NEWS_LIST.noticeTitle}</h1>
        <NoticeListAction />
      </div>

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
    </Container>
  );
}
