// src/app/(site)/sermons/[id]/page.tsx
import type { Metadata } from "next";
import { connection } from "next/server";
import { getVisibility, resolveVisibility } from "@/lib/api/visibility";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { MemberGate } from "@/components/common/MemberGate";
import { DetailSkeleton } from "@/components/common/DetailSkeleton";
import { SermonDetail } from "@/components/sermons/SermonDetail";

export const metadata: Metadata = {
  title: "설교",
  // 설정과 무관하게 색인 차단(스펙 6.3 — 설교·갤러리는 검색 노출 불필요). robots.txt 차단과 이중 방어.
  robots: { index: false, follow: false },
};

// 설교 상세. RSC는 id 검증·공개 범위 분기만 — 데이터는 SermonDetail이 클라 조회(조회수 부수효과 포함).
// 누구나 메뉴의 교인 전용 글은 조회가 401/403을 받아 SermonDetail이 로그인·승인 안내를 그린다.
export default async function SermonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();
  await connection();
  const levels = resolveVisibility(await getVisibility());
  const detail = <SermonDetail id={numId} />;

  return (
    <Container as="section" className="py-section">
      <Link
        href="/sermons"
        className={cn(typo.bodySm, "inline-flex items-center gap-xxs text-primary")}
      >
        <ChevronLeft size={16} aria-hidden />
        설교 목록
      </Link>
      {levels.sermons === "MEMBERS" ? (
        <MemberGate
          permission="SERMON_VIEW"
          domainLabel="설교"
          skeleton={
            <div className="mt-base">
              <DetailSkeleton />
            </div>
          }
        >
          {detail}
        </MemberGate>
      ) : (
        detail
      )}
    </Container>
  );
}
