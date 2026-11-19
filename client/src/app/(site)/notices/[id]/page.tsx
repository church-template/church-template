// src/app/(site)/notices/[id]/page.tsx
import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Container } from "@/components/shell/Container";
import { getNotice } from "@/lib/api/notices";
import { getVisibility, loadPublic, resolveVisibility } from "@/lib/api/visibility";
import { CHURCH_DESCRIPTION } from "@/constants/church";
import { NEWS_LIST } from "@/constants/news";
import { excerpt } from "@/lib/seo";
import { MemberGate } from "@/components/common/MemberGate";
import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd";
import { NoticeDetailView } from "@/components/notices/NoticeDetailView";
import { NoticeDetailClient } from "@/components/notices/NoticeMemberViews";

// getNotice는 no-store(조회수 +1 부수효과) — generateMetadata와 페이지가 같은 요청에서
// 두 번 부르지 않도록 요청 단위로 캐시한다(조회수 이중 증가 방지).
const getNoticeCached = cache(getNotice);

// 메뉴가 교인만이면 서버는 읽지 않는다(null). 누구나인데 401/403이면 설정이 낡은 것 → 같은 게이트 경로.
async function loadNotice(id: number) {
  const levels = resolveVisibility(await getVisibility());
  return loadPublic(levels.notices, () => getNoticeCached(id));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) return {};
  const loaded = await loadNotice(numId);
  // 교인 전용 — 제목·본문을 메타에 싣지 않고 색인도 막는다(오류 화면 대신, 6.6-12).
  if (!loaded) return { title: NEWS_LIST.noticeTitle, robots: { index: false, follow: false } };
  const notice = loaded.data;
  if (!notice) return {};
  const description = excerpt(notice.content) || CHURCH_DESCRIPTION;
  return {
    title: notice.title,
    description,
    alternates: { canonical: `/notices/${notice.id}` },
    openGraph: {
      type: "article",
      title: notice.title,
      description,
      url: `/notices/${notice.id}`,
    },
  };
}

// 공지 상세. 누구나면 서버 렌더(no-store, 조회수 +1), 교인만이면 NOTICE_VIEW 게이트 + 브라우저 조회.
export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 교인만 분기엔 no-store 조회가 없어 정적으로 굳을 수 있다 → 요청 시점에 설정을 읽는다.
  await connection();
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const loaded = await loadNotice(numId);
  if (!loaded) {
    return (
      <Container as="section" className="py-section">
        <MemberGate permission="NOTICE_VIEW" domainLabel={NEWS_LIST.noticeTitle}>
          <NoticeDetailClient id={numId} />
        </MemberGate>
      </Container>
    );
  }
  const notice = loaded.data;
  if (!notice) notFound();

  return (
    <Container as="section" className="py-section">
      <ArticleJsonLd notice={notice} />
      <NoticeDetailView notice={notice} />
    </Container>
  );
}
