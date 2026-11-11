"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, HeartHandshake, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { MINISTRY, MINISTRIES, type Ministry } from "@/constants/content";
import styles from "./MinistryCards.module.css";

// 아이콘은 컴포넌트에서 매핑 — 상수는 직렬화 가능한 키만 보유(스펙 §3). 색은 currentColor 상속.
const ICONS: Record<Ministry["key"], LucideIcon> = {
  worship: BookOpen,
  nextgen: GraduationCap,
  serving: HeartHandshake,
};

const focusRing =
  "rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark";

// 사역 사진 패널(ministry-panels) — 한 번에 하나만 펼쳐 설명·링크를 보인다.
// 폰엔 호버가 없으므로 펼침은 누름이 기본이고, 마우스 포인터일 때만 올리기로도 펼친다.
// 접힌 패널의 설명·링크는 inert — 보이지 않는 링크로 키보드 포커스가 새지 않게.
export function MinistryCards() {
  const [open, setOpen] = useState(0);
  const baseId = useId();

  return (
    <section className="py-section">
      <Container>
        <h2 className={cn(typo.displayLg, "text-ink")}>{MINISTRY.title}</h2>
        <div className={cn(styles.panels, "mt-lg")}>
          {MINISTRIES.map((m, i) => {
            const Icon = ICONS[m.key];
            const isOpen = i === open;
            const moreId = `${baseId}-${m.key}`;
            return (
              <div
                key={m.key}
                data-open={isOpen}
                className={styles.panel}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setOpen(i);
                }}
              >
                {/* 장식 사진 — 제목·설명이 같은 내용을 텍스트로 전한다 */}
                {/* eslint-disable-next-line @next/next/no-img-element -- 정적 public 에셋, 부서 카드·쇼케이스와 같은 <img> 관례 */}
                <img src={m.image} alt="" className={styles.img} />
                <div className={styles.scrim} />
                <div className={styles.body}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={moreId}
                    onClick={() => setOpen(i)}
                    className={cn(styles.trigger, typo.titleLg, focusRing)}
                  >
                    <Icon size={32} aria-hidden />
                    {m.title}
                  </button>
                  <div id={moreId} className={styles.more} inert={!isOpen}>
                    <div>
                      <p className={cn(typo.bodyMd, "text-on-dark-soft")}>{m.desc}</p>
                      <Link
                        href={m.href}
                        className={cn(styles.link, typo.button, "mt-xs inline-flex min-h-12 items-center gap-xs text-on-dark", focusRing)}
                      >
                        {m.cta}
                        <ArrowRight size={20} aria-hidden />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
