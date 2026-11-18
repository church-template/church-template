import { Badge } from "@/components/ui/Badge";

// changed-badge(DESIGN) — 미리보기에서 이번 수정으로 바뀐 구역을 표시한다.
export function ChangedBadge() {
  return (
    <Badge variant="primary" className="ml-xs align-middle">
      바뀜
    </Badge>
  );
}
