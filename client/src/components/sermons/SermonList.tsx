"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { SERMON_LIST } from "@/constants/sermons";
import { Button } from "@/components/ui/Button";
import { TagFilter } from "@/components/common/TagFilter";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { CardGridSkeleton } from "@/components/common/CardGridSkeleton";
import type { SermonListParams } from "@/lib/api/sermons";
import { SermonSearch } from "./SermonSearch";
import { ActiveFilters } from "./ActiveFilters";
import { SermonFeature } from "./SermonFeature";
import { SermonMonthList } from "./SermonMonthList";
import { useSermons, useSermonTags } from "./queries";

// URL 파라미터 정규화 — RSC 시절 parseParams와 동일 검증(useSearchParams는 string|null 시그니처).
function toStr(v: string | null): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}
function toNum(v: string | null): number | undefined {
  const s = toStr(v);
  if (s == null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined; // NaN 방어
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// 날짜 필터는 yyyy-MM-dd 형식만 통과(비정상 값 백엔드 전달 차단).
function toDate(v: string | null): string | undefined {
  const s = toStr(v);
  return s && DATE_RE.test(s) ? s : undefined;
}

// 목록 클라이언트 — URL(?page·?tagId·?q·?preacher·?series·?from·?to)을 쿼리로,
// 검색/필터/페이지네이션은 URL 갱신 → useSearchParams 재파싱으로 동작(AlbumList 패턴).
// 화면: 필터 없는 첫 페이지면 최신 설교를 띠로 크게(SermonFeature), 나머지는 월별 줄 목록(SermonMonthList).
export function SermonList() {
  const searchParams = useSearchParams();
  const params: SermonListParams = {
    page: toNum(searchParams.get("page")),
    tagId: toNum(searchParams.get("tagId")),
    q: toStr(searchParams.get("q")),
    preacher: toStr(searchParams.get("preacher")),
    series: toStr(searchParams.get("series")),
    from: toDate(searchParams.get("from")),
    to: toDate(searchParams.get("to")),
  };
  // 검색·필터 결과에서 첫 항목을 "이번 주 말씀"으로 띄우면 의미가 틀어진다 — 아무 조건 없는 첫 페이지에서만.
  const { page, ...filters } = params;
  const showFeature = !page && Object.values(filters).every((v) => v === undefined);
  const [now] = useState(() => new Date()); // "이번 주" 판정 기준 — 렌더마다 바뀌지 않게 마운트 시 고정

  const sermons = useSermons(params);
  const tags = useSermonTags();
  const content = sermons.data?.content ?? [];
  const featured = showFeature ? content[0] : undefined;
  const rest = featured ? content.slice(1) : content;

  return (
    <div className="mt-lg flex flex-col gap-base">
      {featured ? (
        <div className="mb-lg">
          <SermonFeature sermon={featured} now={now} />
        </div>
      ) : null}
      <SermonSearch />
      <TagFilter tags={tags.data ?? []} />
      <ActiveFilters />

      {sermons.isPending ? (
        <div className="mt-xl">
          <CardGridSkeleton />
        </div>
      ) : sermons.isError || !sermons.data ? (
        <div className="flex flex-col items-start gap-sm py-xl">
          <p className={cn(typo.bodyMd, "text-muted")}>{SERMON_LIST.loadError}</p>
          <Button variant="secondary" onClick={() => sermons.refetch()}>
            {SERMON_LIST.retry}
          </Button>
        </div>
      ) : content.length === 0 ? (
        <EmptyState message={SERMON_LIST.empty} className="mt-xl" />
      ) : (
        <>
          {rest.length > 0 ? (
            <div
              aria-busy={sermons.isPlaceholderData}
              className={cn("mt-xl", sermons.isPlaceholderData && "opacity-60 transition-opacity")}
            >
              <SermonMonthList sermons={rest} />
            </div>
          ) : null}
          {sermons.data.page.totalPages > 1 ? (
            <div className="mt-xl">
              <Pagination page={sermons.data.page} scroll={false} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
