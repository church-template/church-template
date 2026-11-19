import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Container } from "@/components/shell/Container";
import { getEvent } from "@/lib/api/events";
import { getVisibility, loadPublic, resolveVisibility } from "@/lib/api/visibility";
import { CHURCH_DESCRIPTION } from "@/constants/church";
import { NEWS_LIST } from "@/constants/news";
import { excerpt } from "@/lib/seo";
import { MemberGate } from "@/components/common/MemberGate";
import { EventJsonLd } from "@/components/seo/EventJsonLd";
import { EventDetailBody } from "@/components/events/EventDetailBody";
import { EventDetailClient } from "@/components/events/EventMemberViews";

// getEvent는 revalidate 60 캐시라 부수효과는 없지만, 같은 요청 내 generateMetadata·페이지의
// 중복 호출을 없애기 위해 공지 상세와 동일하게 요청 단위로 캐시한다.
const getEventCached = cache(getEvent);

// 메뉴가 교인만이면 서버는 읽지 않는다(null). 누구나인데 401/403이면 설정이 낡은 것 → 같은 게이트 경로.
async function loadEvent(id: number) {
  const levels = resolveVisibility(await getVisibility());
  return loadPublic(levels.events, () => getEventCached(id));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) return {};
  const loaded = await loadEvent(numId);
  // 교인 전용 — 제목·본문을 메타에 싣지 않고 색인도 막는다(오류 화면 대신, 6.6-12).
  if (!loaded) return { title: NEWS_LIST.eventTitle, robots: { index: false, follow: false } };
  const event = loaded.data;
  if (!event) return {};
  const description = excerpt(event.description) || CHURCH_DESCRIPTION;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.id}` },
    openGraph: {
      title: event.title,
      description,
      url: `/events/${event.id}`,
    },
  };
}

// 일정 상세(딥링크). 누구나면 서버 렌더(revalidate 60), 교인만이면 EVENT_VIEW 게이트 + 브라우저 조회.
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 교인만 분기엔 서버 조회가 없어 정적으로 굳을 수 있다 → 요청 시점에 설정을 읽는다.
  await connection();
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const loaded = await loadEvent(numId);
  if (!loaded) {
    return (
      <Container as="section" className="py-section">
        <MemberGate permission="EVENT_VIEW" domainLabel={NEWS_LIST.eventTitle}>
          <EventDetailClient id={numId} />
        </MemberGate>
      </Container>
    );
  }
  const event = loaded.data;
  if (!event) notFound();

  return (
    <Container as="section" className="py-section">
      <EventJsonLd event={event} />
      <EventDetailBody event={event} />
    </Container>
  );
}
