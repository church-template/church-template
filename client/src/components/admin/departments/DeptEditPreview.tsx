"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { findDepartmentByBackendId, thumbnailOf } from "@/constants/departments";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { ChangedBadge } from "@/components/admin/editor/ChangedBadge";
import { fetchAlbum } from "@/lib/api/gallery";
import { mediaSrc } from "@/lib/mediaUrl";
import { albumKey } from "./DeptAlbumField";
import { spacingPx } from "@/components/admin/editor/useFitAbove";

export interface DeptEditPreviewProps {
  backendId?: number;
  heroMediaId: number | null;
  heroPickedUrl?: string; // 방금 고른 사진의 서명 경로(저장 전엔 비공개)
  description: string;
  albumId: number | null;
  changed: { hero: boolean; description: boolean; album: boolean };
  /** 늘어날 때마다 활동 사진 구역으로 내린다(사용자가 앨범을 고르거나 사진을 넣었을 때). 첫 값은 기준이라 움직이지 않는다. */
  scrollRequest?: number;
}

const PREVIEW_PHOTOS = 4;

// dept-edit-preview(DESIGN, #33). 공개 부서 페이지가 API 값으로 바꾸는 구역만 그린다(getDepartmentOverrides와 같은 규칙):
// 대표 사진·소개(비면 상수 description)·활동 사진(앨범 사진이 없으면 상수 gallery). 부서명·담당은 공개 페이지가 상수에서 읽으므로 여기서도 상수 이름을 쓴다.
export function DeptEditPreview({ backendId, heroMediaId, heroPickedUrl, description, albumId, changed, scrollRequest = 0 }: DeptEditPreviewProps) {
  const dept = backendId != null ? findDepartmentByBackendId(backendId) : undefined;
  const album = useQuery({
    queryKey: albumKey(albumId ?? 0),
    queryFn: () => fetchAlbum(albumId as number),
    enabled: albumId !== null && !!dept,
    retry: false,
  });
  const photos = album.data?.photos ?? [];
  const settled = albumId === null || !album.isPending;
  useScrollToGallery(scrollRequest, settled ? `${albumId}:${photos.length}` : null);

  if (!dept) {
    return <p className={cn(typo.bodySm, "text-body")}>이 부서는 공개 소개 페이지가 없습니다.</p>;
  }

  const heroSrc = heroMediaId !== null ? mediaSrc(heroMediaId, heroPickedUrl) : thumbnailOf(dept.media);
  const lead = description.trim() || dept.description;
  // 공개 상세와 같은 규칙: 앨범 사진이 있으면 그것만, 없으면 상수 기본 사진
  const shown = photos.length
    ? photos.map((p, i) => ({ key: `m${p.id}`, src: mediaSrc(p.mediaId, p.url), alt: `${dept.name} 활동 사진 ${i + 1}` }))
    : (dept.gallery ?? []).map((g) => ({ key: g.src, src: g.src, alt: g.alt }));

  return (
    <div className="flex flex-col gap-lg">
      <PreviewBlock title="대표 사진" changed={changed.hero}>
        <div className="relative aspect-video overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- 관리 미리보기(서명 경로라 next/image 최적화 대상 아님) */}
          <img src={heroSrc} alt={`${dept.name} 대표 사진`} className="h-full w-full object-cover" />
          {/* 공개 히어로처럼 아래쪽 스크림 위에 부서명 */}
          <div className="scrim-bottom absolute inset-x-0 bottom-0 px-lg pt-xxl pb-base">
            <p className={cn(typo.displaySm, "text-on-dark")}>{dept.name}</p>
          </div>
        </div>
      </PreviewBlock>

      <PreviewBlock title="소개" changed={changed.description}>
        {lead ? <MarkdownContent source={lead} className="line-clamp-4" /> : <Hidden>소개 글이 없어 이 구역은 보이지 않습니다.</Hidden>}
      </PreviewBlock>

      <PreviewBlock title="활동 사진" changed={changed.album} scrollTarget>
        {!settled ? null : shown.length === 0 ? (
          <Hidden>
            {albumId === null
              ? "앨범을 연결하지 않아 부서 화면에 이 구역이 보이지 않습니다."
              : "앨범은 연결됐지만 사진이 없어 이 구역은 아직 보이지 않습니다. 사진을 넣으면 나타납니다."}
          </Hidden>
        ) : (
          <div className="rounded-xl bg-surface-soft p-base">
            {photos.length === 0 ? (
              <p className={cn(typo.caption, "mb-sm text-body")}>
                {albumId === null
                  ? "앨범을 연결하지 않아 기본 사진이 보입니다."
                  : "앨범에 사진이 없어 기본 사진이 보입니다. 사진을 넣으면 바뀝니다."}
              </p>
            ) : null}
            {/* 공개 dept-gallery와 같은 정사각 격자 */}
            <div className="grid grid-cols-4 gap-xs">
              {shown.slice(0, PREVIEW_PHOTOS).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element -- 관리 미리보기
                <img key={p.key} src={p.src} alt={p.alt} className="aspect-square w-full rounded-md object-cover" />
              ))}
            </div>
            {shown.length > PREVIEW_PHOTOS ? (
              <p className={cn(typo.caption, "mt-sm text-body")}>
                {`사진 ${shown.length}장 · 부서 화면에서는 8장씩 보이고 "사진 더 보기"로 더 엽니다.`}
              </p>
            ) : null}
          </div>
        )}
      </PreviewBlock>
    </div>
  );
}

function PreviewBlock({
  title,
  changed,
  scrollTarget = false,
  children,
}: {
  title: string;
  changed: boolean;
  scrollTarget?: boolean;
  children: ReactNode;
}) {
  return (
    <section data-preview-scroll-target={scrollTarget || undefined} className="flex flex-col gap-xs">
      <h3 className={cn(typo.bodySm, "font-semibold text-muted")}>
        {title}
        {changed ? <ChangedBadge /> : null}
      </h3>
      {children}
    </section>
  );
}

function Hidden({ children }: { children: ReactNode }) {
  return (
    <p className={cn(typo.bodySm, "rounded-xl border border-dashed border-muted-soft p-lg text-body")}>{children}</p>
  );
}

// 사용자가 앨범을 바꾸거나 사진을 넣으면(scrollRequest 증가), 사진을 다 불러온 뒤 미리보기 칸 안에서만 활동 사진 구역으로 내린다.
// 값 변화로 판단하지 않는다 — 수정 화면은 빈 값으로 먼저 그려지고 상세로 채워지는데, 그것까지 "변화"로 보면 열자마자 튄다.
// 페이지 전체는 스크롤하지 않는다.
function useScrollToGallery(request: number, settledSignature: string | null) {
  const done = useRef(request);
  useEffect(() => {
    if (request === done.current || settledSignature === null) return; // 요청 없음 / 앨범 불러오는 중
    done.current = request;
    const targets = document.querySelectorAll<HTMLElement>("[data-preview-scroll-target]");
    targets.forEach((el) => {
      const box = scrollParent(el);
      if (!box) return;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - spacingPx("base");
      box.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    });
  }, [request, settledSignature]);
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if (o === "auto" || o === "scroll") return p;
  }
  return null;
}
