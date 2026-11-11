"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/shell/Container";
import { HistoryMedia } from "@/components/history/HistoryMedia";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { HISTORY } from "@/constants/content";
import styles from "./HistoryBand.module.css";

// 선 끝이 뷰포트 이 높이(위에서 60%)에 있을 때를 "지금 읽는 곳"으로 본다.
const READ_LINE = 0.6;

// 연혁 타임라인(history-timeline) — 스크롤하면 세로선이 채워지고 선이 닿은 연도가 켜진다(한 번 켜지면 유지).
// DOM 쓰기만 하고 상태를 바꾸지 않는다(스크롤마다 리렌더 방지). reduced-motion·JS 이전엔 연출 없이 전부 보인다.
export function HistoryBand() {
  const listRef = useRef<HTMLOListElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * READ_LINE;
      const rect = list.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (line - rect.top) / rect.height));
      list.style.setProperty("--progress", String(progress));
      list.querySelectorAll<HTMLElement>("[data-history-item]").forEach((item) => {
        const dot = item.querySelector<HTMLElement>("[data-dot]");
        if (dot && dot.getBoundingClientRect().top < line) item.setAttribute("data-on", "");
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // 연출 장착은 마운트 후 1회 — 이후 위치는 스크롤 이벤트가 갱신한다.
    setArmed(true);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section aria-labelledby="history-heading" className="py-section">
      <Container>
        <p className={cn(typo.titleMd, "text-primary")}>{HISTORY.title}</p>
        <h2 id="history-heading" className={cn(typo.displayLg, "mt-xs text-ink")}>
          {HISTORY.headline}
        </h2>
        <ol
          ref={listRef}
          data-armed={armed ? "" : undefined}
          className={cn(styles.list, armed && styles.armed, "mt-xxl")}
        >
          <span className={styles.track} aria-hidden>
            <span className={styles.fill} />
          </span>
          {HISTORY.items.map((item, i) => (
            <li key={item.id} data-history-item="" data-index={i} className={styles.item}>
              <span className={styles.dot} data-dot="" aria-hidden />
              <div className={styles.text}>
                <p className={cn(typo.displayXl, styles.year, "tabular-nums")} aria-hidden>
                  {item.year.slice(0, 4)}
                </p>
                <p className={cn(typo.datetime, "mt-xxs text-muted")}>{item.year}</p>
                <h3 className={cn(typo.displaySm, "mt-xs text-ink")}>{item.text}</h3>
                <p className={cn(typo.bodyMd, "mt-xs text-body")}>{item.desc}</p>
              </div>
              {item.media ? (
                <div className={styles.media}>
                  <HistoryMedia media={item.media} />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <Link href="/about/history" className={cn(typo.button, "mt-xl inline-flex min-h-12 items-center text-primary")}>
          전체 연혁 보기
        </Link>
      </Container>
    </section>
  );
}
