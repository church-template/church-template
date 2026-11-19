import { apiUrl } from "@/lib/auth/apiBase";
import { VISIBILITY_FALLBACK, VISIBILITY_MENUS } from "@/constants/visibility";
import type { VisibilityLevel, VisibilityResponse } from "./types";

// 메뉴별 공개 범위 읽기 — 서버 컴포넌트용(authFetch import 금지: authStore 체인이 서버 번들에 들어간다).
// 공개 GET이라 토큰 없이 읽는다. 태그 visibility(60초) — 저장 직후엔 revalidateVisibility()가 즉시 지운다.
export async function getVisibility(): Promise<VisibilityResponse | null> {
  try {
    // 3초 타임아웃: 백엔드가 멈추면 설정을 읽는 모든 페이지가 같이 멈춘다 → 끊고 지금 동작(null)으로.
    // Next는 200 응답만 Data Cache에 쓰므로 끊긴 요청은 실패로 캐시되지 않는다(다음 요청이 다시 읽는다).
    // signal을 달면 한 렌더 안 자동 중복 제거(memoization)는 빠지지만 Data Cache(60초)는 그대로다(04-functions/fetch.md).
    const res = await fetch(apiUrl("/api/visibility"), {
      next: { revalidate: 60, tags: ["visibility"] },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`GET /api/visibility 실패: ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    // 외부 데이터 검증: 5칸 모두 PUBLIC|MEMBERS가 아니면 믿지 않는다(모르는 값을 '누구나'로 오해하지 않게).
    const valid = VISIBILITY_MENUS.every((m) => data[m.key] === "PUBLIC" || data[m.key] === "MEMBERS");
    if (!valid) throw new Error(`GET /api/visibility 응답 형식 오류: ${JSON.stringify(data)}`);
    return data as VisibilityResponse;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// 설정을 못 읽으면 지금 동작(6.6-12). 백엔드의 행 누락 기본값과 다르다 — 실패 시 닫힌 쪽.
export function resolveVisibility(v: VisibilityResponse | null): VisibilityResponse {
  return v ?? VISIBILITY_FALLBACK;
}

// 교인만인 공지·일정·주보의 목록 주소 — robots 차단·sitemap 제외 공용.
// 설교·갤러리(글 단위 표시가 있는 메뉴)는 설정과 무관하게 늘 막으므로 여기서 다루지 않는다(스펙 6.3).
export function membersOnlyListPaths(levels: VisibilityResponse): string[] {
  return VISIBILITY_MENUS.filter((m) => !m.perItem && levels[m.key] === "MEMBERS").map((m) => m.href);
}

// 서버 조회가 받은 "교인 전용" 신호(401 INVALID_TOKEN·403 ACCESS_DENIED). 들고 있는 설정이 낡은 동안
// 오류 화면 대신 게이트 경로로 그리게 페이지가 이 오류를 가른다.
export class MembersOnlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembersOnlyError";
  }
}

const MEMBERS_ONLY_CODES = new Set(["INVALID_TOKEN", "ACCESS_DENIED"]);

// 분기는 errorCode로만 한다. 본문이 JSON이 아니거나 읽을 수 없으면 통과(호출부의 일반 오류로).
export async function throwIfMembersOnly(res: Response): Promise<void> {
  let errorCode: unknown;
  try {
    errorCode = ((await res.json()) as { errorCode?: unknown } | null)?.errorCode;
  } catch {
    return;
  }
  if (typeof errorCode === "string" && MEMBERS_ONLY_CODES.has(errorCode)) {
    throw new MembersOnlyError(`${res.url || "콘텐츠"} 교인 전용: ${errorCode}`);
  }
}

export function isMembersOnlyError(e: unknown): e is MembersOnlyError {
  return e instanceof MembersOnlyError;
}

// 공지·일정·주보 페이지의 서버 조회 분기(목록·상세·generateMetadata 공용). null = 게이트 + 브라우저 조회 경로.
// 교인만이면 서버는 읽지 않는다(공지 상세의 조회수 부수효과도 없게). 누구나인데 401/403이면 설정이 낡은 것 —
// 오류 화면 대신 같은 게이트 경로로 그린다(6.6-12). 그 밖의 오류는 지금처럼 던진다.
// 결과를 { data }로 감싸는 이유: 상세 조회의 404(null)를 게이트 경로와 구분하려고.
export async function loadPublic<T>(level: VisibilityLevel, load: () => Promise<T>): Promise<{ data: T } | null> {
  if (level === "MEMBERS") return null;
  try {
    return { data: await load() };
  } catch (e) {
    if (isMembersOnlyError(e)) return null;
    throw e;
  }
}
