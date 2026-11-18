import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface FieldProps {
  /** 단일 입력이면 그 id — label htmlFor로 묶는다. 사진·편집기처럼 여러 조작이 든 칸은 생략(span 라벨). */
  id?: string;
  label: string;
  required: boolean;
  /** 칸 설명. 입력칸 아래에 둔다 — 위에 두면 나란한 두 칸 중 한쪽만 입력칸이 밀린다(#33). */
  help?: string;
  children: ReactNode;
}

// form-field(DESIGN). 오류 메시지는 각 입력 부품(Input·Textarea error)이 그리므로 여기서 다시 그리지 않는다.
export function Field({ id, label, required, help, children }: FieldProps) {
  const text = (
    <>
      {label} <span className="font-normal text-muted">{required ? "(필수)" : "(선택)"}</span>
    </>
  );
  const labelClass = cn(typo.bodySm, "mb-xs block font-semibold text-ink");
  return (
    <div className="flex flex-col">
      {id ? (
        <label htmlFor={id} className={labelClass}>
          {text}
        </label>
      ) : (
        <span className={labelClass}>{text}</span>
      )}
      {children}
      {help ? (
        <p id={id ? `${id}-help` : undefined} className={cn(typo.caption, "mt-xs text-body")}>
          {help}
        </p>
      ) : null}
    </div>
  );
}
