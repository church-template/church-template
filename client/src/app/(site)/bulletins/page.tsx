// src/app/(site)/bulletins/page.tsx
import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatMonthDay, groupByMonth } from "@/lib/monthGroups";
import { apiUrl } from "@/lib/auth/apiBase";
import { getBulletins } from "@/lib/api/bulletins";
import { BulletinFeature } from "@/components/bulletins/BulletinFeature";
import { BulletinListAction, BulletinRowActions } from "@/components/bulletins/BulletinAdminActions";
import { MonthSection } from "@/components/common/MonthSection";
import { MonthListRow } from "@/components/common/MonthListRow";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { CHURCH_NAME } from "@/constants/church";
import { NEWS_LIST } from "@/constants/news";

export const metadata: Metadata = {
  title: NEWS_LIST.bulletinTitle,
  description: `${CHURCH_NAME} 주보를 확인하고 내려받을 수 있습니다.`,
  alternates: { canonical: "/bulletins" },
};

type SearchParams = Record<string, string | string[] | undefined>;

// page만 파싱(주보는 검색·태그 필터 없음 — 가이드 10장). NaN 방어는 공지와 동일.
function toNum(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

// 공개 주보 목록 — 첫 페이지의 최신 주보는 띠로 크게(bulletin-feature), 나머지는 월별 목록.
// searchParams 접근 → 동적 렌더. 서버 정렬(serviceDate,desc) 신뢰. 행 클릭 = /api/media/{mediaId} 새 탭 PDF(상세 페이지 없음).
export default async function BulletinsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = toNum(sp.page);
  const data = await getBulletins({ page });
  const featured = !page ? data.content[0] : undefined;
  const rest = featured ? data.content.slice(1) : data.content;
  const pdf = (mediaId: number) => apiUrl(`/api/media/${mediaId}`);

  return (
    <Container as="section" className="py-section">
      <div className="flex items-center justify-between gap-base">
        <h1 className={cn(typo.displayMd, "text-ink")}>{NEWS_LIST.bulletinTitle}</h1>
        <BulletinListAction />
      </div>

      {data.content.length === 0 ? (
        <EmptyState message={NEWS_LIST.bulletinEmpty} className="mt-xl" />
      ) : (
        <div className="mt-xl flex flex-col gap-xl">
          {featured ? (
            <div>
              <BulletinFeature
                title={featured.title}
                serviceDate={featured.serviceDate}
                author={featured.author}
                pdfUrl={pdf(featured.mediaId)}
                now={new Date()}
              />
              {/* 어드민 수정·삭제 — 띠 밖 형제로(중첩 인터랙티브 금지). 비어드민은 아무것도 렌더하지 않는다. */}
              <div className="mt-xs flex justify-end">
                <BulletinRowActions b={featured} />
              </div>
            </div>
          ) : null}
          {groupByMonth(rest, (b) => b.serviceDate).map((g) => (
            <MonthSection key={g.key} id={g.key} label={g.label}>
              {g.items.map((b) => (
                <MonthListRow
                  key={b.id}
                  href={pdf(b.mediaId)}
                  external
                  srHint={NEWS_LIST.pdfHint}
                  date={formatMonthDay(b.serviceDate)}
                  title={b.title}
                  meta={b.author}
                  actions={<BulletinRowActions b={b} />}
                />
              ))}
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
