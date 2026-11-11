"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./HeroReveal.module.css";
import { lerp, clamp01, segment } from "./scrub";
import { useMediaFlag, REDUCED_MQ } from "@/lib/hooks/useMediaFlag";
import type { HeroMedia } from "./types";

export interface HeroRevealProps {
  /** 십자가로 드러나는 풀스크린 미디어. 영상이면 포스터로 굳은 뒤 페이드 아웃한다(단일 <video>). */
  media: HeroMedia;
  /** 풀스크린 홀드에서 등장했다 포스터로 굳을 무렵 사라지는 카피. */
  caption: ReactNode;
  /** 포스터 원본 비율. 정적 스택(reduced)에서 포스터 카드를 크롭 없이 세우는 데만 쓴다. */
  posterAspect: number;
  /** 히어로가 헤더 밑으로 빠져나가는 순간 헤더 solid 전환 통지(양방향). */
  onSolid?: (solid: boolean) => void;
}

// 십자가 확정 비율 (14A.3) — 변경 시 디자인 재검토 필요
const CROSS = { vbw: 16, haw: 64, hbh: 16, cp: 32 };
const START_PCT = 38; // 시작 크기 %
const DIM = 0.85; // 덮개 어둡기

// 통합 타임라인 — 십자가 리빌 → 카피 → 영상이 포스터로 굳음(풀스크린) → 스크럽 끝, 포스터째 위로 빠진다.
// 사진 콜라주는 히어로 밖 섹션(CollageStory)으로 옮겼다(#157) — 포스터가 흰 캔버스로 걷히는 구간도 함께 없앴다.
// 구간 값은 콜라주가 있던 때의 **스크롤 거리(vh)를 그대로** 유지하도록 환산했다(.hero 높이 400→300vh,
// 모바일 500→365vh). 십자가·카피·포스터를 밟는 속도는 전과 같다.
const P = {
  crossIn: [0.0, 0.51], // easeIn 열쇠구멍
  capIn: [0.54, 0.69], // 카피 페이드/슬라이드 인
  posterIn: [0.69, 0.9], // 영상 → 포스터 크로스페이드 (풀스크린 유지)
  capOut: [0.84, 0.96], // 카피 페이드 아웃
} as const;

// 영상을 실제로 재생할 환경. 이 쿼리가 안 맞으면 브라우저는 <source>를 건너뛰고 poster만 띄운다
// (HTML 스펙 "show poster flag") — 즉 모바일·reduced-motion은 영상 바이트를 0 받는다.
// JS로는 막을 수 없다: useMediaFlag의 SSR 스냅샷이 false라 서버 HTML에 <video>가 실리고,
// preload scanner가 하이드레이션 전에 이미 받기 시작한다. MOBILE_MQ의 여집합 + reduced 제외.
const VIDEO_MQ = "(min-width: 640px) and (prefers-reduced-motion: no-preference)";

// easeIn은 CrossHero 내부 헬퍼 계승(scrub는 easeOut만 노출).
const easeIn = (t: number) => t * t * t;

function buildCrossPath() {
  const v = CROSS.vbw / 2,
    h = CROSS.haw / 2;
  const cY = -50 + CROSS.cp;
  const t1 = cY - CROSS.hbh / 2,
    t2 = cY + CROSS.hbh / 2;
  return `M ${-v} -50 H ${v} V ${t1} H ${h} V ${t2} H ${v} V 50 H ${-v} V ${t2} H ${-h} V ${t1} H ${-v} Z`;
}

// 중앙 미디어 렌더.
// 영상은 src 대신 <source media>를 쓴다 — src가 있으면 <source>가 무시되므로 절대 되살리지 말 것.
// 14A.5의 onError→poster 폴백은 네이티브 동작으로 대체했다: 영상을 못 틀면(404·코덱 미지원·
// 미디어쿼리 미매칭) <video poster>가 포스터를 띄운다. 결과가 같아 JS 상태 기계가 필요 없다.
function RevealMedia({ media }: { media: HeroMedia }) {
  if (media.type === "video") {
    return (
      <video autoPlay muted loop playsInline preload="metadata" poster={media.poster}>
        <source src={media.src} media={VIDEO_MQ} />
      </video>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 연출용 장식 미디어; 콘텐츠 이미지는 next/image
    <img src={media.src} alt={media.alt ?? ""} />
  );
}

export default function HeroReveal({
  media,
  caption,
  posterAspect,
  onSolid,
}: HeroRevealProps) {
  const rootRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const holeRef = useRef<SVGPathElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const reduced = useMediaFlag(REDUCED_MQ);

  useEffect(() => {
    if (reduced) {
      // reduced-motion: 폭 무관하게 CSS 정적 스택(카피 + 포스터 카드)이 전부를 표시한다.
      return;
    }

    // 모바일 포함 전 폭 공통: 스크롤 진행도 비례 단일 rAF 스크럽 — 십자가 리빌 + 카피 + 포스터.
    // 모바일은 <source media>가 안 맞아 <video>가 poster를 그대로 보여주므로(§RevealMedia 주석)
    // 영상 다운로드 없이 같은 스크럽을 탄다.
    const root = rootRef.current!;
    const sticky = stickyRef.current!;
    const posterEl = posterRef.current; // 영상 히어로일 때만 존재
    const hole = holeRef.current!;
    const captionEl = captionRef.current!;

    let startScale = 1,
      targetScale = 10,
      cx = 0,
      cy = 0,
      ticking = false,
      lastSolid = false,
      // 영상이 안 도는 환경(모바일)에서는 포스터가 곧 히어로다. <video poster>는 브라우저마다
      // object-fit 적용이 달라 믿을 수 없으므로, 포스터 <img>를 처음부터 덮어 crop-cover를 보장한다.
      posterOnly = false,
      nav = 0; // 헤더 높이 — 히어로 바닥이 이 선을 넘으면 헤더 solid

    const measure = () => {
      posterOnly = !window.matchMedia(VIDEO_MQ).matches;
      nav = parseFloat(getComputedStyle(root).getPropertyValue("--spacing-nav"));
      const vw = sticky.clientWidth,
        vh = sticky.clientHeight;
      cx = vw / 2;
      cy = vh / 2;
      startScale = (Math.min(vw, vh) * (START_PCT / 100)) / 100;
      targetScale = Math.max(vw / CROSS.vbw, vh / 100) * 1.1;
    };

    const update = () => {
      const total = root.offsetHeight - window.innerHeight;
      const p = clamp01((window.scrollY - root.offsetTop) / total);

      // 1) 십자가 열쇠구멍 확대(easeIn)
      const pe = easeIn(segment(p, P.crossIn[0], P.crossIn[1]));
      const s = lerp(startScale, targetScale, pe);
      hole.setAttribute("transform", `translate(${cx} ${cy}) scale(${s})`);

      // 2·3·5a) 카피 인 → 홀드 → 아웃(곱셈 퇴장)
      const capIn = segment(p, P.capIn[0], P.capIn[1]);
      const capOut = segment(p, P.capOut[0], P.capOut[1]);
      captionEl.style.opacity = String(capIn * (1 - capOut));
      captionEl.style.transform = `translateY(calc(-50% + ${lerp(30, 0, capIn)}px))`;

      // 4) 영상 → 포스터 크로스페이드(풀스크린 유지). 스크럽이 끝나면 포스터째 위로 빠진다.
      if (posterEl) {
        posterEl.style.opacity = posterOnly
          ? "1"
          : String(segment(p, P.posterIn[0], P.posterIn[1]));
      }

      // 헤더 — 히어로 바닥이 헤더 밑을 지나면 solid(양방향). 그 전까진 어두운 포스터 위 투명 헤더.
      const solid = root.getBoundingClientRect().bottom <= nav;
      if (solid !== lastSolid) {
        lastSolid = solid;
        onSolid?.(solid);
      }

      ticking = false;
    };

    // reduced 전환·언마운트 시 스테일 인라인이 정적 스택 레이아웃을 덮지 않게 지운다.
    const clearInline = () => {
      if (posterEl) {
        posterEl.style.opacity = "";
      }
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    const onResize = () => {
      measure();
      update();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onResize();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      clearInline();
      captionEl.style.opacity = "";
      captionEl.style.transform = "";
      hole.removeAttribute("transform");
    };
  }, [reduced, onSolid]);

  return (
    <section ref={rootRef} className={styles.hero}>
      <div ref={stickyRef} className={styles.sticky}>
        {/* 포스터 비율은 변수로만 넘긴다 — aspect-ratio를 직접 걸면 스크럽 모드(absolute inset:0)에서도
            폭에서 높이를 역산해 세로 화면이 납작하게 잘린다. CSS가 정적 스택(reduced)에서만 소비한다. */}
        <div
          ref={centerRef}
          className={styles.center}
          style={{ "--poster-aspect": posterAspect } as CSSProperties}
        >
          <RevealMedia media={media} />
          {media.type === "video" && media.poster ? (
            // 풀스크린을 유지한 채 페이드 인해 영상을 사진으로 굳힌다. <video poster>와 같은
            // URL이라 추가 다운로드가 없다(이미 캐시). 모바일·reduced는 CSS가 숨긴다.
            // eslint-disable-next-line @next/next/no-img-element -- 연출용 장식 미디어
            <img
              ref={posterRef}
              className={styles.posterOverlay}
              src={media.poster}
              alt=""
              aria-hidden="true"
            />
          ) : null}
        </div>

        <svg className={styles.cover} aria-hidden="true">
          <defs>
            <mask id="crossMask">
              <rect width="100%" height="100%" fill="white" />
              <path ref={holeRef} d={buildCrossPath()} fill="black" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill={`rgba(10,15,31,${DIM})`}
            mask="url(#crossMask)"
          />
        </svg>

        <p ref={captionRef} className={styles.caption}>
          {caption}
        </p>
      </div>
    </section>
  );
}
