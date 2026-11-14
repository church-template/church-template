"use client";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface MypageNavItem {
  id: string; // 이동할 섹션 id
  label: string;
  Icon: LucideIcon;
  heading?: string; // 이 항목 위에 붙는 묶음 제목(데스크톱 메뉴에서만)
}

// 마이페이지 바로가기. ≥64rem은 왼쪽 고정 세로 메뉴, 그 미만은 상단 고정 칩 한 줄(가로 스크롤).
// 긴 페이지에서 "지금 어디쯤인지"를 알리려고 화면 가운데 띠를 지나는 섹션을 현재 항목으로 표시한다.
export function MypageNav({ items }: { items: MypageNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const chipsRef = useRef<HTMLDivElement>(null);
  const ids = items.map((i) => i.id).join(",");

  useEffect(() => {
    const sections = ids.split(",").map((id) => document.getElementById(id)).filter((el) => el != null);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? setActive(e.target.id) : null)),
      { rootMargin: "-30% 0px -60% 0px" }, // 뷰포트 30~40% 높이 띠 — 한 번에 한 섹션만 걸린다
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [ids]);

  // 좁은 폭: 현재 칩이 가로 스크롤 밖으로 나가지 않게 가운데로 끌어온다(세로 스크롤은 건드리지 않는다).
  useEffect(() => {
    const box = chipsRef.current;
    const chip = box?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (box && chip) box.scrollLeft = chip.offsetLeft - (box.clientWidth - chip.clientWidth) / 2;
  }, [active]);

  return (
    <>
      <nav aria-label="마이페이지 메뉴" className="hidden lg:col-span-3 lg:block">
        <ul className="sticky top-xl flex flex-col gap-xxs">
          {items.map(({ id, label, Icon, heading }) => (
            <li key={id}>
              {heading ? <p className={cn(typo.captionStrong, "px-base pt-md pb-xxs text-muted")}>{heading}</p> : null}
              <a
                href={`#${id}`}
                aria-current={active === id ? "location" : undefined}
                className={cn(
                  typo.bodyMd,
                  "flex min-h-12 items-center gap-sm rounded-lg px-base text-body transition-colors hover:text-ink",
                  active === id && "bg-primary-soft font-semibold text-primary hover:text-primary",
                )}
              >
                <Icon size={20} aria-hidden />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <nav
        aria-label="마이페이지 바로가기"
        className="sticky top-0 z-nav -mx-lg mt-lg border-b border-hairline bg-canvas lg:hidden"
      >
        <div ref={chipsRef} className="flex gap-sm overflow-x-auto px-lg py-sm [scrollbar-width:none]">
          {items.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              data-id={id}
              aria-current={active === id ? "location" : undefined}
              className={cn(
                typo.button,
                "inline-flex h-12 shrink-0 items-center rounded-lg border border-hairline px-base whitespace-nowrap text-ink",
                active === id && "border-ink bg-ink text-on-dark",
              )}
            >
              {label}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
