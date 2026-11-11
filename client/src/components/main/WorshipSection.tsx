import { Container } from "@/components/shell/Container";
import { NextServiceBand } from "@/components/worship/NextServiceBand";
import { WorshipDayFilter } from "./WorshipDayFilter";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";

// 13.4 ② 예배 시간 안내 — API 없음, 빌드 주입 상수(가이드 13.3/12장).
// "다음 예배" 띠(예배 안내 페이지와 같은 컴포넌트)로 지금 갈 예배를 먼저 알리고, 요일 칩으로 그날 예배를 골라 본다.
export function WorshipSection() {
  return (
    <section className="py-section">
      <Container>
        <h2 className={cn(typo.displayLg, "text-ink")}>{WORSHIP.title}</h2>
        <div className="mt-lg">
          <NextServiceBand />
        </div>
        <div className="mt-xl">
          <WorshipDayFilter services={WORSHIP_SERVICES} />
        </div>
      </Container>
    </section>
  );
}
