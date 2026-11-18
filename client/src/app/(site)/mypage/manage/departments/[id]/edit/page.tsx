import { notFound } from "next/navigation";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { DepartmentEditForm } from "@/components/admin/departments/DepartmentEditForm";

// 부서 수정 전용 페이지(#33 — 모달에서 옮김). 틀(제목·컨테이너)은 DepartmentEditForm의 EditPageShell이 가진다.
export default async function DepartmentEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  // 비숫자·0·음수 id는 렌더 전에 차단 — 다른 수정 라우트와 같은 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();
  const { from } = await searchParams;

  return (
    <RequirePermission permission="DEPT_WRITE" fallback={<EditAccessDenied />}>
      <DepartmentEditForm mode="edit" editId={numId} from={typeof from === "string" ? from : null} />
    </RequirePermission>
  );
}
