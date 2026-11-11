import Link from "next/link";
import { Container } from "@/components/shell/Container";
import { EmptyState } from "@/components/common/EmptyState";
import { MonthListRow } from "@/components/common/MonthListRow";
import { SermonFeature } from "@/components/sermons/SermonFeature";
import { formatMonthDay } from "@/components/sermons/sermonGroups";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { MAIN_SECTIONS } from "@/constants/content";
import type { SermonCardResponse } from "@/lib/api/types";

// 13.4 ③ 최신 설교 — 가장 최근 말씀을 띠로 크게(sermon-feature), 나머지는 날짜 줄 목록(month-list-row).
// 설교 목록(/sermons)과 같은 결이라 홈 → 목록이 끊기지 않는다. 정렬은 서버 보장(preachedAt desc) — 재정렬 금지.
export function SermonSection({ sermons, now }: { sermons: SermonCardResponse[]; now: Date }) {
  const [latest, ...past] = sermons;
  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <h2 className={cn(typo.displayLg, "text-ink")}>{MAIN_SECTIONS.sermons.title}</h2>
        {latest ? (
          <div className="mt-lg">
            <SermonFeature sermon={latest} now={now} headingAs="h3" />
            {past.length > 0 ? (
              <div className="mt-xxl">
                <p className={cn(typo.titleMd, "border-b-2 border-ink pb-sm text-ink")}>
                  {MAIN_SECTIONS.sermons.pastTitle}
                </p>
                <ul>
                  {past.map((s) => (
                    <MonthListRow
                      key={s.id}
                      href={`/sermons/${s.id}`}
                      date={formatMonthDay(s.preachedAt)}
                      title={s.title}
                      sub={[s.series, s.scripture].filter(Boolean).join(" · ") || null}
                      meta={s.preacher}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState message={MAIN_SECTIONS.sermons.empty} className="mt-lg" />
        )}
        <Link href="/sermons" className={cn(typo.button, "mt-lg inline-flex min-h-12 items-center text-primary")}>
          {MAIN_SECTIONS.sermons.more}
        </Link>
      </Container>
    </section>
  );
}
