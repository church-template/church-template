import { Bus, Car, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { LOCATION } from "@/constants/content";

// directions.key → 아이콘(표현용 매핑). 미정의 key는 Car로 폴백.
const DIRECTION_ICONS: Record<string, LucideIcon> = { car: Car, transit: Bus };

// 문의 밴드의 좌측 컬럼 — 찾아오는 방법을 아이콘 줄 목록으로(2px ink 룰 + 헤어라인).
// 박스를 걷어 이 밴드의 흰 카드는 문의 하나만 남긴다 — 눈이 주 행동(문의)으로 간다(#178).
// 밴드 배경·컨테이너는 페이지가 소유한다(문의 카드와 한 그리드를 이루므로).
export function LocationDirections() {
  return (
    <section className="break-keep">
      <Reveal>
        <h2 className={cn(typo.titleLg, "text-ink")}>{LOCATION.directionsHeading}</h2>
      </Reveal>
      <ul className="mt-xl border-t-2 border-ink">
        {LOCATION.directions.map((item, i) => {
          const Icon = DIRECTION_ICONS[item.key] ?? Car;
          return (
            <li key={item.key} className="border-b border-hairline py-lg">
              <Reveal delay={i * 120} className="flex gap-base">
                <Icon size={28} className="mt-xxs shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h3 className={cn(typo.titleMd, "text-ink")}>{item.title}</h3>
                  <div className={cn(typo.bodyMd, "mt-xxs text-body")}>
                    {item.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
