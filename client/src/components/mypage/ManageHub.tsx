"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { useMe } from "@/lib/auth/useMe";
import { hasPermission } from "@/lib/auth/permissions";
import { MANAGE_DOMAINS, visibleManageGroups, type ManageDomain } from "@/lib/admin/manageDomains";
import { listInquiries } from "@/lib/api/inquiries.admin";
import { adminKeys } from "@/lib/admin/queryKeys";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export const MANAGE_SECTION_ID = "mypage-manage";
export const manageCategoryId = (key: string) => `mypage-manage-${key}`;

// "최근에 연 관리" — 이 기기에만 남긴다(서버 불필요). 기억해서 찾기보다 눈으로 알아보기가 쉽다.
const RECENT_KEY = "mypage:recent-manage";
const RECENT_MAX = 4;
function readRecent(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return []; // 저장소 차단·깨진 값이면 최근 목록 없이 동작
  }
}
function pushRecent(key: string) {
  try {
    const next = [key, ...readRecent().filter((k) => k !== key)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* 저장 실패는 기능 저하일 뿐 — 이동은 계속 */
  }
}

// 마이페이지 관리 허브: 보유 권한 도메인만, 찾기 칸 + 최근에 연 관리 + 분류별 2열 줄 목록.
// 관리 권한 0이면 섹션 비노출. 카드 0개인 분류는 제목째 숨긴다.
export function ManageHub() {
  const { data: me, isLoading } = useMe();
  const [query, setQuery] = useState("");
  // 클라이언트 전용 쿼리(useMe) 뒤에만 렌더되므로 SSR 불일치 없이 초기값으로 읽는다.
  const [recent] = useState(readRecent);
  const canInquiry = hasPermission("INQUIRY_MANAGE", me);
  const inquiryParams = { completed: false, page: 0, size: 1 };
  // 미처리 문의 건수 — 목록 쿼리키 규약(listAll prefix)을 따라 문의 처리 시 함께 무효화된다.
  const pending = useQuery({
    queryKey: adminKeys.list("inquiries", inquiryParams),
    queryFn: () => listInquiries(inquiryParams),
    enabled: canInquiry,
    retry: false,
  });

  if (isLoading) return null;
  const groups = visibleManageGroups(me);
  if (groups.length === 0) return null;

  const pendingCount = pending.data?.page.totalElements ?? 0;
  const countOf = (d: ManageDomain) => (d.key === "inquiries" ? pendingCount : 0);
  const q = query.trim();
  const match = (d: ManageDomain) => !q || d.label.includes(q) || d.desc.includes(q);
  const shown = groups.map((g) => ({ ...g, domains: g.domains.filter(match) })).filter((g) => g.domains.length > 0);
  const allowed = new Set(groups.flatMap((g) => g.domains.map((d) => d.key)));
  const recentDomains = recent
    .filter((k) => allowed.has(k))
    .map((k) => MANAGE_DOMAINS.find((d) => d.key === k))
    .filter((d) => d != null);

  return (
    <section id={MANAGE_SECTION_ID} className="scroll-mt-section">
      <h2 className={cn(typo.titleLg, "text-ink")}>관리</h2>
      <div className="relative mt-md">
        <Search size={22} aria-hidden className="pointer-events-none absolute top-1/2 left-base -translate-y-1/2 text-muted" />
        <Input
          variant="searchPill"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="무엇을 관리할까요? 예: 주보, 회원"
          aria-label="관리 메뉴 찾기"
          className={cn(typo.bodyMd, "h-14 w-full pl-12")}
        />
      </div>

      {!q && recentDomains.length > 0 ? (
        <div className="mt-lg">
          <p className={cn(typo.captionStrong, "text-muted")}>최근에 연 관리</p>
          <ul className="mt-sm flex flex-wrap gap-sm">
            {recentDomains.map((d) => (
              <li key={d.key}>
                <Link
                  href={d.href}
                  onClick={() => pushRecent(d.key)}
                  className={cn(
                    typo.titleSm,
                    "flex min-h-14 items-center gap-sm rounded-lg border border-hairline py-xs pr-md pl-sm text-ink transition-colors hover:border-primary",
                  )}
                >
                  <IconPlate d={d} small />
                  {d.label}
                  <CountBadge count={countOf(d)} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className={cn(typo.bodyMd, "mt-xl text-muted")} role="status">
          찾는 관리 메뉴가 없어요. 다른 낱말로 찾아보세요.
        </p>
      ) : (
        shown.map((g) => (
          <div key={g.cat.key} id={manageCategoryId(g.cat.key)} className="mt-xl scroll-mt-section">
            <h3 className={cn(typo.titleSm, "border-b-2 border-ink pb-sm text-ink")}>{g.cat.label}</h3>
            <ul className="grid grid-cols-1 gap-x-xl md:grid-cols-2">
              {g.domains.map((d) => (
                <li key={d.key} className="border-b border-hairline">
                  <Link href={d.href} onClick={() => pushRecent(d.key)} className="group flex items-center gap-base py-base">
                    <IconPlate d={d} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn(typo.titleMd, "flex items-center gap-sm text-ink transition-colors group-hover:text-primary")}>
                        {d.label}
                        <CountBadge count={countOf(d)} />
                      </span>
                      <span className={cn(typo.bodySm, "text-muted")}>{d.desc}</span>
                    </span>
                    <ChevronRight size={24} aria-hidden className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

// 회원·권한은 회색 플레이트 — 실수하면 피해가 큰 메뉴라 다른 메뉴와 거리를 둔다(단일 액센트 절제).
function IconPlate({ d, small = false }: { d: ManageDomain; small?: boolean }) {
  const careful = d.category === "governance";
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        small ? "size-9" : "size-10",
        careful ? "bg-surface-strong text-body" : "bg-primary-soft text-primary",
      )}
    >
      <d.Icon size={small ? 18 : 20} />
    </span>
  );
}

function CountBadge({ count }: { count: number }) {
  return count > 0 ? (
    <Badge variant="primary" aria-label={`미처리 ${count}건`}>
      {count}
    </Badge>
  ) : null;
}
