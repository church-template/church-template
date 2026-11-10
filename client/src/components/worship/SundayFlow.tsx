import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP } from "@/constants/content";
import { NextServiceBand } from "./NextServiceBand";
import styles from "./Worship.module.css";

// 다음 예배 띠 + 주일 아침 흐름(sunday-flow) — 처음 오는 분이 "몇 시에 가서 어떻게 진행되나"를 한눈에.
export function SundayFlow() {
  return (
    <Container as="section" className="break-keep py-section">
      <NextServiceBand />
      <Reveal className="mt-xxl">
        <p className={cn(typo.caption, "text-primary")}>{WORSHIP.flowEyebrow}</p>
        <h2 className={cn(typo.displayMd, "mt-xs text-ink")}>{WORSHIP.flowHeading}</h2>
      </Reveal>
      <ol className="mt-xxl grid gap-xl md:grid-cols-3 md:gap-0">
        {WORSHIP.flow.map((step, i) => (
          <li key={step.title} className={cn(styles.step, "md:pr-lg")}>
            <Reveal delay={i * 120}>
              <p className={cn(typo.titleLg, "tabular-nums text-ink")}>{step.time}</p>
              <h3 className={cn(typo.titleMd, "mt-xxs text-ink")}>{step.title}</h3>
              <p className={cn(typo.bodyMd, "mt-xs text-body")}>{step.desc}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </Container>
  );
}
