import type { Metadata } from "next";
import { connection } from "next/server";
import { getVisibility } from "@/lib/api/visibility";
import { Container } from "@/components/shell/Container";
import { MemberGate } from "@/components/common/MemberGate";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { AlbumForm } from "@/components/gallery/AlbumForm";

export const metadata: Metadata = { title: "갤러리" };

export default async function AlbumNewPage() {
  // 체크박스 아래 교인만 메뉴 안내용(#201). 빌드 시 폴백이 굳지 않게 요청 시점에 읽고, 못 읽으면 안내 없이(지금 동작).
  await connection();
  const visibility = await getVisibility();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">앨범 등록</h1>
      <MemberGate permission="GALLERY_VIEW" domainLabel="갤러리">
        <RequirePermission permission="GALLERY_WRITE" fallback={<EditAccessDenied />}>
          <AlbumForm mode="create" menuLevel={visibility ? visibility.gallery : undefined} />
        </RequirePermission>
      </MemberGate>
    </Container>
  );
}
