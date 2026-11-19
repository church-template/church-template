import Link from "next/link";
import { ChevronRight, Globe, Lock } from "lucide-react";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { VISIBILITY_COPY, VISIBILITY_SETTINGS_PATH } from "@/constants/visibility";
import type { VisibilityLevel } from "@/lib/api/types";

// visibility-status-link(DESIGN). 목록 제목 줄에서 지금 공개 상태를 보이고 설정 화면으로 보낸다(관리자에게만).
// level null = 설정을 못 읽음 → 폴백 값을 실제 상태처럼 보이지 않게 그리지 않는다.
// 훅이 없어 서버 페이지에서 바로 쓴다(보이기 판정은 클라이언트 RequirePermission).
export function VisibilityStatusLink({ level }: { level: VisibilityLevel | null }) {
  if (!level) return null;
  const Icon = level === "MEMBERS" ? Lock : Globe;
  return (
    <RequirePermission permission="VISIBILITY_MANAGE">
      <Link
        href={VISIBILITY_SETTINGS_PATH}
        className={cn(typo.bodySm, "inline-flex min-h-12 items-center gap-xs text-body hover:text-primary")}
      >
        <Icon size={20} aria-hidden />
        {VISIBILITY_COPY.statusLink(level)}
        <ChevronRight size={20} aria-hidden />
      </Link>
    </RequirePermission>
  );
}
