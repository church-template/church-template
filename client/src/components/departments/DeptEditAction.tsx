"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DepartmentFormDialog } from "@/components/admin/departments/DepartmentFormDialog";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { adminKeys } from "@/lib/admin/queryKeys";
import { listDepartmentsAdmin } from "@/lib/api/departments.admin";

// 부서 상세 "수정" — DEPT_WRITE 보유자에게만 노출(공지·설교 상세 인라인 액션 패턴).
// 관리 화면과 같은 수정 창을 그대로 띄운다. 저장 시 창이 departments 태그를 무효화하므로 여기선 새로고침만 한다.
export function DeptEditAction({ backendId }: { backendId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // 상위 부서 select 옵션 소스 — 창을 열 때만 조회.
  const { data: departments = [] } = useQuery({
    queryKey: adminKeys.list("departments"),
    queryFn: listDepartmentsAdmin,
    enabled: open,
    retry: false,
  });

  return (
    <RequirePermission permission="DEPT_WRITE">
      <Button type="button" variant="tertiary" aria-label="부서 수정" onClick={() => setOpen(true)}>
        <ACTION.edit.Icon size={18} aria-hidden />
        <span className="hidden lg:inline">{ACTION.edit.label}</span>
      </Button>
      <DepartmentFormDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        editId={backendId}
        departments={departments}
        onSaved={() => router.refresh()}
      />
    </RequirePermission>
  );
}
