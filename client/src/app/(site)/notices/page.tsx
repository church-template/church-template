// src/app/(site)/notices/page.tsx
import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { getNotices, type NoticeListParams } from "@/lib/api/notices";
import { getTags } from "@/lib/api/tags";
import { VisibilityStatusLink } from "@/components/visibility/VisibilityStatusLink";
import { getVisibility, loadPublic, resolveVisibility } from "@/lib/api/visibility";
import { MemberGate } from "@/components/common/MemberGate";
import { NoticeListAction } from "@/components/notices/NoticeAdminActions";
import { NoticeListView } from "@/components/notices/NoticeListView";
import { NoticeListClient } from "@/components/notices/NoticeMemberViews";
import { CHURCH_NAME } from "@/constants/church";
import { NEWS_LIST } from "@/constants/news";

// 교인만이면 목록도 색인하지 않는다(robots.txt 차단과 이중 방어). 설정을 못 읽으면 지금처럼 색인 허용.
export async function generateMetadata(): Promise<Metadata> {
  const levels = resolveVisibility(await getVisibility());
  return {
    title: NEWS_LIST.noticeTitle,
    description: `${CHURCH_NAME} 공지사항 — 교회 소식과 안내를 확인하세요.`,
    alternates: { canonical: "/notices" },
    ...(levels.notices === "MEMBERS" ? { robots: { index: false, follow: false } } : {}),
  };
}

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

// 공지 목록. 메뉴가 누구나면 서버 렌더(ISR 태그 notices), 교인만이면(또는 낡은 설정으로 서버 조회가 401/403이면)
// 서버는 공지를 읽지 않고 NOTICE_VIEW 게이트 + 브라우저 조회로 그린다. 태그는 공개라 두 경로 모두 서버가 읽는다.
// searchParams 접근 → 동적 렌더.
export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const params = parseParams(sp);
  const visibility = await getVisibility();
  const levels = resolveVisibility(visibility);
  const [loaded, tags] = await Promise.all([loadPublic(levels.notices, () => getNotices(params)), getTags()]);

  return (
    <Container as="section" className="py-section">
      <div className="flex items-center justify-between gap-base">
        <div className="flex flex-wrap items-center gap-x-base">
          <h1 className={cn(typo.displayMd, "text-ink")}>{NEWS_LIST.noticeTitle}</h1>
          <VisibilityStatusLink level={visibility ? visibility.notices : null} />
        </div>
        <NoticeListAction />
      </div>
      {loaded ? (
        <NoticeListView data={loaded.data} tags={tags} />
      ) : (
        <MemberGate permission="NOTICE_VIEW" domainLabel={NEWS_LIST.noticeTitle}>
          <NoticeListClient params={params} tags={tags} />
        </MemberGate>
      )}
    </Container>
  );
}
