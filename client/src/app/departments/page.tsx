import type { Metadata } from "next";
import { SiteShell } from "@/components/shell/SiteShell";
import { Container } from "@/components/shell/Container";
import { EmptyState } from "@/components/common/EmptyState";
import { MinistryShowcase } from "@/components/departments/MinistryShowcase";
import { DEPARTMENTS, DEPT_PAGE } from "@/constants/departments";
import { CHURCH_NAME } from "@/constants/church";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: DEPT_PAGE.title,
  description: `${CHURCH_NAME}의 사역과 부서를 소개합니다.`,
  alternates: { canonical: "/departments" },
};

// 사역(부서) 목록 — 스크롤 고정 쇼케이스(ministry-showcase). 프론트 상수 구동(메인처럼 자립) → 정적 생성.
export default function DepartmentsPage() {
  return (
    <SiteShell>
      <Container as="section" className="py-section">
        <p className={cn(typo.caption, "text-primary")}>{DEPT_PAGE.listEyebrow}</p>
        <h1 className={cn(typo.displayLg, "mt-xs break-keep text-ink")}>
          {DEPT_PAGE.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className={cn(typo.bodyMd, "mt-base break-keep text-body")}>{DEPT_PAGE.lead}</p>
        {DEPARTMENTS.length === 0 ? (
          <EmptyState message={DEPT_PAGE.empty} className="mt-lg" />
        ) : (
          <MinistryShowcase departments={DEPARTMENTS} />
        )}
      </Container>
    </SiteShell>
  );
}
