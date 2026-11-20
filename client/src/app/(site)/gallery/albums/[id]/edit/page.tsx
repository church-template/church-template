import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getVisibility } from "@/lib/api/visibility";
import { Container } from "@/components/shell/Container";
import { MemberGate } from "@/components/common/MemberGate";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { AlbumEditLoader } from "@/components/gallery/AlbumEditLoader";

export const metadata: Metadata = { title: "갤러리" };

export default async function AlbumEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 렌더 전에 차단 — 앨범 상세 라우트와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();
  // 체크박스 아래 교인만 메뉴 안내용(#201). 못 읽으면 안내 없이(지금 동작).
  await connection();
  const visibility = await getVisibility();

  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">앨범 수정</h1>
      <MemberGate permission="GALLERY_VIEW" domainLabel="갤러리">
        <RequirePermission permission="GALLERY_WRITE" fallback={<EditAccessDenied />}>
          <AlbumEditLoader id={numId} menuLevel={visibility ? visibility.gallery : undefined} />
        </RequirePermission>
      </MemberGate>
    </Container>
  );
}
