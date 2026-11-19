"use client";
import { useQueries } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VISIBILITY_COPY, VISIBILITY_MENUS, openConfirmMessage } from "@/constants/visibility";
import { useMe } from "@/lib/auth/useMe";
import { hasPermission } from "@/lib/auth/permissions";
import { fetchSermons } from "@/lib/api/sermons";
import { fetchAlbums } from "@/lib/api/gallery";
import type { Page } from "@/lib/page";
import type { VisibilityMenu } from "@/lib/api/types";

type Counts = { total: number; membersOnly: number };
type CountPage = (p: { size: number; membersOnly?: boolean }) => Promise<Page<unknown>>;

// 전체 수와 교인만 수 — 목록 한 칸짜리 페이지의 totalElements만 쓴다.
async function count(fetchPage: CountPage): Promise<Counts> {
  const [all, members] = await Promise.all([fetchPage({ size: 1 }), fetchPage({ size: 1, membersOnly: true })]);
  return { total: all.page.totalElements, membersOnly: members.page.totalElements };
}

// 글 단위 교인만이 있는 메뉴만 숫자를 센다.
const COUNTERS: Partial<Record<VisibilityMenu, () => Promise<Counts>>> = {
  sermons: () => count(fetchSermons),
  gallery: () => count(fetchAlbums),
};

export interface VisibilityConfirmDialogProps {
  open: boolean;
  opened: VisibilityMenu[]; // 이번 저장으로 교인만 → 누구나가 되는 메뉴
  pending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

// visibility-confirm-dialog(DESIGN). 누구나로 여는 메뉴마다 무슨 일이 생기는지 한 문장씩 미리 알린다(스펙 4B).
export function VisibilityConfirmDialog({ open, opened, pending, onConfirm, onOpenChange }: VisibilityConfirmDialogProps) {
  const { data: me } = useMe();
  // 백엔드는 그 메뉴 글을 쓰지 않는 사람의 요청에서 membersOnly 필터를 무시한다(6.6-6) — 그때 센 숫자는 틀리므로 아예 묻지 않는다.
  const counted = opened.flatMap((m) => {
    const countFn = COUNTERS[m];
    const def = VISIBILITY_MENUS.find((d) => d.key === m);
    return countFn && def && hasPermission(def.writePermission, me) ? [{ menu: m, countFn }] : [];
  });
  const results = useQueries({
    queries: counted.map(({ menu, countFn }) => ({
      queryKey: ["visibility", "counts", menu],
      queryFn: countFn,
      enabled: open,
      staleTime: 0, // 방금 바꾼 글 표시까지 반영한 숫자
      retry: false,
    })),
  });
  const countsOf = (m: VisibilityMenu) => results[counted.findIndex((c) => c.menu === m)]?.data;
  // 숫자를 받는 동안엔 확정하지 않게 한다. 실패는 숫자 없는 문장으로 넘어간다.
  const counting = results.some((r) => r.isPending);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{VISIBILITY_COPY.confirmTitle}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-sm">
              {opened.map((m) => (
                <p key={m} className={cn(typo.bodyMd, "text-body")}>
                  {openConfirmMessage(m, countsOf(m))}
                </p>
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {VISIBILITY_COPY.cancel}
            </Button>
          </DialogClose>
          <Button type="button" variant="primary" loading={pending} disabled={counting} onClick={onConfirm}>
            {VISIBILITY_COPY.confirmOk}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
