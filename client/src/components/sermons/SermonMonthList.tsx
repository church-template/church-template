import type { ReactNode } from "react";
import Link from "next/link";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import type { SermonCardResponse } from "@/lib/api/types";
import { MembersOnlyBadge } from "@/components/visibility/MembersOnlyBadge";
import { formatMonthDay, groupByMonth } from "./sermonGroups";
import styles from "./SermonMonthList.module.css";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-sm";

// 월별 설교 목록(sermon-month-list) — 날짜로 찾는 경우가 많아 카드보다 줄 목록이 훑기 쉽다.
// 페이지 단위로 받으므로 한 달이 두 페이지에 걸치면 양쪽에 같은 달 제목이 나온다(의도된 단순화).
// renderActions: 행 링크 밖 형제(중첩 인터랙티브 금지) — MonthListRow의 actions 관례.
// showBadge: 메뉴 전체가 교인만이면 글 단위 교인만 배지를 그리지 않는다(#201).
export function SermonMonthList({
  sermons,
  renderActions,
  showBadge = true,
}: {
  sermons: SermonCardResponse[];
  renderActions?: (s: SermonCardResponse) => ReactNode;
  showBadge?: boolean;
}) {
  return (
    <div className="flex flex-col gap-xl">
      {groupByMonth(sermons).map((g) => (
        <section key={g.key} aria-labelledby={`month-${g.key}`}>
          <h2 id={`month-${g.key}`} className={cn(typo.titleMd, "border-b-2 border-ink pb-sm tabular-nums text-ink")}>
            {g.label}
          </h2>
          <ul>
            {g.items.map((s) => {
              const sub = [s.series, s.scripture].filter(Boolean).join(" · ");
              return (
                <li key={s.id} className="flex items-center gap-base border-b border-hairline">
                  <Link href={`/sermons/${s.id}`} className={cn(styles.row, "group min-w-0 flex-1 break-keep", focusRing)}>
                    <span className={cn(typo.datetime, "text-muted")}>{formatMonthDay(s.preachedAt)}</span>
                    <span>
                      <span className="flex flex-wrap items-center gap-xs">
                        <span className={cn(typo.titleMd, "text-ink transition-colors group-hover:text-primary")}>
                          {s.title}
                        </span>
                        {showBadge && s.membersOnly ? <MembersOnlyBadge /> : null}
                      </span>
                      {sub ? <span className={cn(typo.bodySm, "mt-xxs block text-body")}>{sub}</span> : null}
                    </span>
                    <span className={cn(typo.bodySm, "text-body")}>{s.preacher}</span>
                  </Link>
                  {renderActions ? renderActions(s) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
