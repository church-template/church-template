// src/app/(site)/bulletins/page.tsx
import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { getBulletins } from "@/lib/api/bulletins";
import { VisibilityStatusLink } from "@/components/visibility/VisibilityStatusLink";
import { getVisibility, loadPublic, resolveVisibility } from "@/lib/api/visibility";
import { BulletinListAction } from "@/components/bulletins/BulletinAdminActions";
import { BulletinListView } from "@/components/bulletins/BulletinListView";
import { BulletinListClient } from "@/components/bulletins/BulletinMemberViews";
import { MemberGate } from "@/components/common/MemberGate";
import { CHURCH_NAME } from "@/constants/church";
import { NEWS_LIST } from "@/constants/news";

// 교인만이면 목록도 색인하지 않는다(robots.txt 차단과 이중 방어). 설정을 못 읽으면 지금처럼 색인 허용.
export async function generateMetadata(): Promise<Metadata> {
  const levels = resolveVisibility(await getVisibility());
  return {
    title: NEWS_LIST.bulletinTitle,
    description: `${CHURCH_NAME} 주보를 확인하고 내려받을 수 있습니다.`,
    alternates: { canonical: "/bulletins" },
    ...(levels.bulletins === "MEMBERS" ? { robots: { index: false, follow: false } } : {}),
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

// page만 파싱(주보는 검색·태그 필터 없음 — 가이드 10장). NaN 방어는 공지와 동일.
function toNum(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

// 주보 목록. 메뉴가 누구나면 서버 렌더(ISR 태그 bulletins), 교인만이면(또는 낡은 설정으로 서버 조회가 401/403이면)
// 서버는 주보를 읽지 않고 BULLETIN_VIEW 게이트 + 브라우저 조회로 그린다. 행 클릭 = PDF 새 탭(상세 페이지 없음).
// searchParams 접근 → 동적 렌더.
export default async function BulletinsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = toNum(sp.page);
  const visibility = await getVisibility();
  const levels = resolveVisibility(visibility);
  const loaded = await loadPublic(levels.bulletins, () => getBulletins({ page }));

  return (
    <Container as="section" className="py-section">
      <div className="flex items-center justify-between gap-base">
        <div className="flex flex-wrap items-center gap-x-base">
          <h1 className={cn(typo.displayMd, "text-ink")}>{NEWS_LIST.bulletinTitle}</h1>
          <VisibilityStatusLink level={visibility ? visibility.bulletins : null} />
        </div>
        <BulletinListAction />
      </div>
      {loaded ? (
        <BulletinListView data={loaded.data} page={page} now={new Date()} />
      ) : (
        <MemberGate permission="BULLETIN_VIEW" domainLabel={NEWS_LIST.bulletinTitle}>
          <BulletinListClient page={page} />
        </MemberGate>
      )}
    </Container>
  );
}
