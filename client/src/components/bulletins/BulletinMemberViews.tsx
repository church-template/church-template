"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { NEWS_LIST } from "@/constants/news";
import { MemberQueryFallback } from "@/components/common/MemberGate";
import { useBulletin, useBulletins } from "./queries";
import { BulletinListView } from "./BulletinListView";
import { BulletinForm } from "./BulletinForm";

const LABEL = NEWS_LIST.bulletinTitle;

// 교인만 메뉴의 주보 목록(MemberGate 안) — 서버 목록과 같은 표시 컴포넌트, PDF는 응답의 서명 주소.
export function BulletinListClient({ page }: { page?: number }) {
  const q = useBulletins({ page });
  const [now] = useState(() => new Date()); // "이번 주" 판정 기준 — 렌더마다 바뀌지 않게 마운트 시 고정
  if (q.isPending || q.isError || !q.data) {
    return <MemberQueryFallback query={q} domainLabel={LABEL} loadError={NEWS_LIST.bulletinLoadError} />;
  }
  return <BulletinListView data={q.data} page={page} now={now} signed />;
}

// 수정 화면 시드 — 설정과 무관하게 브라우저에서 읽는다. version을 key에 넣어 409 뒤 최신 version으로 다시 마운트.
export function BulletinEditLoader({ id }: { id: number }) {
  const q = useBulletin(id);
  if (q.isPending || q.isError || !q.data) {
    return (
      <MemberQueryFallback
        query={q}
        domainLabel={LABEL}
        loadError={NEWS_LIST.bulletinLoadError}
        pending={<p className={cn(typo.bodySm, "text-muted")}>{NEWS_LIST.loading}</p>}
      />
    );
  }
  return <BulletinForm key={`${q.data.id}-${q.data.version}`} mode="edit" initial={q.data} />;
}
