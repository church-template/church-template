import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { VisibilitySettings } from "@/components/admin/visibility/VisibilitySettings";
import { typo } from "@/constants/typography";
import { VISIBILITY_COPY } from "@/constants/visibility";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 VISIBILITY_MANAGE 게이트.
// 단일 좁은 칸(visibility-settings) — 행 5개라 미리보기·저장 막대를 둘 만큼 길지 않다.
export default function ManageVisibilityPage() {
  return (
    <Container as="section" className="py-section">
      <div className="max-w-[var(--container-narrow)]">
        <h1 className={cn(typo.displayMd, "text-ink")}>{VISIBILITY_COPY.settingsTitle}</h1>
        <p className={cn(typo.bodyMd, "mt-sm text-body")}>{VISIBILITY_COPY.settingsLead}</p>
        <div className="mt-xl">
          <RequirePermission permission="VISIBILITY_MANAGE" fallback={<EditAccessDenied />}>
            <VisibilitySettings />
          </RequirePermission>
        </div>
      </div>
    </Container>
  );
}
