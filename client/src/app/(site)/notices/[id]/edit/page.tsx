import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { NoticeEditLoader } from "@/components/notices/NoticeMemberViews";

// 공지 수정. 설정과 무관하게 항상 브라우저에서 읽는다 — 교인만이면 서버가 읽을 수 없고(스펙 6.3),
// 한 경로가 단순하다. 최신 version 시드·409 재시드는 NoticeEditLoader가 맡는다.
export default async function NoticeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 조회 전에 차단 — 형제 라우트([id]/page.tsx)와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">공지 수정</h1>
      <RequirePermission permission="NOTICE_WRITE" fallback={<EditAccessDenied />}>
        <NoticeEditLoader id={numId} />
      </RequirePermission>
    </Container>
  );
}
