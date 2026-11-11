import {
  BookOpen,
  Church,
  GraduationCap,
  HandHeart,
  HeartHandshake,
  Send,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { PASTOR, type PastorPhilosophyKey } from "@/constants/content";

// 철학 키→아이콘 매핑(상수는 직렬화 키만, 색은 currentColor=muted 상속 — MinistryCards 선례).
const PHILOSOPHY_ICONS: Record<PastorPhilosophyKey, LucideIcon> = {
  worship: Church,
  bible: BookOpen,
  fellowship: HeartHandshake,
  community: HandHeart,
  nextgen: GraduationCap,
  mission: Send,
};

// 밴드3 — 회색 밴드. 좌 약력 : 우 목회 철학 = 5:7 두 칸, 둘 다 2px 룰 + 헤어라인 줄 목록(month-list-row 결).
// 카드를 쓰지 않는다 — 한 줄짜리 항목 여섯 개를 카드로 키우면 내용보다 틀이 커진다.
const HEADING = "border-b-2 border-ink pb-sm text-ink";
const ROW = "border-b border-hairline py-base";

export function PastorDossier() {
  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <div className="grid gap-xxl break-keep lg:grid-cols-[5fr_7fr]">
          <Reveal>
            <h2 className={cn(typo.titleMd, HEADING)}>{PASTOR.credentials.heading}</h2>
            <ul>
              {PASTOR.credentials.items.map((item) => (
                <li key={item} className={cn(typo.bodyMd, ROW, "text-body")}>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120}>
            <h2 className={cn(typo.titleMd, HEADING)}>{PASTOR.philosophy.heading}</h2>
            <ol>
              {PASTOR.philosophy.items.map((item, i) => {
                const Icon = PHILOSOPHY_ICONS[item.key];
                return (
                  <li key={item.key} className={cn(ROW, "flex items-center gap-base")}>
                    <span aria-hidden className={cn(typo.datetime, "text-muted")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={cn(typo.titleMd, "flex-1 text-ink")}>{item.text}</span>
                    <Icon size={24} aria-hidden className="shrink-0 text-muted" />
                  </li>
                );
              })}
            </ol>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
