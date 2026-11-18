import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { formatDate } from "@/lib/date";
import { apiUrl } from "@/lib/auth/apiBase";
import { mediaSrc } from "@/lib/mediaUrl";
import type { GalleryAlbumCardResponse } from "@/lib/api/types";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-xl";

// 앨범 카드 — 16:9 썸네일(첫 사진, 없으면 플레이스홀더) + 제목 + 메타. department-card 호버 재사용.
// 썸네일 주소: thumbnailUrl 칸이 있으면 그 값(null = 썸네일 없음), 칸이 없으면(구 백엔드) thumbnailMediaId로 조립.
function thumbnailSrc(album: GalleryAlbumCardResponse): string | null {
  if (album.thumbnailUrl !== undefined) return album.thumbnailUrl === null ? null : apiUrl(album.thumbnailUrl);
  return album.thumbnailMediaId != null ? mediaSrc(album.thumbnailMediaId) : null;
}

export function AlbumCard({ album }: { album: GalleryAlbumCardResponse }) {
  const thumb = thumbnailSrc(album);
  return (
    <Link href={`/gallery/albums/${album.id}`} className={cn("block", focusRing)}>
      <Card bordered interactive className="group h-full">
        {/* fill 모드는 부모 relative 필수(next/image 규약) */}
        <div className="relative aspect-video overflow-hidden">
          {thumb !== null ? (
            // 서명 주소는 next/image 최적화 불가(remotePatterns의 URL 패턴이 쿼리스트링을 막고, 31일 최적화 캐시가 만료 뒤에도 내줄 수 있음) → unoptimized
            <Image
              src={thumb}
              unoptimized={album.thumbnailUrl != null}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-strong">
              <ImageOff size={32} className="text-muted" aria-hidden />
            </div>
          )}
        </div>
        <div className="p-xl">
          <h3 className={cn(typo.titleMd, "text-ink")}>{album.title}</h3>
          <p className={cn(typo.datetime, "mt-xxs text-muted")}>
            {formatDate(album.createdAt)} · 사진 {album.photoCount}장
            {album.author ? ` · ${album.author}` : ""}
          </p>
          {album.tags.length > 0 ? (
            <div className="mt-sm flex flex-wrap gap-xs">
              {album.tags.map((t) => (
                <Badge key={t.id}>{t.name}</Badge>
              ))}
            </div>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
