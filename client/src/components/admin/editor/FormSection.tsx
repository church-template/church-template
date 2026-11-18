import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface FormSectionProps {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}

// form-section(DESIGN) — 칸을 뜻으로 묶어 "무엇부터 채우나"를 보이게 한다. 구역 간격은 부모(flex gap)가 정한다.
export function FormSection({ id, title, lead, children }: FormSectionProps) {
  const headingId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-lg">
      <h2 id={headingId} className={cn(typo.titleMd, "border-b-2 border-ink pb-sm text-ink")}>
        {title}
      </h2>
      {lead ? <p className={cn(typo.bodySm, "mt-sm text-body")}>{lead}</p> : null}
      <div className="mt-lg flex flex-col gap-lg">{children}</div>
    </section>
  );
}
