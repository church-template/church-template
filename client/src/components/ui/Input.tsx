"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export type InputVariant = "text" | "searchPill";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  error?: string;
}

// text: 1px hairline + 포커스 시 border 1px + ring 1px = 시각상 2px primary(리플로우 없음).
// 기본 보더는 muted-soft — hairline은 흰 바탕에서 빈 칸이 칸으로 안 보였다(#33). hover는 한 단계 더(muted).
const variantClass: Record<InputVariant, string> = {
  text: cn(
    "bg-canvas rounded-md h-12 px-4 border border-muted-soft",
    "hover:border-muted",
    "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:hover:border-primary",
  ),
  searchPill: cn(
    "bg-surface-strong rounded-pill h-11 px-5",
    "focus-visible:ring-1 focus-visible:ring-primary",
  ),
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = "text", error, className, id, "aria-describedby": describedBy, ...props }, ref) => {
    const reactId = useId();
    const inputId = id ?? reactId;
    const errorId = `${inputId}-error`;
    return (
      <div className="flex flex-col gap-xxs">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          // 칸 아래 설명(호출한 쪽)과 오류 메시지를 둘 다 읽게 합친다
          aria-describedby={[describedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined}
          className={cn(
            typo.bodyMd,
            "w-full text-ink outline-hidden placeholder:text-muted",
            "transition duration-150 ease-out",
            "disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted",
            variantClass[variant],
            // 에러: 메시지 텍스트와 병행해 보더로도 상태를 드러낸다.
            // DESIGN 'semantic은 폼 메시지 텍스트 전용'에서 보더만 의도적 확장 — 배경 채움은 여전히 금지.
            error &&
              "border-error hover:border-error focus-visible:border-error focus-visible:ring-error",
            className,
          )}
          {...props}
        />
        {error ? (
          <span id={errorId} className={cn(typo.caption, "text-error")}>
            {error}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
