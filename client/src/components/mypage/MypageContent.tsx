"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import { signOut } from "@/lib/auth/authApi";
import { useAuthStore } from "@/lib/auth/authStore";
import { useMe, useHasPermission } from "@/lib/auth/useMe";
import { Activity, Search, Settings, User } from "lucide-react";
import { visibleManageGroups } from "@/lib/admin/manageDomains";
import { useMyParticipations } from "@/components/challenges/queries";
import { useVehicleRuns } from "@/components/vehicles/queries";
import { ApiError } from "@/lib/auth/apiError";
import { Container } from "@/components/shell/Container";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { Reveal } from "@/components/main/Reveal";
import { ProfileCard } from "./ProfileCard";
import { PasswordChangeSection } from "./PasswordChangeSection";
import { AgreementStatus } from "./AgreementStatus";
import { WithdrawDialog } from "./WithdrawDialog";
import { ManageHub, MANAGE_SECTION_ID, manageCategoryId } from "./ManageHub";
import { MyChallengeHistory } from "./MyChallengeHistory";
import { MyVehicleBoardings } from "./MyVehicleBoardings";
import { MypageNav, type MypageNavItem } from "./MypageNav";

const PROFILE_ID = "mypage-profile";
const ACTIVITY_ID = "mypage-activity";
const ACCOUNT_ID = "mypage-account";

export function MypageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const { data: me, isPending, isError, error, refetch } = useMe();

  // 진입 가드: 회원 영역 — member·token 둘 중 하나라도 없으면 로그인으로(복귀 경로 유지).
  // token만 없는 경우 useMe가 enabled:false로 무한 로딩되는 것을 함께 차단. 마운트 1회만.
  useEffect(() => {
    const s = useAuthStore.getState();
    if (!s.member || !s.accessToken) router.replace("/login?next=/mypage");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // /me가 인증 실패(401/403)로 떨어지면 라이브 세션이 죽은 것(DB 초기화·서버측 토큰 회수 등).
  // authFetch는 INVALID_TOKEN만 자동 정리하므로, 그 외 인증 실패로 persist된 member 스냅샷이
  // 남아 에러 화면에 갇히는 것을 self-heal: 세션을 비우고 로그인으로 보낸다.
  const sessionDead =
    isError && error instanceof ApiError && (error.status === 401 || error.status === 403);
  useEffect(() => {
    if (!sessionDead) return;
    useAuthStore.getState().clear();
    queryClient.removeQueries({ queryKey: ["me"] });
    router.replace("/login?next=/mypage");
    // router·queryClient는 실 런타임에서 안정 — sessionDead 전이 시 1회만 실행(가드 effect와 동일 패턴).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionDead]);

  const onLogout = async () => {
    setLoggingOut(true);
    await signOut(); // 멱등 — 서버 실패여도 로컬 세션은 정리됨(T5)
    queryClient.removeQueries({ queryKey: ["me"] }); // ['me'] 캐시 제거는 호출측 책임
    notify.success("로그아웃되었습니다.");
    router.replace("/");
  };

  // 내 활동·관리는 권한·데이터가 있을 때만 보인다 — 메뉴에도 보이는 섹션만 싣는다.
  // 자식 컴포넌트와 같은 쿼리키라 요청은 한 번만 나간다(TanStack 캐시 공유).
  const canChallenge = useHasPermission("CHALLENGE_PARTICIPATE");
  const canVehicle = useHasPermission("VEHICLE_APPLY");
  const parts = useMyParticipations(0, canChallenge);
  const runs = useVehicleRuns(0, canVehicle);
  const hasActivity =
    (canChallenge && (parts.data?.content.length ?? 0) > 0) ||
    (canVehicle && (runs.data?.content.some((r) => r.myRequest != null) ?? false));
  const manageGroups = visibleManageGroups(me);

  const navItems: MypageNavItem[] = [
    { id: PROFILE_ID, label: "내 정보", Icon: User },
    ...(hasActivity ? [{ id: ACTIVITY_ID, label: "내 활동", Icon: Activity }] : []),
    ...(manageGroups.length > 0
      ? [
          { id: MANAGE_SECTION_ID, label: "관리 찾기", Icon: Search },
          ...manageGroups.map((g, i) => ({
            id: manageCategoryId(g.cat.key),
            label: g.cat.label,
            Icon: g.cat.Icon,
            heading: i === 0 ? "관리 분류" : undefined,
          })),
        ]
      : []),
    { id: ACCOUNT_ID, label: "계정", Icon: Settings },
  ];

  return (
    <Container as="section" className="py-section">
      <div className="w-full">
        <h1 className={cn(typo.displayMd, "text-ink")}>마이페이지</h1>

        {isPending ? (
          <div className="mt-xl flex flex-col gap-lg" aria-hidden>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : isError || !me ? (
          <div className="mt-xl flex flex-col items-start gap-sm">
            <p className={cn(typo.bodySm, "text-muted")}>정보를 불러오지 못했습니다.</p>
            <div className="flex items-center gap-sm">
              <Button variant="secondary" onClick={() => refetch()}>다시 시도</Button>
              {/* 세션이 죽었거나 복구 안 돼도 빠져나갈 수 있는 탈출구 — 에러 화면에 갇히지 않게 */}
              {/* 로그아웃은 파괴적 액션이 아니므로 secondary 사용 */}
              <Button variant="secondary" loading={loggingOut} onClick={onLogout}>로그아웃</Button>
            </div>
          </div>
        ) : (
          // 좌 메뉴 3 : 우 본문 9(<64rem은 한 칸 + 상단 칩). 긴 관리 목록에서도 지금 위치를 알고 바로 건너뛰게(#169).
          <div className="lg:mt-xl lg:grid lg:grid-cols-12 lg:gap-xxl">
            <MypageNav items={navItems} />
            <div className="mt-xl flex min-w-0 flex-col gap-xxl lg:col-span-9 lg:mt-0">
              <div id={PROFILE_ID} className="scroll-mt-section">
                <Reveal><ProfileCard me={me} /></Reveal>
              </div>
              {hasActivity ? (
                <section id={ACTIVITY_ID} className="scroll-mt-section">
                  <h2 className={cn(typo.titleLg, "text-ink")}>내 활동</h2>
                  <div className="mt-md grid grid-cols-1 gap-lg xl:grid-cols-2">
                    <MyChallengeHistory delay={120} />
                    <MyVehicleBoardings delay={150} />
                  </div>
                </section>
              ) : null}
              <ManageHub />
              <section id={ACCOUNT_ID} className="scroll-mt-section">
                <h2 className={cn(typo.titleLg, "text-ink")}>계정</h2>
                {/* 비밀번호·약관을 한 '계정' 카드로 묶어 산만함 제거 */}
                <div className="mt-md flex flex-col gap-lg rounded-xl border border-hairline bg-surface-card p-xl">
                  <PasswordChangeSection />
                  <AgreementStatus me={me} />
                </div>
                <div className="mt-lg flex items-center justify-between gap-md">
                  <WithdrawDialog />
                  {/* 로그아웃은 파괴적 액션이 아니므로 secondary 사용 */}
                  <Button variant="secondary" loading={loggingOut} onClick={onLogout}>로그아웃</Button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
