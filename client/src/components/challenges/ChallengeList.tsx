"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { locate, formatRange } from "@/constants/bible";
import { formatDate } from "@/lib/date";
import { useChallenge, useChallenges, useMyParticipations, useMyProgress } from "./queries";
import { STATUS_LABELS } from "./ChallengeDetail";
import type { ChallengeCardResponse } from "@/lib/api/types";

// challenge-feature-card(DESIGN.md): 매일 오는 사람은 클릭 한 번으로 대시보드 도달(스펙 §1).
export function ChallengeList() {
  const sp = useSearchParams();
  const pageParam = Number(sp.get("page") ?? "1");
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : 0;

  const list = useChallenges({ page });
  // 참여 이력 50건까지 스캔(연 단위 챌린지 기준 수십 년 커버) — 초과 시 피처 미표시로 열화될 뿐 오표시는 없음.
  const parts = useMyParticipations(0, true, 50);

  // 피처 판별(스펙 §3): 목록 응답엔 joined가 없어 참여 이력에서 ONGOING 참여를 찾는다.
  const joinedOngoing = parts.data?.content.find((p) => p.challenge.status === "ONGOING");
  const listOngoing = list.data?.content.find((c) => c.status === "ONGOING");
  const featured = joinedOngoing?.challenge ?? (listOngoing ? { id: listOngoing.id, title: listOngoing.title } : null);
  const progress = useMyProgress(joinedOngoing?.challenge.id ?? 0, joinedOngoing != null);
  // startBook은 목록 페이지에서 찾지 않는다(참여 챌린지가 다른 페이지에 있으면 창세기로 오판) — 상세에서 직접 조회.
  // 상세 진입 시 ["challenge", id] 캐시를 그대로 재사용하므로 낭비 없음.
  const featuredDetail = useChallenge(joinedOngoing?.challenge.id ?? 0, joinedOngoing != null);

  if (list.isPending || parts.isPending) {
    return (
      <div className="mt-xl flex flex-col gap-lg" aria-hidden>
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (list.isError || !list.data) {
    return <p className={cn(typo.bodyMd, "mt-xl text-muted")}>목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>;
  }

  const cards = list.data.content;
  const nextPos = progress.data && featuredDetail.data
    ? locate(
        featuredDetail.data.startBook,
        Math.min(progress.data.chaptersRead + 1, progress.data.totalChapters),
      )
    : null;

  return (
    <div className="mt-xl flex flex-col gap-lg">
      {featured ? (
        <section className="rounded-xl bg-surface-dark p-xl text-center">
          <p className={cn(typo.bodySm, "text-on-dark-soft")}>진행 중인 챌린지</p>
          <p className={cn(typo.titleLg, "mt-xs text-on-dark")}>{featured.title}</p>
          {joinedOngoing && progress.data && nextPos ? (
            <p className={cn(typo.bodyMd, "mt-sm text-on-dark-soft")}>
              오늘은 {nextPos.book} {nextPos.chapter}장부터 · {Math.round(progress.data.progressRate)}% 진행
            </p>
          ) : null}
          <Link
            href={`/challenges/${featured.id}`}
            className={cn(buttonVariants("primary"), "mt-lg inline-flex h-14 items-center px-xl")}
          >
            {joinedOngoing ? "오늘 기록하러 가기" : "참여하러 가기"}
          </Link>
        </section>
      ) : null}

      {cards.length === 0 ? (
        <EmptyState message="등록된 챌린지가 없습니다." />
      ) : (
        <ul className="mt-lg border-t-2 border-ink">
          {cards.map((c) => <ChallengeRow key={c.id} challenge={c} />)}
        </ul>
      )}
      {list.data.page.totalPages > 1 ? <Pagination page={list.data.page} /> : null}
    </div>
  );
}

// 줄 목록 행(month-list-row 결) — 기간을 왼쪽 칸에 세로로 세워 비교하기 쉽게, 행 전체가 상세 링크(#178).
function ChallengeRow({ challenge: c }: { challenge: ChallengeCardResponse }) {
  return (
    <li className="border-b border-hairline">
      <Link
        href={`/challenges/${c.id}`}
        className={cn(
          "group grid gap-xxs px-xxs py-md md:grid-cols-4 md:items-baseline md:gap-lg",
          "rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        <span className={cn(typo.datetime, "text-muted")}>
          {formatDate(c.startDate)}
          <br />~ {formatDate(c.endDate)}
        </span>
        <span className="md:col-span-2">
          <span className="flex flex-wrap items-center gap-xs">
            <Badge variant={c.status === "ONGOING" ? "primary" : "default"}>{STATUS_LABELS[c.status]}</Badge>
            <span className={cn(typo.titleMd, "text-ink transition-colors group-hover:text-primary")}>{c.title}</span>
          </span>
          <span className={cn(typo.bodySm, "mt-xxs block text-body")}>
            {formatRange(c.startBook, c.endBook)} · 총 {c.totalChapters}장
          </span>
        </span>
        <span className={cn(typo.bodySm, "text-body md:text-right")}>하루 {c.dailyGoal}장</span>
      </Link>
    </li>
  );
}
