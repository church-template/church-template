import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { VisibilityStatusLink } from "@/components/visibility/VisibilityStatusLink";
import { getVisibility, resolveVisibility } from "@/lib/api/visibility";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { MemberGate } from "@/components/common/MemberGate";
import { AlbumList } from "@/components/gallery/AlbumList";
import { AlbumListAction } from "@/components/gallery/GalleryAdminActions";

export const metadata: Metadata = {
  title: "갤러리",
  // 설정과 무관하게 색인 차단(스펙 6.3 — 설교·갤러리는 검색 노출 불필요). robots.txt 차단과 이중 방어.
  robots: { index: false, follow: false },
};

// 갤러리. 메뉴가 교인만이면 게이트가 권한을 선판단하고, 누구나면 게이트 없이 그린다(교인만 앨범은
// 백엔드가 목록에서 뺀다). AlbumList가 useSearchParams로 page·tagId를 읽어 TanStack Query로 조회한다.
// useSearchParams 때문에 Suspense 경계 필요.
export default async function GalleryPage() {
  // 빌드 시(백엔드 없음) 폴백 결과가 굳지 않게 요청 시점에 설정을 읽는다(홈과 같은 방식).
  await connection();
  const visibility = await getVisibility();
  const levels = resolveVisibility(visibility);
  const list = <AlbumList menuLevel={levels.gallery} />;
  return (
    <Container as="section" className="py-section">
      {/* 등록 버튼은 공지·일정처럼 제목 행에 — 필터 행에 두면 알약이 폭을 나눠 써 일찍 줄바꿈된다. */}
      <div className="flex items-center justify-between gap-base">
        <div className="flex flex-wrap items-center gap-x-base">
          <h1 className={cn(typo.displayMd, "text-ink")}>갤러리</h1>
          <VisibilityStatusLink level={visibility ? visibility.gallery : null} />
        </div>
        <AlbumListAction />
      </div>
      <Suspense fallback={null}>
        {levels.gallery === "MEMBERS" ? (
          <MemberGate permission="GALLERY_VIEW" domainLabel="갤러리">
            {list}
          </MemberGate>
        ) : (
          list
        )}
      </Suspense>
    </Container>
  );
}
