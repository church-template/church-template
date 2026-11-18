"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { EditPageShell } from "@/components/admin/editor/EditPageShell";
import { FormSection } from "@/components/admin/editor/FormSection";
import { Field } from "@/components/admin/editor/Field";
import { mediaSrc } from "@/lib/mediaUrl";
import type { MediaResponse } from "@/lib/api/media.admin";
import { revalidateDepartments } from "@/lib/admin/revalidate";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { safeReturnPath } from "@/lib/admin/returnPath";
import { notify } from "@/lib/notify";
import { adminKeys } from "@/lib/admin/queryKeys";
import {
  createDepartment,
  updateDepartment,
  getDepartmentDetail,
  listDepartmentsAdmin,
} from "@/lib/api/departments.admin";
import { departmentSchema, type DepartmentFormValues } from "./schema";
import { DeptAlbumField } from "./DeptAlbumField";
import { DeptEditPreview } from "./DeptEditPreview";
import { EMPTY_DEPARTMENT, parentOptionsFor, seedValues, toRequestBody } from "./departmentForm";

export interface DepartmentEditFormProps {
  mode: "create" | "edit";
  editId?: number; // edit 시 필수 — 상세로 version·값 시드
  defaultParentId?: number | null; // create 시 상위 프리셋(미지정=최상위)
  from?: string | null; // 돌아갈 주소(?from=) — 같은 사이트 경로만
}

const FORM_ID = "dept-edit-form";
const MANAGE_PATH = "/mypage/manage/departments";
// 공개 부서 페이지는 부서명·담당을 상수(DEPARTMENTS)에서 읽는다 — 관리자가 바뀐다고 오해하지 않게 칸에서 알린다.
const NOT_PUBLIC_NOTE = "부서명과 담당은 공개 소개 페이지에는 나오지 않고 부서 관리 목록에 쓰입니다.";

const selectClass = cn(
  typo.bodyMd,
  "h-12 w-full rounded-md border border-muted-soft bg-canvas px-4 text-ink hover:border-muted",
  "outline-hidden focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
);

// 부서 등록·수정 페이지 폼(edit-page-shell, #33). 저장 규칙(시드·낙관락·409·사진 칸 명시)은 옛 수정 창과 같다.
export function DepartmentEditForm({ mode, editId, defaultParentId, from }: DepartmentEditFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  // 방금 고른 사진 — 저장 전엔 아직 비공개(미사용 파일)라 서명 url로 미리본다. 저장된 대표 사진은 공개라 무서명.
  const [heroPicked, setHeroPicked] = useState<MediaResponse | null>(null);
  // 이번 수정에서 앨범에 넣은 사진 수 — 즉시 서버에 반영되지만 "바꾼 것 있음"과 미리보기 표시에 쓴다.
  const [photosAdded, setPhotosAdded] = useState(0);
  // 미리보기를 활동 사진 구역으로 내려 달라는 요청 번호(앨범을 고르거나 사진을 넣을 때만 증가).
  const [galleryRequest, setGalleryRequest] = useState(0);
  // 이번에 만든 앨범 — 409 충돌로 최신본을 다시 채워도 연결이 풀리지 않게 기억한다(ref: 시드 effect를 다시 돌리지 않으려고).
  const createdAlbumId = useRef<number | null>(null);
  const isEdit = mode === "edit" && editId != null;
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: EMPTY_DEPARTMENT,
  });

  // edit: 상세를 fresh로 조회해 version·값을 시드(staleTime/gcTime 0 → 매번 최신; 409 충돌은 refetch로 갱신).
  const detail = useQuery({
    queryKey: adminKeys.detail("departments", editId ?? 0),
    queryFn: () => getDepartmentDetail(editId as number),
    enabled: isEdit,
    staleTime: 0,
    gcTime: 0,
    // 재연결 때 다시 불러오면 시드 effect가 고치던 칸을 말없이 덮는다 — 최신본은 충돌(409) 때만 명시적으로 다시 불러온다
    refetchOnReconnect: false,
    retry: false, // 재시도하면 저장 버튼이 ~30초간 말없이 멈춤 — 즉시 실패 후 토스트(Bulletin 정책)
  });
  const departments = useQuery({
    queryKey: adminKeys.list("departments"),
    queryFn: listDepartmentsAdmin,
    retry: false,
  });
  const version = detail.data?.version ?? 0;
  // edit는 상세 시드가 완료돼야(데이터 있음·非fetching·非error) 제출 허용 — 시드 진행 중/실패 시 stale version(0) PUT 차단.
  const canSubmit = mode === "create" || (!!detail.data && !detail.isFetching && !detail.isError);
  const parentOptions = parentOptionsFor(departments.data ?? [], mode, editId);

  // useWatch — watch()는 React Compiler가 메모이즈를 건너뛴다(react-hooks/incompatible-library 경고).
  const [heroMediaId, description, albumId, nameValue] = useWatch({
    control,
    name: ["heroMediaId", "description", "albumId", "name"],
  });
  const preview = (
    <DeptEditPreview
      backendId={isEdit ? editId : undefined}
      heroMediaId={heroMediaId}
      heroPickedUrl={heroPicked && heroPicked.id === heroMediaId ? heroPicked.url : undefined}
      description={description}
      albumId={albumId}
      changed={{
        hero: !!dirtyFields.heroMediaId,
        description: !!dirtyFields.description,
        album: !!dirtyFields.albumId || photosAdded > 0,
      }}
      scrollRequest={galleryRequest}
    />
  );

  const returnTo = safeReturnPath(from, MANAGE_PATH);
  const deptName = detail.data?.name ?? "";
  const backLabel =
    returnTo.startsWith("/departments/") && deptName ? `${deptName} 화면으로 돌아가기` : "부서 관리로 돌아가기";
  const title = mode === "create" ? "새 부서" : deptName ? `${deptName} 수정` : "부서 수정";

  // 폼 시드: create는 빈 폼(상위 프리셋), edit는 상세 도착 시 reset. reset()은 RHF API라 effect 내 React setState가 아니다.
  useEffect(() => {
    if (mode === "create") reset({ ...EMPTY_DEPARTMENT, parentId: defaultParentId ?? null });
    else if (detail.data) {
      reset(seedValues(detail.data));
      // 서버에 아직 연결되지 않은 새 앨범은 다시 채운 뒤에도 유지(바꾼 것으로 표시해 저장하게 한다)
      if (createdAlbumId.current !== null) setValue("albumId", createdAlbumId.current, { shouldDirty: true });
    }
  }, [mode, defaultParentId, detail.data, reset, setValue]);

  // 시드 조회 실패는 즉시 토스트로 알린다(저장 버튼이 말없이 멈추는 것 방지). notify는 setState 아님.
  useEffect(() => {
    if (detail.isError) adminOnError()(detail.error);
  }, [detail.isError, detail.error]);

  const mutation = useMutation({
    mutationFn: (v: DepartmentFormValues) => {
      const body = toRequestBody(v);
      // 수정은 항상 PUT — 전체 폼이므로 루트화(parentId null)·필드 교체를 한 경로로 처리(낙관락 version).
      if (isEdit) return updateDepartment(editId, { ...body, version });
      return createDepartment(body);
    },
    onError: adminOnError({
      onFieldErrors: (fes) =>
        fes.forEach((fe) => setError(fe.field as keyof DepartmentFormValues, { message: fe.reason })),
      // 409 충돌 → 최신본 재조회. 새 version·값은 위 시드 effect가 폼에 반영(refetch 중엔 canSubmit=false로 제출 차단).
      onReedit: () => {
        if (isEdit) void detail.refetch();
      },
    }),
    onSuccess: async () => {
      // 공개 부서 페이지가 사진·소개를 API에서 읽으므로 ISR 캐시를 즉시 무효화(updateTag server action).
      // 저장은 이미 끝났다 — 공개 캐시 갱신이 실패해도 저장 완료로 처리한다(다시 저장하면 낡은 version으로 충돌)
      try {
        await revalidateDepartments();
      } catch {
        notify.error("저장했지만 공개 화면에 반영되기까지 시간이 걸릴 수 있습니다.");
      }
      qc.invalidateQueries({ queryKey: adminKeys.list("departments") });
      notify.success("저장했습니다.");
      router.push(returnTo);
    },
  });

  return (
    <EditPageShell
      title={title}
      back={{ href: returnTo, label: backLabel }}
      formId={FORM_ID}
      dirty={isDirty || photosAdded > 0}
      submitting={mutation.isPending}
      canSubmit={canSubmit}
      onCancel={() => router.push(returnTo)}
      previewTitle="방문자에게 이렇게 보입니다"
      preview={preview}
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={handleSubmit((v) => {
          if (!canSubmit) return; // 시드 미완료 edit 제출 방지(disabled 우회 방어)
          mutation.mutate(v);
        })}
        className="flex flex-col gap-xxl"
      >
        <FormSection id="dept-basic" title="기본 정보" lead={NOT_PUBLIC_NOTE}>
          <Field id="dept-name" label="부서명" required>
            <Input id="dept-name" aria-required error={errors.name?.message} {...register("name")} />
          </Field>
          <Field id="dept-leader" label="담당" required={false}>
            <Input id="dept-leader" error={errors.leader?.message} {...register("leader")} />
          </Field>
        </FormSection>

        <FormSection id="dept-photos" title="사진">
          <Field label="대표 사진" required={false} help="부서 화면 맨 위와 부서 목록에 크게 보이는 사진입니다.">
            <Controller
              control={control}
              name="heroMediaId"
              render={({ field }) => (
                <div className="flex flex-wrap items-center gap-base">
                  {field.value !== null ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 관리 미리보기(공개 DeptHero와 같은 <img>)
                    <img
                      src={mediaSrc(field.value, heroPicked?.id === field.value ? heroPicked.url : undefined)}
                      alt="선택한 대표 사진"
                      className="aspect-video w-48 rounded-md border border-hairline object-cover"
                    />
                  ) : (
                    <span className={cn(typo.bodySm, "text-muted")}>기본 사진을 씁니다</span>
                  )}
                  <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
                    {field.value !== null ? "사진 바꾸기" : "사진 고르기"}
                  </Button>
                  {field.value !== null ? (
                    <Button type="button" variant="tertiary" onClick={() => field.onChange(null)}>
                      사진 빼기
                    </Button>
                  ) : null}
                  <MediaPicker
                    open={pickerOpen}
                    onOpenChange={setPickerOpen}
                    accept="image"
                    onConfirm={(ids, picked) => {
                      setHeroPicked(picked[0] ?? null);
                      field.onChange(ids[0] ?? field.value);
                    }}
                  />
                </div>
              )}
            />
          </Field>
          <Field label="활동 사진 앨범" required={false}>
            <Controller
              control={control}
              name="albumId"
              render={({ field }) => (
                <DeptAlbumField
                  deptName={nameValue}
                  value={field.value}
                  onChange={(id) => {
                    field.onChange(id);
                    // 만든 앨범에서 다른 앨범으로 옮겼으면 409 재시드 때 되살리지 않는다
                    if (id !== createdAlbumId.current) createdAlbumId.current = null;
                    setGalleryRequest((r) => r + 1);
                  }}
                  onPhotosAdded={(n) => {
                    setPhotosAdded((c) => c + n);
                    setGalleryRequest((r) => r + 1);
                  }}
                  onCreated={(id) => {
                    createdAlbumId.current = id;
                  }}
                />
              )}
            />
          </Field>
        </FormSection>

        <FormSection id="dept-intro" title="소개 글">
          <Field label="설명" required={false}>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <MarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                  id="dept-description"
                  rows={8}
                  error={errors.description?.message}
                />
              )}
            />
          </Field>
        </FormSection>

        <FormSection id="dept-order" title="목록에서의 자리" lead="자주 바꾸지 않는 설정입니다.">
          <div className="grid gap-lg sm:grid-cols-2 sm:gap-base">
            <Field id="dept-parent" label="상위 부서" required={false}>
              <Controller
                control={control}
                name="parentId"
                render={({ field }) => (
                  <select
                    id="dept-parent"
                    className={selectClass}
                    value={field.value === null ? "" : String(field.value)}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                  >
                    <option value="">(없음, 최상위 부서)</option>
                    {parentOptions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              />
            </Field>
            <Field id="dept-sortOrder" label="정렬 순서" required={false} help="숫자가 작을수록 앞에 나옵니다.">
              <Controller
                control={control}
                name="sortOrder"
                render={({ field }) => (
                  <Input
                    id="dept-sortOrder"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={field.value === null ? "" : String(field.value)}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                    error={errors.sortOrder?.message}
                    aria-describedby="dept-sortOrder-help"
                  />
                )}
              />
            </Field>
          </div>
        </FormSection>
      </form>
    </EditPageShell>
  );
}
