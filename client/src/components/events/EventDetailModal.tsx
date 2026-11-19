"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/common/Skeleton";
import { EventDetailView } from "./EventDetailView";
import { EventDetailActions } from "./EventAdminActions";
import { MemberAccessNotice, accessNoticeReason, type AccessNoticeReason } from "@/components/common/MemberGate";
import { fetchEvent } from "@/lib/api/memberReads";
import { notify } from "@/lib/notify";
import { NEWS_LIST } from "@/constants/news";
import type { EventCardResponse, EventDetailResponse } from "@/lib/api/types";

// 칩 클릭 → 카드 데이터로 제목 즉시 표시 + description은 클라 조회.
// authFetch 경로(fetchEvent) — 교인만 메뉴에서도 토큰이 실리고, 비로그인이면 헤더 없이 공개 조회와 같다.
export function EventDetailModal({
  event,
  onClose,
}: {
  event: EventCardResponse | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<EventDetailResponse | null>(null);
  // 401/403(교인 전용)은 Toast 대신 모달 안 안내 — 어느 일정의 결과인지 id로 묶는다.
  const [denied, setDenied] = useState<{ id: number; reason: AccessNoticeReason } | null>(null);

  useEffect(() => {
    if (!event) return;
    let alive = true;
    fetchEvent(event.id)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const reason = accessNoticeReason(e);
        if (reason) setDenied({ id: event.id, reason });
        else notify.error(NEWS_LIST.eventLoadError);
      });
    return () => {
      alive = false;
    };
  }, [event]);

  // 동기 setState(effect) 없이 표시 여부를 파생 — 이전 이벤트 데이터가 남아도 id 불일치면 Skeleton.
  const shown = detail && event && detail.id === event.id ? detail : null;
  const deniedReason = denied && event && denied.id === event.id ? denied.reason : null;

  return (
    <Dialog
      open={event != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {event ? (
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>{event.title}</DialogTitle>
          {shown ? (
            <>
              <EventDetailView event={shown} signed />
              {/* onClose: 수정·삭제 완료 후 모달을 닫는다 — 옛 데이터가 열린 채 남지 않도록. */}
              <EventDetailActions event={shown} onClose={onClose} />
            </>
          ) : deniedReason ? (
            <MemberAccessNotice reason={deniedReason} domainLabel={NEWS_LIST.eventTitle} />
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
