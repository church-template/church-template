import Link from "next/link";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { buttonVariants } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";

// 주중 예배 표(worship-weekday-rows) — 주일 예배는 히어로·주일 흐름이 맡으므로 주일에 드리지 않는 예배만 정리한다.
// 주일 흐름과 같은 흰 섹션으로 이어지게 위 여백을 두지 않는다.
export function WorshipRegular() {
  const services = WORSHIP_SERVICES.filter((s) => !s.schedule.days.includes(0));
  return (
    <Container as="section" className="break-keep pb-section">
      <Reveal>
        <h2 className={cn(typo.displayMd, "text-ink")}>{WORSHIP.weekdayHeading}</h2>
      </Reveal>
      <ul className="mt-xl border-t-2 border-ink">
        {services.map((s, i) => (
          <li key={s.name} className="border-b border-hairline py-lg">
            <Reveal delay={i * 120} className="grid gap-xs md:grid-cols-4 md:items-baseline md:gap-lg">
              <h3 className={cn(typo.titleMd, "text-ink")}>{s.name}</h3>
              {/* 시간은 곧 행동 정보 — 예배명에 묻히지 않게 강조 위계 + primary(단일 액센트 예외, #109). */}
              <p className={cn(typo.datetimeLg, "text-primary")}>{s.time}</p>
              <p className={cn(typo.bodyMd, "text-body md:col-span-2")}>
                {[s.praise, s.notes[0]].filter(Boolean).join(" · ")}
              </p>
            </Reveal>
          </li>
        ))}
      </ul>
      {/* 예배를 보다가 설교로 가는 진입점 — 회원전용 안내(MemberGate)는 /sermons가 담당. */}
      <Reveal className="mt-xl">
        <Link href="/sermons" className={buttonVariants("primary")}>
          {WORSHIP.sermonCta}
        </Link>
      </Reveal>
    </Container>
  );
}
