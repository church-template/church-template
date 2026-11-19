"use client";
import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { useAuthStore, useHasHydrated } from "@/lib/auth/authStore";
import { useMe } from "@/lib/auth/useMe";
import { hasPermission } from "@/lib/auth/permissions";
import { sanitizeNext } from "@/lib/auth/nextParam";
import { ApiError } from "@/lib/auth/apiError";
import { MEMBER_ACCESS_COPY } from "@/constants/visibility";

export interface MemberGateProps {
  /** 필요 권한 문자열(가이드 2.1 — roles·직분 아님) */
  permission: string;
  /** 안내 문구의 도메인 자리 — "갤러리"·"설교" */
  domainLabel: string;
  /** 하이드레이션·me 로딩 중 표시(기본: 카드 그리드 스켈레톤) */
  skeleton?: ReactNode;
  children: ReactNode;
}

// 교인 전용 게이트(가이드 2.3, 교인만인 메뉴 5개 공용). 권한 없으면 children을 마운트하지 않아 API 호출 0회.
// 분기 순서 중요: useMe는 enabled:!!accessToken이라 비로그인 시 isPending이 영구 true →
// !accessToken을 isPending보다 먼저 평가한다(아니면 비로그인에게 Skeleton이 영구 노출).
export function MemberGate({ permission, domainLabel, skeleton, children }: MemberGateProps) {
  const pathname = usePathname();
  const hydrated = useHasHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: me, isPending, isError, refetch } = useMe();

  const pending = skeleton ?? <GateSkeleton />;

  // persist 하이드레이션 전 첫 페인트에서 토큰이 null로 보여 로그인 안내가 깜빡이는 것 방지.
  if (!hydrated) return <>{pending}</>;

  if (!accessToken) return <AccessNotice reason="login" domainLabel={domainLabel} pathname={pathname} />;
  if (isPending) return <>{pending}</>;
  if (isError || !me) {
    return (
      <GateNotice
        title="정보를 불러오지 못했습니다"
        body="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="secondary" onClick={() => refetch()}>
            다시 시도
          </Button>
        }
      />
    );
  }
  if (!hasPermission(permission, me)) {
    return <AccessNotice reason="approval" domainLabel={domainLabel} pathname={pathname} />;
  }
  return <>{children}</>;
}

export type AccessNoticeReason = "login" | "approval";

// 조회가 받은 401/403을 게이트와 같은 안내로 바꾼다(교인 전용 글 상세, 낡은 설정으로 게이트를 지난 경우).
// 분기는 errorCode로만 한다.
export function accessNoticeReason(error: unknown): AccessNoticeReason | null {
  if (!(error instanceof ApiError)) return null;
  if (error.errorCode === "INVALID_TOKEN") return "login";
  if (error.errorCode === "ACCESS_DENIED") return "approval";
  return null;
}

export function MemberAccessNotice({ reason, domainLabel }: { reason: AccessNoticeReason; domainLabel: string }) {
  const pathname = usePathname();
  return <AccessNotice reason={reason} domainLabel={domainLabel} pathname={pathname} />;
}

// 게이트 안 브라우저 조회(공지·일정·주보)의 성공 전 화면 — 불러오는 중 / 교인 전용 안내(401·403) / 다시 시도.
// 호출부는 isPending·isError·data 없음일 때만 이걸 그린다.
export function MemberQueryFallback({
  query,
  domainLabel,
  loadError,
  pending,
}: {
  query: { isPending: boolean; error: unknown; refetch: () => unknown };
  domainLabel: string;
  loadError: string;
  pending?: ReactNode;
}) {
  if (query.isPending) return <>{pending ?? <GateSkeleton />}</>;
  const reason = accessNoticeReason(query.error);
  if (reason) return <MemberAccessNotice reason={reason} domainLabel={domainLabel} />;
  return (
    <GateNotice
      title={loadError}
      body={MEMBER_ACCESS_COPY.retryBody}
      action={
        <Button variant="secondary" onClick={() => query.refetch()}>
          {MEMBER_ACCESS_COPY.retry}
        </Button>
      }
    />
  );
}

function AccessNotice({
  reason,
  domainLabel,
  pathname,
}: {
  reason: AccessNoticeReason;
  domainLabel: string;
  pathname: string | null;
}) {
  if (reason === "approval") {
    return (
      <GateNotice title={MEMBER_ACCESS_COPY.approvalTitle} body={MEMBER_ACCESS_COPY.approvalBody(domainLabel)} />
    );
  }
  return (
    <GateNotice
      title={MEMBER_ACCESS_COPY.loginTitle}
      body={MEMBER_ACCESS_COPY.loginBody(domainLabel)}
      action={
        <Link
          href={`/login?next=${encodeURIComponent(sanitizeNext(pathname))}`}
          className={buttonVariants("primary")}
        >
          {MEMBER_ACCESS_COPY.loginAction}
        </Link>
      }
    />
  );
}

function GateSkeleton() {
  return (
    <div data-testid="member-gate-skeleton" className="mt-xl grid gap-base sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-xl" />
      ))}
    </div>
  );
}

function GateNotice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div role="status" className="mt-xl flex flex-col items-center gap-sm py-xxl text-center">
      <p className={cn(typo.titleMd, "text-ink")}>{title}</p>
      <p className={cn(typo.bodyMd, "text-muted")}>{body}</p>
      {action ? <div className="mt-sm">{action}</div> : null}
    </div>
  );
}
