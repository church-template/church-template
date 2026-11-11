import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { PASTOR } from "@/constants/content";

// 밴드2 — 편지의 맺음말. 본문과 같은 흰 캔버스에서 헤어라인 하나로만 끊고, 인용문 뒤에 서명을 둔다
// (카드·다크 밴드·장식 글리프 없음 — 인사말이 편지이므로 끝도 편지처럼).
// 4fr/8fr 그리드는 PastorIntro와 같은 값 — 맺음말이 본문 칼럼에 맞춰 선다.
export function PastorQuote() {
  return (
    <section className="bg-canvas pb-section">
      <Container>
        <div className="grid gap-xxl lg:grid-cols-[4fr_8fr]">
          <div aria-hidden className="hidden lg:block" />
          <Reveal>
            <figure className="border-t border-hairline pt-xxl break-keep">
              <blockquote className={cn(typo.displayLg, "text-ink")}>{PASTOR.pullQuote}</blockquote>
              <figcaption className="mt-xl flex items-baseline justify-end gap-sm">
                <span className={cn(typo.bodySm, "text-muted")}>{PASTOR.position}</span>
                <span className={cn(typo.displaySm, "text-ink")}>{PASTOR.name}</span>
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
