// src/components/bulletins/BulletinForm.tsx
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { revalidateBulletins } from "@/lib/admin/revalidate";
import { createBulletin, patchBulletin } from "@/lib/api/bulletins.admin";
import type { BulletinDetailResponse } from "@/lib/api/types";
import { todayKstDate } from "@/lib/date";
import { bulletinSchema, type BulletinFormValues } from "./schemas";

export interface BulletinFormProps {
  mode: "create" | "edit";
  // edit 시 BulletinEditLoader(브라우저 조회)가 최신 값·version을 시드한다.
  initial?: BulletinDetailResponse;
}

// 주보 등록·수정 페이지 폼 — 공지(NoticeForm)와 동형. PDF 선택은 MediaPicker(Dialog) 재사용.
export function BulletinForm({ mode, initial }: BulletinFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { register, handleSubmit, setValue, watch, setError, formState: { errors } } = useForm<BulletinFormValues>({
    resolver: zodResolver(bulletinSchema),
    defaultValues: {
      title: initial?.title ?? "",
      // 새 주보는 예배일을 오늘로 시작(수정은 저장값) — 대부분 가까운 날짜라 매번 고르지 않아도 되게
      serviceDate: initial?.serviceDate ?? todayKstDate(),
      mediaId: initial?.mediaId ?? 0,
    },
  });
  const serviceDate = watch("serviceDate");
  const mediaId = watch("mediaId");

  const mutation = useMutation({
    mutationFn: (v: BulletinFormValues) =>
      mode === "edit" && initial
        ? patchBulletin(initial.id, { version: initial.version, title: v.title, serviceDate: v.serviceDate, mediaId: v.mediaId })
        : createBulletin({ title: v.title, serviceDate: v.serviceDate, mediaId: v.mediaId }),
    onError: adminOnError({
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof BulletinFormValues, { message: fe.reason })),
      // 409 재편집: 상세 쿼리 무효화 → BulletinEditLoader가 최신 version으로 폼을 다시 마운트한다(keyed).
      onReedit: () => qc.invalidateQueries({ queryKey: initial ? ["bulletin", initial.id] : ["bulletins"] }),
    }),
    onSuccess: async () => {
      await revalidateBulletins();
      // 교인만 모드의 브라우저 조회 경로도 새 내용을 받게(6.6-13).
      qc.invalidateQueries({ queryKey: ["bulletins"] });
      if (initial) qc.invalidateQueries({ queryKey: ["bulletin", initial.id] });
      notify.success("저장했습니다.");
      // 주보는 상세 페이지가 없다(행=PDF 새 탭) — 목록으로 복귀.
      router.push("/bulletins");
    },
  });

  return (
    <>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-lg">
        <div className="flex flex-col gap-xxs">
          <label htmlFor="bulletin-title" className={cn(typo.bodySm, "text-body")}>제목</label>
          <Input id="bulletin-title" error={errors.title?.message} {...register("title")} />
        </div>
        <div className="flex flex-col gap-xxs">
          <label htmlFor="bulletin-date" className={cn(typo.bodySm, "text-body")}>예배일</label>
          <DateTimePicker
            id="bulletin-date"
            allDay
            value={serviceDate}
            onChange={(v) => setValue("serviceDate", v, { shouldValidate: true })}
            error={errors.serviceDate?.message}
          />
        </div>
        <div className="flex flex-col gap-xxs">
          <span className={cn(typo.bodySm, "text-body")}>PDF</span>
          <div className="flex items-center gap-sm">
            <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>PDF 선택</Button>
            {mediaId > 0 ? <span className={cn(typo.bodySm, "text-muted")}>선택됨 (media:{mediaId})</span> : null}
          </div>
          {errors.mediaId ? <span className={cn(typo.caption, "text-error")}>{errors.mediaId.message}</span> : null}
        </div>
        <div className="flex gap-sm">
          <Button type="button" variant="tertiary" onClick={() => router.back()}>{ACTION.cancel.label}</Button>
          <Button type="submit" variant="primary" loading={mutation.isPending}>{ACTION.save.label}</Button>
        </div>
      </form>
      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        accept="pdf"
        onConfirm={(ids) => setValue("mediaId", ids[0] ?? 0, { shouldValidate: true })}
      />
    </>
  );
}
