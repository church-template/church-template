"use client";

import { useEffect, type RefObject } from "react";

// 미리보기 칸(sticky)의 높이를 "자기 윗변 ~ 저장 막대 윗변"으로 맞춘다.
// CSS(100dvh 계산)만으로는 페이지 맨 위에서 칸이 아직 붙기 전에 아래쪽이 저장 막대 뒤로 숨는다(#33 시안 확인).
// 남은 공간이 아무리 작아도 그 이상으로 늘리지 않는다 — 넘치면 저장 막대 뒤로 숨는다(칸 안 스크롤로 본다).

// 저장 막대와 띄울 간격 = spacing.base 토큰(px 값을 코드에 복사하지 않는다).
export function spacingPx(token: string): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--spacing-${token}`));
  return Number.isFinite(v) ? v : 0;
}

export function useFitAbove(target: RefObject<HTMLElement | null>, bar: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = target.current;
        const b = bar.current;
        if (!el || !b) return;
        const h = b.getBoundingClientRect().top - el.getBoundingClientRect().top - spacingPx("base");
        el.style.maxHeight = `${Math.max(0, h)}px`;
      });
    };
    fit();
    window.addEventListener("scroll", fit, { capture: true, passive: true });
    window.addEventListener("resize", fit);
    // 스크롤·창 크기 변화 없이 위쪽 레이아웃만 바뀌는 경우(상세 도착 뒤 제목 줄바꿈 등)도 다시 맞춘다
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    ro?.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", fit, { capture: true });
      window.removeEventListener("resize", fit);
      ro?.disconnect();
    };
  }, [target, bar]);
}
