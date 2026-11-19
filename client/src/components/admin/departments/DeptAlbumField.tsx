"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Globe, ImagePlus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Field } from "@/components/admin/editor/Field";
import { fetchAlbum, fetchAlbums } from "@/lib/api/gallery";
import { addPhotos, createAlbum } from "@/lib/api/gallery.admin";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { useHasPermission } from "@/lib/auth/useMe";
import { mediaSrc } from "@/lib/mediaUrl";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/actionButton";
import { VISIBILITY_COPY } from "@/constants/visibility";

export interface DeptAlbumFieldProps {
  deptName: string; // 새 앨범 이름 기본값용
  value: number | null;
  onChange: (id: number | null) => void;
  onPhotosAdded: (count: number) => void; // 저장 막대의 "바꾼 것 있음"과 미리보기 표시용
  onCreated?: (id: number) => void; // 이번에 만든 앨범 — 409 재시드 뒤에도 연결을 유지하려고 폼이 기억한다
}

// 부서 수정 select와 같은 키 — 앨범 목록 캐시를 한 번만 받는다. ponytail: 앨범이 100개를 넘으면 검색형 선택으로.
export const ALBUM_OPTIONS_KEY = ["albums", { size: 100 }] as const;
export const albumKey = (id: number) => ["album", id] as const; // gallery/queries.ts useAlbum과 같은 키
const THUMBS = 4;

const selectClass = cn(
  typo.bodyMd,
  "h-12 w-full rounded-md border border-muted-soft bg-canvas px-4 text-ink hover:border-muted",
  "outline-hidden focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
);

// dept-album-field(DESIGN, #33). 앨범이 없으면 갤러리로 떠나지 않고 여기서 만들어 바로 고르고, 사진도 여기서 넣는다.
// 만들기·사진 넣기는 누르는 즉시 서버에 반영된다(부서와의 연결만 부서 저장 때 반영).
export function DeptAlbumField({ deptName, value, onChange, onPhotosAdded, onCreated }: DeptAlbumFieldProps) {
  const qc = useQueryClient();
  const canWrite = useHasPermission("GALLERY_WRITE");
  const [createOpen, setCreateOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const albums = useQuery({
    queryKey: ALBUM_OPTIONS_KEY,
    queryFn: () => fetchAlbums({ size: 100 }),
    retry: false,
  });
  const album = useQuery({
    queryKey: albumKey(value ?? 0),
    queryFn: () => fetchAlbum(value as number),
    enabled: value !== null,
    retry: false,
  });
  const options = albums.data?.content ?? [];
  const isEmpty = albums.isSuccess && options.length === 0 && value === null;

  const add = useMutation({
    mutationFn: (ids: number[]) => addPhotos(value as number, ids),
    onError: adminOnError(),
    onSuccess: (_res, ids) => {
      qc.invalidateQueries({ queryKey: albumKey(value as number) });
      qc.invalidateQueries({ queryKey: ["albums"] }); // 갤러리 목록 썸네일·장수
      onPhotosAdded(ids.length);
      notify.success(`사진 ${ids.length}장을 넣었습니다.`);
    },
  });

  const createButton = canWrite ? (
    <Button type="button" variant={isEmpty ? "secondary" : "tertiary"} onClick={() => setCreateOpen(true)}>
      <Plus size={20} aria-hidden />
      새 앨범 만들기
    </Button>
  ) : null;

  const photos = album.data?.photos ?? [];

  return (
    <div className="flex flex-col gap-sm">
      {isEmpty ? (
        <div className="flex flex-col items-start gap-base rounded-md border border-dashed border-muted-soft p-lg">
          <p className={cn(typo.bodySm, "text-body")}>
            아직 만든 앨범이 없습니다. 앨범을 만들어 연결하면 부서 화면에 활동 사진 구역이 생깁니다.
          </p>
          {createButton}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-sm">
            <select
              aria-label="활동 사진 앨범 선택"
              aria-describedby="dept-album-help"
              className={cn(selectClass, "min-w-0 flex-1 basis-56")}
              value={value === null ? "" : String(value)}
              onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">(연결 안 함)</option>
              {/* 목록에 없는 현재 값(권한·개수 제한)도 옵션으로 남겨 저장 시 지워지지 않게 한다 */}
              {value !== null && !options.some((a) => a.id === value) ? (
                <option value={value}>{`현재 앨범 #${value}`}</option>
              ) : null}
              {/* 교인만 앨범은 부서에 연결할 수 없다 — 부서 소개는 누구에게나 사진을 보인다(스펙 6.2) */}
              {options.map((a) => (
                <option key={a.id} value={a.id} disabled={!!a.membersOnly}>
                  {a.membersOnly ? `${a.title}${VISIBILITY_COPY.deptOptionSuffix}` : a.title}
                </option>
              ))}
            </select>
            {createButton}
          </div>
          <p id="dept-album-help" className={cn(typo.caption, "text-body")}>
            부서 화면의 활동 사진 구역에 보이는 사진 묶음입니다.
          </p>
        </>
      )}

      {value !== null ? (
        <>
          <div className="grid grid-cols-2 items-center gap-sm rounded-md border border-hairline p-base sm:flex sm:flex-wrap">
            {photos.length ? (
              <div className="col-span-2 flex gap-xxs">
                {photos.slice(0, THUMBS).map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element -- 관리 썸네일(서명 경로라 next/image 최적화 대상 아님)
                  <img key={p.id} src={mediaSrc(p.mediaId, p.url)} alt="" className="size-14 rounded-sm object-cover" />
                ))}
              </div>
            ) : null}
            <span className={cn(typo.bodyMd, "col-span-2 text-ink sm:col-span-1 sm:mr-auto")}>
              {photos.length ? `사진 ${photos.length}장` : "아직 사진이 없습니다."}
            </span>
            {canWrite ? (
              <Button
                type="button"
                variant={photos.length ? "tertiary" : "secondary"}
                className="justify-start"
                loading={add.isPending}
                onClick={() => setPickerOpen(true)}
              >
                <ImagePlus size={20} aria-hidden />
                사진 넣기
              </Button>
            ) : null}
            <a
              href={`/gallery/albums/${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(typo.button, "inline-flex min-h-12 items-center gap-xs rounded-sm text-primary hover:text-primary-active")}
            >
              <ExternalLink size={20} aria-hidden />
              앨범 열기<span className="sr-only">(새 탭)</span>
            </a>
          </div>
          <p className={cn(typo.bodySm, "flex gap-xs text-ink")}>
            <Globe size={20} aria-hidden className="mt-xxs shrink-0 text-body" />
            연결한 앨범의 사진은 지금 있는 것과 나중에 넣는 것 모두 누구에게나 공개됩니다. 대표 사진도 공개됩니다.
          </p>
          {canWrite ? (
            <MediaPicker
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              accept="image"
              multiple
              onConfirm={(ids) => {
                if (ids.length) add.mutate(ids);
              }}
            />
          ) : null}
        </>
      ) : null}

      {canWrite ? (
        <CreateAlbumDialog
          // 열 때마다 새로 마운트 — 부서 이름은 상세가 도착한 뒤에야 정해지므로 열 때의 이름에서 시작한다
          key={createOpen ? "open" : "closed"}
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultTitle={deptName.trim() ? `${deptName.trim()} 활동 사진` : "활동 사진"}
          onCreated={(id) => {
            onChange(id);
            onCreated?.(id);
            qc.invalidateQueries({ queryKey: ["albums"] });
          }}
        />
      ) : null}
    </div>
  );
}

// 이름 하나만 받는 작은 창. 부모가 부서 <form> 안이라 여기선 form을 쓰지 않는다 —
// portal이어도 React submit 이벤트는 부모 폼으로 올라가 부서 저장이 같이 실행된다.
function CreateAlbumDialog({
  open,
  onOpenChange,
  defaultTitle,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTitle: string;
  onCreated: (id: number) => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [error, setError] = useState<string | undefined>();
  const create = useMutation({
    mutationFn: (t: string) => createAlbum({ title: t }),
    onError: adminOnError(), // 실패해도 창·입력은 그대로 — 다시 누르면 된다
    onSuccess: (res) => {
      notify.success("앨범을 만들어 연결했습니다.");
      onCreated(res.id);
      onOpenChange(false);
    },
  });
  const submit = () => {
    if (create.isPending) return; // Enter를 빨리 두 번 눌러도 앨범은 하나만(버튼은 loading으로 막히지만 Enter 경로는 아님)
    const t = title.trim();
    if (!t) {
      setError("앨범 이름을 입력해 주세요.");
      return;
    }
    setError(undefined);
    create.mutate(t);
  };

  return (
    // 만드는 중에는 닫지 않는다 — 닫은 뒤 늦게 끝난 응답이 그사이 고른 다른 앨범을 덮어쓰지 않게
    <Dialog open={open} onOpenChange={(v) => (v || !create.isPending ? onOpenChange(v) : undefined)}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>새 앨범 만들기</DialogTitle>
        </DialogHeader>
        <Field id="new-album-title" label="앨범 이름" required help="만들면 바로 이 부서에 선택됩니다. 부서 수정을 취소해도 앨범은 남습니다.">
          <Input
            id="new-album-title"
            aria-required
            value={title}
            error={error}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              // 한글 조합 중 Enter는 글자 확정용 — 이때 만들면 마지막 글자가 빠진 이름이 된다
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault(); // 부서 폼 제출 방지
                submit();
              }
            }}
          />
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">{ACTION.cancel.label}</Button>
          </DialogClose>
          <Button type="button" variant="primary" loading={create.isPending} onClick={submit}>
            만들고 연결
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
