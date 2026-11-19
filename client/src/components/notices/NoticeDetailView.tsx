import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { NoticeDetailActions } from "./NoticeAdminActions";
import type { NoticeDetailResponse } from "@/lib/api/types";

// 공지 상세 본문 — 서버 렌더(누구나)와 브라우저 조회(교인만)가 같이 쓴다(훅 없음). isPinned 배지·클릭 태그 필터.
// signed(브라우저 조회 = 교인만)면 본문 이미지를 응답의 서명 주소 맵으로 — 교인만 공지의 무서명 /api/media/{id}는 404(스펙 6.2).
// 서버 렌더(누구나)는 넘기지 않는다: 캐시된 HTML에 1시간짜리 서명을 굽지 않게(누구나 공지라 무서명이 늘 열린다).
export function NoticeDetailView({ notice, signed = false }: { notice: NoticeDetailResponse; signed?: boolean }) {
  return (
    <>
      <Link
        href="/notices"
        className={cn(typo.bodySm, "inline-flex items-center gap-xxs text-primary")}
      >
        <ChevronLeft size={16} aria-hidden />
        공지 목록
      </Link>

      {notice.isPinned ? (
        <div className="mt-lg">
          <Badge variant="primary">고정</Badge>
        </div>
      ) : null}

      <h1 className={cn(typo.titleLg, "text-ink", notice.isPinned ? "mt-xs" : "mt-lg")}>
        {notice.title}
      </h1>
      <NoticeDetailActions id={notice.id} version={notice.version} isPinned={notice.isPinned} />

      <p className={cn(typo.datetime, "mt-xs text-muted")}>
        {`${formatDate(notice.createdAt)} · 조회 ${notice.viewCount.toLocaleString("ko-KR")}`}
        {notice.author ? ` · ${notice.author}` : ""}
      </p>

      {notice.tags.length > 0 ? (
        <div className="mt-base flex flex-wrap gap-xs">
          {notice.tags.map((t) => (
            <Link key={t.id} href={`/notices?tagId=${t.id}`}>
              <Badge>{t.name}</Badge>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-lg border-t border-hairline" />
      <MarkdownContent source={notice.content} mediaUrls={signed ? notice.mediaUrls : undefined} className="mt-lg" />
    </>
  );
}
