"use client";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { TagFilter } from "@/components/common/TagFilter";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { MemberAccessNotice, accessNoticeReason } from "@/components/common/MemberGate";
import { MembersOnlyBanner, MembersOnlyToggle } from "@/components/visibility/MembersOnlyToggle";
import { usePickMode } from "@/components/visibility/pickMode";
import { GALLERY_PAGE_SIZE } from "@/lib/api/gallery";
import type { VisibilityLevel } from "@/lib/api/types";
import { useAlbums, useGalleryTags } from "./queries";
import { AlbumCard } from "./AlbumCard";
import { AlbumCardSkeleton } from "./AlbumCardSkeleton";

function toNum(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined; // NaN 방어
}

// 목록 클라이언트 — URL(?page·?tagId)을 쿼리로, TagFilter/Pagination은 Link 네비로 URL을 갱신.
// menuLevel: 메뉴 전체가 교인만이면 글 단위 버튼·배지를 숨기고 안내 한 줄(MembersOnlyBanner)만 —
// 버튼은 쓰는 사람이 그 줄의 링크로 고르기 모드(?pick=1)에 들어올 때만 보인다(#201).
export function AlbumList({ menuLevel }: { menuLevel: VisibilityLevel }) {
  const searchParams = useSearchParams();
  const page = toNum(searchParams.get("page")) ?? 0;
  const tagId = toNum(searchParams.get("tagId"));

  const pickMode = usePickMode("gallery", menuLevel);
  // 교인만 메뉴에서 글 단위 표시는 지금 아무것도 바꾸지 않는다 — 보이면 공개된 줄 안다(#201).
  const showToggle = menuLevel === "PUBLIC" || pickMode;
  const showBadge = menuLevel === "PUBLIC";

  const albums = useAlbums({ page, tagId });
  const tags = useGalleryTags();
  // 401/403 = 교인 전용(만료 세션·낡은 설정) → 오류 대신 게이트와 같은 안내
  const accessReason = accessNoticeReason(albums.error);

  return (
    <div className="mt-lg flex flex-col gap-base">
      <TagFilter tags={tags.data ?? []} />
      <MembersOnlyBanner menu="gallery" menuLevel={menuLevel} />

      {albums.isPending ? (
        <div className="grid gap-base sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: GALLERY_PAGE_SIZE }).map((_, i) => (
            <AlbumCardSkeleton key={i} />
          ))}
        </div>
      ) : accessReason ? (
        <MemberAccessNotice reason={accessReason} domainLabel="갤러리" />
      ) : albums.isError || !albums.data ? (
        <div className="flex flex-col items-start gap-sm py-xl">
          <p className={cn(typo.bodyMd, "text-muted")}>앨범을 불러오지 못했습니다.</p>
          <Button variant="secondary" onClick={() => albums.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : albums.data.content.length === 0 ? (
        <EmptyState message="등록된 앨범이 없습니다." className="mt-xl" />
      ) : (
        <>
          <div
            aria-busy={albums.isPlaceholderData}
            className={cn(
              "grid gap-base sm:grid-cols-2 lg:grid-cols-3",
              albums.isPlaceholderData && "opacity-60 transition-opacity",
            )}
          >
            {/* 카드 전체가 링크라 버튼은 카드 아래 형제로(중첩 인터랙티브 금지). version 없는 응답(구 백엔드)은 버튼 없음. */}
            {albums.data.content.map((a) => (
              <div key={a.id} className="flex flex-col gap-xs">
                <AlbumCard album={a} showBadge={showBadge} />
                {showToggle && a.version != null ? (
                  <MembersOnlyToggle
                    kind="album"
                    id={a.id}
                    title={a.title}
                    version={a.version}
                    membersOnly={!!a.membersOnly}
                    departmentLinked={a.departmentLinked}
                    pickMode={pickMode}
                  />
                ) : null}
              </div>
            ))}
          </div>
          {albums.data.page.totalPages > 1 ? (
            <div className="mt-xl">
              <Pagination page={albums.data.page} scroll={false} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
