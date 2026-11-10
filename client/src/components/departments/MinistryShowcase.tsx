"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { DEPT_PAGE, thumbnailOf, type Department } from "@/constants/departments";
import styles from "./MinistryShowcase.module.css";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-sm";

// 사역 목록(ministry-showcase) — 큰 사진은 제자리에 있고, 스크롤하면 부서가 넘어가며 사진이 따라 바뀐다.
// 누르는 동작 없이 내려가기만 하면 되고(고령·터치), 모든 글과 링크는 처음부터 DOM에 있어 JS 없이도 읽힌다.
export function MinistryShowcase({ departments }: { departments: Department[] }) {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // 뷰포트 가운데 띠(상하 45%씩 제외)를 지나는 부서를 켠다 — 띠가 얇아 동시에 둘이 켜지지 않는다.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = steps.current.indexOf(e.target as HTMLLIElement);
            if (i >= 0) setActive(i);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    for (const el of steps.current) {
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [departments]);

  return (
    <div className={cn(styles.root, "mt-xxl")}>
      {/* 고정 무대 — 부서별 사진과 같은 사진이라 보조기기에는 숨긴다(대체 텍스트는 부서 블록 쪽). */}
      <div className={styles.stage} aria-hidden>
        <span className={cn(typo.datetime, styles.count)}>
          {active + 1} / {departments.length}
        </span>
        {departments.map((d, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸(정적 public 에셋)
          <img key={d.slug} src={thumbnailOf(d.media)} alt="" data-active={i === active} />
        ))}
      </div>

      <ol>
        {departments.map((d, i) => (
          <li
            key={d.slug}
            ref={(el) => {
              steps.current[i] = el;
            }}
            data-active={i === active}
            className={cn(styles.step, "break-keep")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸(정적 public 에셋) */}
            <img
              src={thumbnailOf(d.media)}
              alt={d.name}
              loading="lazy"
              className={styles.photo}
            />
            <p className={cn(typo.caption, "text-primary")}>{d.name}</p>
            <h2 className={cn(typo.displayMd, "mt-xs text-ink")}>
              {d.caption.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            {d.summary ? <p className={cn(typo.bodyMd, "mt-sm text-body")}>{d.summary}</p> : null}
            {d.when ? <p className={cn(typo.datetime, "mt-xs text-muted")}>{d.when}</p> : null}
            <Link
              href={`/departments/${d.slug}`}
              aria-label={`${d.name} ${DEPT_PAGE.more}`}
              className={cn(
                typo.button,
                "mt-xs inline-flex h-12 items-center gap-xs self-start text-primary hover:underline",
                focusRing,
              )}
            >
              {DEPT_PAGE.more}
              <ArrowRight size={20} aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
