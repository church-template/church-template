"use client";

import Link from "next/link";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { buttonVariants } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";

// 부서 상세 "수정" — DEPT_WRITE 보유자에게만 노출(공지·설교 상세 인라인 액션 패턴).
// 수정은 전용 페이지에서 한다(#33). 저장하면 이 부서 화면으로 돌아오도록 from을 넘긴다.
export function DeptEditAction({ backendId, slug }: { backendId: number; slug: string }) {
  const href = `/mypage/manage/departments/${backendId}/edit?from=${encodeURIComponent(`/departments/${slug}`)}`;
  return (
    <RequirePermission permission="DEPT_WRITE">
      <Link href={href} aria-label="부서 수정" className={buttonVariants("tertiary")}>
        <ACTION.edit.Icon size={18} aria-hidden />
        <span className="hidden lg:inline">{ACTION.edit.label}</span>
      </Link>
    </RequirePermission>
  );
}
