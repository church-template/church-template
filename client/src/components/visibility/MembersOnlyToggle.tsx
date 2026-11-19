"use client";

import { useId } from "react";
import { Globe, Lock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { VISIBILITY_COPY, toggleActionText } from "@/constants/visibility";
import { useHasPermission } from "@/lib/auth/useMe";
import { patchSermon } from "@/lib/api/sermons.admin";
import { patchAlbum } from "@/lib/api/gallery.admin";
import { revalidateMain } from "@/lib/admin/revalidate";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import type { VisibilityLevel } from "@/lib/api/types";

const KIND = {
  sermon: { list: "sermons", detail: "sermon", permission: "SERMON_WRITE" },
  album: { list: "albums", detail: "album", permission: "GALLERY_WRITE" },
} as const;

export interface MembersOnlyToggleProps {
  kind: "sermon" | "album";
  id: number;
  title: string;
  version: number;
  membersOnly: boolean;
  departmentLinked?: boolean;
}

// members-only-toggle(DESIGN). 글자는 지금 상태, 누르면 반대로 바로 저장한다.
// 카드·행 링크 밖 형제로 둔다(중첩 인터랙티브 금지). 보안 경계는 서버 /api/admin/**.
export function MembersOnlyToggle({ kind, id, title, version, membersOnly, departmentLinked }: MembersOnlyToggleProps) {
  const k = KIND[kind];
  const canWrite = useHasPermission(k.permission);
  const qc = useQueryClient();
  const hintId = useId();
  const next = !membersOnly;
  const save = useMutation({
    mutationFn: async () => {
      const body = { membersOnly: next, version };
      if (kind === "sermon") await patchSermon(id, body);
      else await patchAlbum(id, body);
    },
    // 409: 목록을 다시 받아 최신 version으로 버튼을 다시 그린다(목록 카드의 version을 쓰므로).
    onError: adminOnError({ onReedit: () => qc.invalidateQueries({ queryKey: [k.list] }) }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: [k.list] });
      qc.invalidateQueries({ queryKey: [k.detail, id] });
      // 홈 설교 목록은 60초 서버 캐시 — 교인만으로 바꾼 설교 제목이 홈에 남지 않게(앨범은 홈에 없다).
      // 실패해도 저장은 끝났다 → 로그만(60초 뒤 홈 캐시가 스스로 만료된다).
      if (kind === "sermon") {
        try {
          await revalidateMain();
        } catch (e) {
          console.error(e);
        }
      }
      notify.success(next ? VISIBILITY_COPY.toastMembers : VISIBILITY_COPY.toastPublic);
    },
  });

  if (!canWrite) return null;
  // 부서 소개는 연결된 앨범 사진을 누구에게나 보인다 — 그 앨범은 교인만으로 바꿀 수 없다(스펙 6.2).
  const locked = kind === "album" && !!departmentLinked && !membersOnly;
  const Icon = membersOnly ? Lock : Globe;
  return (
    <div className="flex flex-col items-start gap-xxs">
      <Button
        type="button"
        variant="secondary"
        aria-describedby={locked ? hintId : undefined}
        disabled={locked}
        loading={save.isPending}
        onClick={() => save.mutate()}
      >
        <Icon size={20} aria-hidden />
        {membersOnly ? VISIBILITY_COPY.toggleMembersOnly : VISIBILITY_COPY.togglePublic}
        {/* 접근 이름 = 보이는 글자 + 이 숨긴 동작(aria-label로 덮으면 음성 제어가 보이는 글자로 못 부른다) */}
        <span className="sr-only">{toggleActionText(kind, title, next)}</span>
      </Button>
      {locked ? (
        <p id={hintId} className={cn(typo.caption, "text-body")}>
          {VISIBILITY_COPY.deptLinked}
        </p>
      ) : null}
    </div>
  );
}

// members-only-banner(DESIGN) — 메뉴 전체가 교인만일 때 목록 위 한 줄(행마다가 아니라 한 번).
export function MembersOnlyBanner({ menuLevel, writePermission }: { menuLevel: VisibilityLevel; writePermission: string }) {
  const canWrite = useHasPermission(writePermission);
  if (menuLevel !== "MEMBERS" || !canWrite) return null;
  return (
    <p className={cn(typo.bodySm, "flex items-center gap-xs text-body")}>
      <Lock size={20} aria-hidden />
      {VISIBILITY_COPY.menuAllMembers}
    </p>
  );
}
