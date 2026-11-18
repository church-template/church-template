"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ACTION } from "@/constants/actionButton";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { useFitAbove } from "./useFitAbove";

export interface EditPageShellProps {
  title: string;
  back: { href: string; label: string };
  /** 저장 버튼이 폼 밖(저장 막대)에 있어 form 속성으로 제출한다. */
  formId: string;
  dirty: boolean;
  submitting: boolean;
  canSubmit: boolean;
  onCancel: () => void;
  previewTitle: string;
  preview: ReactNode;
  children: ReactNode;
}

const DIRTY_NOTICE = "저장하지 않은 변경이 있습니다.";

// edit-page-shell(DESIGN). 입력이 주 작업이라 왼쪽 위, 미리보기는 오른쪽, 저장은 오른쪽 아래(시선 흐름).
// 64rem 미만은 미리보기 칸을 숨기고 저장 막대의 "미리보기"로 아래 시트를 연다(입력이 화면 맨 위부터 보이게).
export function EditPageShell({
  title,
  back,
  formId,
  dirty,
  submitting,
  canSubmit,
  onCancel,
  previewTitle,
  preview,
  children,
}: EditPageShellProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useFitAbove(asideRef, barRef);

  return (
    <>
      <Container className="pt-xl pb-lg">
        <Link
          href={back.href}
          className={cn(
            typo.button,
            "inline-flex min-h-12 items-center gap-xs rounded-sm text-body hover:text-ink",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          )}
        >
          <ArrowLeft size={20} aria-hidden />
          {back.label}
        </Link>
        <h1 className={cn(typo.displayLg, "mt-xs text-ink")}>{title}</h1>
      </Container>

      <Container className="grid gap-xl break-keep pb-xxl lg:grid-cols-12 lg:gap-xxl">
        <div className="min-w-0 lg:col-span-7">
          <div className="max-w-[var(--container-narrow)]">{children}</div>
        </div>
        <aside
          ref={asideRef}
          aria-label={previewTitle}
          className="hidden overflow-y-auto overscroll-contain lg:sticky lg:pr-sm lg:top-lg lg:col-span-5 lg:block lg:self-start"
        >
          {/* 칸 안에서 스크롤해도 무엇을 보는지 남도록 제목만 붙여 둔다 */}
          <h2 className={cn(typo.titleMd, "sticky top-0 z-10 border-b-2 border-ink bg-canvas pb-sm text-ink")}>
            {previewTitle}
          </h2>
          <div className="pt-lg">{preview}</div>
        </aside>
      </Container>

      <div ref={barRef} className="sticky bottom-0 z-nav border-t border-hairline bg-canvas">
        <Container className="flex flex-wrap items-center gap-x-sm gap-y-xs py-sm sm:h-20 sm:flex-nowrap sm:py-0">
          {dirty ? (
            <p role="status" className={cn(typo.caption, "basis-full text-body sm:flex-1 sm:basis-auto")}>
              {DIRTY_NOTICE}
            </p>
          ) : (
            <span aria-hidden className="hidden sm:block sm:flex-1" />
          )}
          <Button type="button" variant="secondary" className="mr-auto sm:mr-0 lg:hidden" onClick={() => setSheetOpen(true)}>
            <Eye size={20} aria-hidden />
            미리보기
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            {ACTION.cancel.label}
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={submitting} disabled={!canSubmit}>
            {ACTION.save.label}
          </Button>
        </Container>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" aria-describedby={undefined} className="break-keep p-base">
          <SheetTitle className={cn(typo.titleMd, "pr-xxl")}>{previewTitle}</SheetTitle>
          {preview}
        </SheetContent>
      </Sheet>
    </>
  );
}
