import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { BulletinEditLoader } from "@/components/bulletins/BulletinMemberViews";

// 주보 수정. 설정과 무관하게 항상 브라우저에서 읽는다 — 교인만이면 서버가 읽을 수 없다(스펙 6.3).
// 최신 version 시드·409 재시드는 BulletinEditLoader가 맡는다.
export default async function BulletinEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 조회 전에 차단 — 공지 edit 라우트와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">주보 수정</h1>
      <RequirePermission permission="BULLETIN_WRITE" fallback={<EditAccessDenied />}>
        <BulletinEditLoader id={numId} />
      </RequirePermission>
    </Container>
  );
}
