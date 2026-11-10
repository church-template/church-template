import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import styles from "./MonthListRow.module.css";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-sm";

export interface MonthListRowProps {
  href: string;
  /** 새 탭으로 여는 외부 자원(주보 PDF) — <a target=_blank>, 아니면 next/link */
  external?: boolean;
  /** 화면 낭독기용 보충(예: "(새 탭에서 PDF 열림)") */
  srHint?: string;
  date: string; // "11월 1일"
  title: string;
  sub?: string | null;
  meta?: string | null; // 오른쪽(설교자·작성자)
  badge?: string; // 제목 앞 배지(예: 고정)
  /** 어드민 인라인 액션 — 링크 밖 형제로 렌더(중첩 인터랙티브 금지) */
  actions?: ReactNode;
}

// 월별 목록 한 줄(month-list-row) — 행 전체가 링크, hover 시 제목만 primary.
export function MonthListRow({ href, external, srHint, date, title, sub, meta, badge, actions }: MonthListRowProps) {
  const inner = (
    <>
      <span className={cn(typo.datetime, "text-muted")}>{date}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-xs">
          {badge ? <Badge variant="primary">{badge}</Badge> : null}
          <span className={cn(typo.titleMd, "text-ink transition-colors group-hover:text-primary")}>
            {title}
            {srHint ? <span className="sr-only">{srHint}</span> : null}
          </span>
        </span>
        {sub ? <span className={cn(typo.bodySm, "mt-xxs block text-body")}>{sub}</span> : null}
      </span>
      <span className={cn(typo.bodySm, "text-body")}>{meta ?? ""}</span>
    </>
  );
  const cls = cn(styles.row, "group min-w-0 flex-1 break-keep", focusRing);
  const link = external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
  return (
    <li className="flex items-center gap-base border-b border-hairline">
      {link}
      {actions ?? null}
    </li>
  );
}
