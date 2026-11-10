import { buttonVariants } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { NEWS_LIST } from "@/constants/news";
import { formatLongDate, isWithinWeek } from "@/lib/monthGroups";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

// 최신 주보 띠(bulletin-feature) — sermon-feature와 같은 결. 띠 전체가 PDF 새 탭 링크.
export function BulletinFeature({
  title,
  serviceDate,
  author,
  pdfUrl,
  now,
}: {
  title: string;
  serviceDate: string;
  author?: string | null;
  pdfUrl: string;
  now: Date;
}) {
  const label = isWithinWeek(serviceDate, now) ? NEWS_LIST.bulletinFeaturedRecent : NEWS_LIST.bulletinFeaturedLatest;
  const meta = [formatLongDate(serviceDate), author].filter(Boolean).join(" · ");
  return (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex flex-col gap-lg rounded-xl bg-surface-dark p-xl break-keep sm:p-xxl lg:flex-row lg:items-end lg:justify-between",
        focusRing,
      )}
    >
      <div>
        <p className={cn(typo.captionStrong, "text-primary-on-dark")}>{label}</p>
        <h2 className={cn(typo.displayLg, "mt-xs text-on-dark group-hover:underline")}>
          {title}
          <span className="sr-only">{NEWS_LIST.pdfHint}</span>
        </h2>
        <p className={cn(typo.datetime, "mt-base text-on-dark-soft")}>{meta}</p>
      </div>
      <span className={cn(buttonVariants("pillCta"), "self-start whitespace-nowrap lg:self-auto")}>
        {NEWS_LIST.bulletinCta}
      </span>
    </a>
  );
}
