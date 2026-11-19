import type { Metadata } from "next";
import { connection } from "next/server";
import { getVisibility, resolveVisibility } from "@/lib/api/visibility";
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { MemberGate } from "@/components/common/MemberGate";
import { AlbumDetail } from "@/components/gallery/AlbumDetail";

export const metadata: Metadata = {
  title: "갤러리",
  // 설정과 무관하게 색인 차단(스펙 6.3 — 설교·갤러리는 검색 노출 불필요). robots.txt 차단과 이중 방어.
  robots: { index: false, follow: false },
};

export default async function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();
  // 누구나 메뉴의 교인만 앨범은 조회가 401/403을 받아 AlbumDetail이 로그인·승인 안내를 그린다.
  await connection();
  const levels = resolveVisibility(await getVisibility());
  const detail = <AlbumDetail id={numId} />;

  return (
    <Container as="section" className="py-section">
      {levels.gallery === "MEMBERS" ? (
        <MemberGate permission="GALLERY_VIEW" domainLabel="갤러리">
          {detail}
        </MemberGate>
      ) : (
        detail
      )}
    </Container>
  );
}
