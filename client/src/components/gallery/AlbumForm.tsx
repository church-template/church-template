// src/components/gallery/AlbumForm.tsx
"use client";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagMultiSelect } from "@/components/admin/TagMultiSelect";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { createAlbum, patchAlbum } from "@/lib/api/gallery.admin";
import type { GalleryAlbumDetailResponse, VisibilityLevel } from "@/lib/api/types";
import { ACTION } from "@/constants/actionButton";
import { VISIBILITY_COPY, menuMembersFormNote } from "@/constants/visibility";
import { albumSchema, type AlbumFormValues } from "./schemas";

export interface AlbumFormProps {
  mode: "create" | "edit";
  initial?: GalleryAlbumDetailResponse;
  // 메뉴 공개 범위 — 교인만이면 체크박스 아래 안내 한 줄(#201). 못 읽었으면 undefined(안내 없음).
  menuLevel?: VisibilityLevel;
}

// 앨범 등록·수정 페이지 폼 — 공지(NoticeForm)와 동형. edit는 AlbumEditLoader가 keyed 마운트로 시드.
export function AlbumForm({ mode, initial, menuLevel }: AlbumFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const lockHintId = useId();
  const menuNoteId = useId();
  const menuMembers = menuLevel === "MEMBERS";
  // 부서 소개는 연결된 앨범 사진을 누구에게나 보인다 — 그 앨범은 교인만으로 바꿀 수 없다(스펙 6.2).
  // 이미 교인만인 앨범(백엔드가 막기 전 데이터)은 풀 수 있게 둔다.
  const locked = !!initial?.departmentLinked && !initial.membersOnly;
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<AlbumFormValues>({
    resolver: zodResolver(albumSchema),
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      tagIds: initial?.tags.map((t) => t.id) ?? [],
      membersOnly: initial?.membersOnly ?? false,
    },
  });

  const mutation = useMutation({
    // 저장된 앨범 id 반환 — create/edit 공통으로 상세 페이지 이동에 쓴다.
    mutationFn: async (v: AlbumFormValues) => {
      const body = { title: v.title, description: v.description.trim() === "" ? undefined : v.description, tagIds: v.tagIds, membersOnly: v.membersOnly };
      if (mode === "edit" && initial) {
        await patchAlbum(initial.id, { ...body, version: initial.version });
        return initial.id;
      }
      const res = await createAlbum(body);
      return res.id;
    },
    onError: adminOnError({
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof AlbumFormValues, { message: fe.reason })),
      // 409 재편집: 앨범 쿼리 무효화 → AlbumEditLoader가 최신 version으로 폼을 다시 마운트한다(keyed).
      onReedit: () => qc.invalidateQueries({ queryKey: initial ? ["album", initial.id] : ["albums"] }),
    }),
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      if (mode === "edit" && initial) qc.invalidateQueries({ queryKey: ["album", initial.id] });
      notify.success("저장했습니다.");
      router.push(`/gallery/albums/${id}`);
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xxs">
        <label htmlFor="album-title" className={cn(typo.bodySm, "text-body")}>제목</label>
        <Input id="album-title" error={errors.title?.message} {...register("title")} />
      </div>
      <div className="flex flex-col gap-xxs">
        <label htmlFor="album-desc" className={cn(typo.bodySm, "text-body")}>설명</label>
        <Controller
          control={control}
          name="description"
          render={({ field }) => <MarkdownEditor id="album-desc" value={field.value} onChange={field.onChange} error={errors.description?.message} mediaUrls={initial?.mediaUrls} />}
        />
      </div>
      <Controller control={control} name="tagIds" render={({ field }) => <TagMultiSelect value={field.value} onChange={field.onChange} />} />
      <div className="flex flex-col gap-xxs">
        <Checkbox
          label={VISIBILITY_COPY.albumCheckbox}
          disabled={locked}
          aria-describedby={[locked ? lockHintId : null, menuMembers ? menuNoteId : null].filter(Boolean).join(" ") || undefined}
          {...register("membersOnly")}
        />
        {locked ? (
          <p id={lockHintId} className={cn(typo.caption, "text-body")}>
            {VISIBILITY_COPY.deptLinked}
          </p>
        ) : null}
        {menuMembers ? (
          <p id={menuNoteId} className={cn(typo.caption, "text-body")}>
            {menuMembersFormNote("gallery")}
          </p>
        ) : null}
      </div>
      <div className="flex gap-sm">
        <Button type="button" variant="tertiary" onClick={() => router.back()}>{ACTION.cancel.label}</Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>{ACTION.save.label}</Button>
      </div>
    </form>
  );
}
