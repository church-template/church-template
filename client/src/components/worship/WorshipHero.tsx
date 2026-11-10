import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";
import styles from "./Worship.module.css";

// 예배 안내 히어로(worship-hero) — 처음 오는 분이 가장 먼저 찾는 주일예배 시간을 가장 크게 세운다.
// 페이지 h1은 제목(예배 시간 안내)이 맡고, 시간은 그 아래 대표 문구로 둔다(문서 구조·검색용 제목 유지).
export function WorshipHero() {
  const main = WORSHIP_SERVICES.find((s) => s.primary) ?? WORSHIP_SERVICES[0];
  return (
    <section className={cn(styles.hero, "break-keep")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸(정적 public 에셋) */}
      <img src={WORSHIP.hero.src} alt={WORSHIP.hero.alt} />
      <div className={styles.heroCopy}>
        <Container>
          <h1 className={cn(typo.titleMd, "text-on-dark")}>{WORSHIP.title}</h1>
          <p className={cn(typo.displayMega, "mt-xs tabular-nums text-on-dark")}>{main.time}</p>
          <p className={cn(typo.bodyLg, "mt-xs text-on-dark")}>
            {main.name} · {main.place}
          </p>
        </Container>
      </div>
    </section>
  );
}
