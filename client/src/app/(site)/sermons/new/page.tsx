import { connection } from "next/server";
import { getVisibility } from "@/lib/api/visibility";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { SermonForm } from "@/components/sermons/SermonForm";

export default async function SermonNewPage() {
  // 체크박스 아래 교인만 메뉴 안내용(#201). 빌드 시 폴백이 굳지 않게 요청 시점에 읽고, 못 읽으면 안내 없이(지금 동작).
  await connection();
  const visibility = await getVisibility();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">설교 등록</h1>
      <RequirePermission permission="SERMON_WRITE" fallback={<EditAccessDenied />}>
        <SermonForm mode="create" menuLevel={visibility ? visibility.sermons : undefined} />
      </RequirePermission>
    </Container>
  );
}
