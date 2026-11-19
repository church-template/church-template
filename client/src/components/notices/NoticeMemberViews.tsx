"use client";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { NEWS_LIST } from "@/constants/news";
import { DetailSkeleton } from "@/components/common/DetailSkeleton";
import { MemberQueryFallback } from "@/components/common/MemberGate";
import type { NoticeListParams } from "@/lib/api/notices";
import type { TagResponse } from "@/lib/api/types";
import { useNotice, useNotices } from "./queries";
import { NoticeListView } from "./NoticeListView";
import { NoticeDetailView } from "./NoticeDetailView";
import { NoticeForm } from "./NoticeForm";

const LABEL = NEWS_LIST.noticeTitle;

// 교인만 메뉴의 공지 목록(MemberGate 안) — 서버 목록과 같은 표시 컴포넌트를 쓴다.
// 401/403(낡은 설정으로 게이트를 지난 경우)은 게이트와 같은 안내.
export function NoticeListClient({ params, tags }: { params: NoticeListParams; tags: TagResponse[] }) {
  const q = useNotices(params);
  if (q.isPending || q.isError || !q.data) {
    return <MemberQueryFallback query={q} domainLabel={LABEL} loadError={NEWS_LIST.noticeLoadError} />;
  }
  return <NoticeListView data={q.data} tags={tags} />;
}

export function NoticeDetailClient({ id }: { id: number }) {
  const q = useNotice(id);
  if (q.isPending || q.isError || !q.data) {
    return (
      <MemberQueryFallback
        query={q}
        domainLabel={LABEL}
        loadError={NEWS_LIST.noticeLoadError}
        pending={<DetailSkeleton />}
      />
    );
  }
  return <NoticeDetailView notice={q.data} signed />;
}

// 수정 화면 시드 — 설정과 무관하게 브라우저에서 읽는다(교인만이면 서버가 못 읽는다). version을 key에 넣어
// 409 뒤 상세 쿼리를 무효화하면 최신 version으로 폼이 다시 마운트된다(effect reset 금지 — SermonEditLoader 관례).
export function NoticeEditLoader({ id }: { id: number }) {
  const q = useNotice(id);
  if (q.isPending || q.isError || !q.data) {
    return (
      <MemberQueryFallback
        query={q}
        domainLabel={LABEL}
        loadError={NEWS_LIST.noticeLoadError}
        pending={<p className={cn(typo.bodySm, "text-muted")}>{NEWS_LIST.loading}</p>}
      />
    );
  }
  return <NoticeForm key={`${q.data.id}-${q.data.version}`} mode="edit" initial={q.data} />;
}
