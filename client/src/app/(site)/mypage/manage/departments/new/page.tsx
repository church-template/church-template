import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { DepartmentEditForm } from "@/components/admin/departments/DepartmentEditForm";

// 새 부서 전용 페이지(#33). ?parentId= 가 양의 정수면 그 부서의 하위로 시작한다(부서 관리의 "＋하위").
export default async function DepartmentNewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { parentId } = await searchParams;
  const n = Number(parentId);
  const defaultParentId = typeof parentId === "string" && Number.isInteger(n) && n > 0 ? n : null;

  return (
    <RequirePermission permission="DEPT_WRITE" fallback={<EditAccessDenied />}>
      <DepartmentEditForm mode="create" defaultParentId={defaultParentId} />
    </RequirePermission>
  );
}
