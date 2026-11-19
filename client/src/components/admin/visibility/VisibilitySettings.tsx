"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { MEMBER_ACCESS_COPY, VISIBILITY_COPY, VISIBILITY_MENUS } from "@/constants/visibility";
import { fetchVisibility, updateVisibility } from "@/lib/api/visibility.admin";
import { revalidateVisibility } from "@/lib/admin/revalidate";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import type { VisibilityLevel, VisibilityMenu, VisibilityResponse } from "@/lib/api/types";
import { VisibilityConfirmDialog } from "./VisibilityConfirmDialog";

const LEVELS: VisibilityLevel[] = ["PUBLIC", "MEMBERS"];

// visibility-settings(DESIGN). 설정 화면은 60초 캐시가 아닌 지금 값을 읽어 폼을 시드한다.
// keyed 마운트로 저장 뒤 다시 읽은 값에 폼을 맞춘다(effect reset 금지 — SermonEditLoader 관례).
export function VisibilitySettings() {
  const query = useQuery({ queryKey: ["visibility"], queryFn: fetchVisibility, retry: false });
  if (query.isPending) return <p className={cn(typo.bodySm, "text-muted")}>{VISIBILITY_COPY.settingsLoading}</p>;
  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-base">
        <p className={cn(typo.bodyMd, "text-body")}>{VISIBILITY_COPY.settingsLoadError}</p>
        <Button variant="secondary" onClick={() => query.refetch()}>
          {MEMBER_ACCESS_COPY.retry}
        </Button>
      </div>
    );
  }
  return <VisibilityForm key={JSON.stringify(query.data)} saved={query.data} />;
}

function VisibilityForm({ saved }: { saved: VisibilityResponse }) {
  const qc = useQueryClient();
  const [values, setValues] = useState<VisibilityResponse>(saved);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 교인만 → 누구나로 여는 메뉴. 닫는 쪽(교인만으로)은 되돌리기 쉬워 확인창 없이 저장한다.
  const opened: VisibilityMenu[] = VISIBILITY_MENUS.filter(
    (m) => saved[m.key] === "MEMBERS" && values[m.key] === "PUBLIC",
  ).map((m) => m.key);

  const save = useMutation({
    mutationFn: () => updateVisibility(values),
    onError: adminOnError(),
    onSuccess: async () => {
      // 목록·홈·사이트맵·RSS 서버 캐시를 60초 기다리지 않고 지운다.
      // 실패해도 저장은 끝났다 → 로그만 남기고 성공 흐름을 잇는다(서버 캐시는 60초 뒤 스스로 만료된다).
      try {
        await revalidateVisibility();
      } catch (e) {
        console.error(e);
      }
      notify.success(VISIBILITY_COPY.saved);
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["visibility"] });
    },
  });

  const submit = () => (opened.length > 0 ? setConfirmOpen(true) : save.mutate());

  return (
    <div className="flex flex-col gap-xl">
      <div className="border-t-2 border-ink">
        {VISIBILITY_MENUS.map((m) => (
          <fieldset key={m.key} className="flex flex-col gap-xxs border-b border-hairline py-base">
            <legend className={cn(typo.titleMd, "mb-xxs text-ink")}>{m.label}</legend>
            <div className="flex flex-wrap gap-x-xl">
              {LEVELS.map((level) => (
                <label key={level} className={cn(typo.bodyMd, "flex min-h-12 cursor-pointer items-center gap-sm text-ink")}>
                  <input
                    type="radio"
                    name={`visibility-${m.key}`}
                    value={level}
                    checked={values[m.key] === level}
                    onChange={() => setValues({ ...values, [m.key]: level })}
                    className={cn(
                      "size-6 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-muted-soft bg-canvas",
                      "transition duration-150 ease-out hover:border-muted",
                      "checked:border-8 checked:border-primary",
                      "outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                    )}
                  />
                  {VISIBILITY_COPY.levelLabel[level]}
                </label>
              ))}
            </div>
            {m.perItem ? <p className={cn(typo.caption, "text-body")}>{VISIBILITY_COPY.perItemHint}</p> : null}
          </fieldset>
        ))}
      </div>
      <div className="flex justify-end gap-sm">
        <Button type="button" variant="secondary" onClick={() => setValues(saved)}>
          {VISIBILITY_COPY.cancel}
        </Button>
        <Button type="button" variant="primary" loading={save.isPending} onClick={submit}>
          {VISIBILITY_COPY.save}
        </Button>
      </div>
      <VisibilityConfirmDialog
        open={confirmOpen}
        opened={opened}
        pending={save.isPending}
        onConfirm={() => save.mutate()}
        onOpenChange={setConfirmOpen}
      />
    </div>
  );
}
