import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { VISIBILITY_COPY } from "@/constants/visibility";

// members-only-badge(DESIGN) — 교인만 글 표시. 글을 쓰지 않는 교인에게는 이것만 보인다.
// 훅이 없어 서버·클라이언트 양쪽 카드에서 쓴다(버튼 모듈과 따로 둔 이유).
export function MembersOnlyBadge() {
  return (
    <Badge className="gap-xxs">
      <Lock size={16} aria-hidden />
      {VISIBILITY_COPY.badge}
    </Badge>
  );
}
