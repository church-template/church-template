import type { ReactNode } from "react";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 월 묶음(month-section) — 굵은 월 제목 + 2px ink 하단 룰 + 행 목록. 설교·공지·주보 목록이 같은 결을 쓴다.
export function MonthSection({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const headingId = `month-${id}`;
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className={cn(typo.titleMd, "border-b-2 border-ink pb-sm tabular-nums text-ink")}>
        {label}
      </h2>
      <ul>{children}</ul>
    </section>
  );
}
