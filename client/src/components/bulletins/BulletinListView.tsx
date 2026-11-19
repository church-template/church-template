import { formatMonthDay, groupByMonth } from "@/lib/monthGroups";
import { mediaSrc } from "@/lib/mediaUrl";
import { MonthSection } from "@/components/common/MonthSection";
import { MonthListRow } from "@/components/common/MonthListRow";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { NEWS_LIST } from "@/constants/news";
import { BulletinFeature } from "./BulletinFeature";
import { BulletinRowActions } from "./BulletinAdminActions";
import type { Page } from "@/lib/page";
import type { BulletinCardResponse } from "@/lib/api/types";

// PDF 주소. signed(브라우저 조회 = 교인만)면 응답의 서명 주소(url) — 교인만 주보의 무서명 주소는 404.
// 서버 렌더(누구나)는 늘 무서명: 페이지가 60초 캐시라 1시간짜리 서명이 만료된 채 나가면 404가 된다.
// url이 null(PDF 없음)·없음(구 백엔드)이면 mediaId로 조립.
const pdf = (b: BulletinCardResponse, signed: boolean) => mediaSrc(b.mediaId, signed ? (b.url ?? undefined) : undefined);

// 주보 목록 본문 — 서버 렌더(누구나)와 브라우저 조회(교인만)가 같이 쓴다(훅 없음).
// 첫 페이지의 최신 주보는 띠로 크게(bulletin-feature), 나머지는 월별 목록. 서버 정렬(serviceDate,desc) 신뢰.
export function BulletinListView({
  data,
  page,
  now,
  signed = false,
}: {
  data: Page<BulletinCardResponse>;
  page?: number;
  now: Date;
  /** 브라우저 조회 결과일 때만 true — 서버 렌더는 넘기지 않는다(위 pdf 주석). */
  signed?: boolean;
}) {
  const featured = !page ? data.content[0] : undefined;
  const rest = featured ? data.content.slice(1) : data.content;
  return (
    <>
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
                pdfUrl={pdf(featured, signed)}
                now={now}
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
                  href={pdf(b, signed)}
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
    </>
  );
}
