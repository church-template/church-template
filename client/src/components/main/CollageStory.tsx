"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { COLLAGE_SECTION } from "@/constants/content";
import { COLLAGE_TILES } from "@/constants/church";
import { clamp01, segment } from "@/hero/scrub";
import { useMediaFlag, REDUCED_MQ } from "@/lib/hooks/useMediaFlag";
import styles from "./CollageStory.module.css";

// 한 전환(장면 k → k+1) 안의 구간. 앞뒤 여백은 머무는 구간(글 읽는 시간).
const T = {
  capOut: [0.1, 0.4], // 지금 장면 글이 꺼진다
  photo: [0.2, 0.7], // 다음 사진이 제자리에서 서서히 나타난다
  capIn: [0.62, 0.9], // 다음 장면 글이 켜진다
} as const;

/** 스크롤 진행도(0~1) → 장면별 사진·글 불투명도. 사진은 아래 장면을 그대로 두고 위에 얹는다(사이에 검은 화면이 비치지 않게). */
export function sceneFrame(p: number, count: number): { photo: number[]; caption: number[] } {
  const q = (clamp01(p) || 0) * (count - 1); // NaN(레이아웃 전 0/0)은 처음으로
  const k = Math.min(count - 2, Math.floor(q));
  const f = q - k;
  const photo: number[] = [];
  const caption: number[] = [];
  for (let i = 0; i < count; i++) {
    photo.push(i <= k ? 1 : i === k + 1 ? segment(f, T.photo[0], T.photo[1]) : 0);
    caption.push(
      i === k ? 1 - segment(f, T.capOut[0], T.capOut[1]) : i === k + 1 ? segment(f, T.capIn[0], T.capIn[1]) : 0,
    );
  }
  return { photo, caption };
}

// 히어로 아래 장면 섹션(collage-story) — 히어로처럼 화면에 고정된 채, 스크롤만큼 사진이 제자리에서 페이드로 바뀐다.
// 모양·크기·위치는 움직이지 않는다(어지럽지 않게). 연출은 JS 장착(data-armed) 뒤에만 건다 —
// SSR·JS 실패·reduced-motion은 사진과 글을 세로로 쌓은 정적 목록이 그대로 보인다.
export function CollageStory() {
  const rootRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const reduced = useMediaFlag(REDUCED_MQ);

  useEffect(() => {
    if (reduced) return;
    const root = rootRef.current!;
    const sticky = stickyRef.current!;
    const scenes = [...root.querySelectorAll<HTMLElement>("[data-scene]")];
    const caps = [...root.querySelectorAll<HTMLElement>("[data-cap]")];
    let ticking = false;

    const update = () => {
      ticking = false;
      // 고정 구간 = 섹션 상단이 고정 위치(sticky top)에 닿은 뒤 ~ 섹션 끝
      const top = parseFloat(getComputedStyle(sticky).top) || 0;
      const rect = root.getBoundingClientRect();
      const { photo, caption } = sceneFrame((top - rect.top) / (rect.height - sticky.offsetHeight), scenes.length);
      scenes.forEach((el, i) => {
        el.style.opacity = String(photo[i]);
        el.style.visibility = photo[i] ? "" : "hidden";
      });
      caps.forEach((el, i) => {
        el.style.opacity = String(caption[i]);
      });
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    root.dataset.armed = "";
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      delete root.dataset.armed;
      // 정적 목록으로 돌아갈 때 스테일 인라인이 장면을 가리지 않게 지운다
      scenes.forEach((el) => {
        el.style.opacity = "";
        el.style.visibility = "";
      });
      caps.forEach((el) => {
        el.style.opacity = "";
      });
    };
  }, [reduced]);

  return (
    <section
      ref={rootRef}
      className={styles.root}
      aria-labelledby="collage-heading"
      style={{ "--scenes": COLLAGE_TILES.length } as CSSProperties}
    >
      <div ref={stickyRef} className={styles.sticky}>
        <Container className={styles.head}>
          <p className={cn(typo.titleMd, "text-on-dark")}>{COLLAGE_SECTION.eyebrow}</p>
          <h2 id="collage-heading" className={cn(typo.titleMd, "text-on-dark-soft")}>
            {COLLAGE_SECTION.title}
          </h2>
        </Container>
        <ol className={styles.scenes}>
          {COLLAGE_TILES.map((t, i) => (
            <li key={t.src} data-scene="" className={styles.scene}>
              <div className={styles.photo}>
                {/* 세로 화면에서 사진을 자르지 않고 세울 때 뒤에 까는 흐린 같은 사진(가로 화면은 CSS가 숨긴다) */}
                {/* eslint-disable-next-line @next/next/no-img-element -- 연출용 장식 배경 */}
                <img className={styles.backdrop} src={t.src} alt="" aria-hidden loading="lazy" />
                {/* eslint-disable-next-line @next/next/no-img-element -- 정적 public 장식 사진(제목·설명이 같은 내용을 텍스트로 전한다) */}
                <img className={styles.picture} src={t.src} alt="" loading={i === 0 ? "eager" : "lazy"} />
              </div>
              <Container className={styles.capWrap}>
                <div data-cap="" className={styles.cap}>
                  <p className={cn(typo.datetime, "text-primary-on-dark")} aria-hidden>
                    {String(i + 1).padStart(2, "0")} / {String(COLLAGE_TILES.length).padStart(2, "0")}
                  </p>
                  <h3 className={cn(typo.displayLg, "mt-xs text-on-dark")}>{t.title}</h3>
                  <p className={cn(typo.bodyLg, "mt-xs text-on-dark-soft")}>{t.desc}</p>
                </div>
              </Container>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
