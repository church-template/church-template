import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, SPECIAL_SERVICES } from "@/constants/content";
import { SpecialNextBand } from "./SpecialNextBand";

// 회색 밴드 — 다음 특별 예배 띠 + 연간 줄 목록(위 주중 예배 표와 같은 결). 카드 박스를 쓰지 않는다(#178).
export function WorshipSpecial() {
  return (
    <section className="break-keep bg-surface-soft py-section">
      <Container>
        <Reveal>
          <h2 className={cn(typo.titleLg, "text-ink")}>{WORSHIP.specialHeading}</h2>
          <p className={cn(typo.bodyLg, "mt-base text-body")}>{WORSHIP.specialLead}</p>
        </Reveal>
        <SpecialNextBand />
        <ul className="mt-xxl border-t-2 border-ink">
          {SPECIAL_SERVICES.map((s, i) => (
            <li key={s.name} className="border-b border-hairline py-lg">
              <Reveal delay={i * 120} className="grid gap-xs md:grid-cols-4 md:items-baseline md:gap-lg">
                <p className={cn(typo.datetime, "text-muted")}>{s.date}</p>
                <div className="md:col-span-2">
                  <h3 className={cn(typo.titleMd, "text-ink")}>{s.name}</h3>
                  <p className={cn(typo.bodyMd, "mt-xxs text-body")}>{s.desc}</p>
                </div>
                <p className={cn(typo.datetimeLg, "text-ink md:text-right")}>{s.time}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
