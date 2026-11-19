import type { Query, QueryClient, QueryKey } from "@tanstack/react-query";
import { useAuthStore } from "./authStore";

// 보는 사람(로그인 여부)에 따라 결과가 달라지는 콘텐츠 쿼리의 키 루트.
// 키 규약: 목록 [<복수 루트>, params], 상세 [<단수 루트>, id].
export const CONTENT_QUERY_ROOTS = [
  "sermons", "sermon", "albums", "album",
  "notices", "notice", "events", "event", "bulletins", "bulletin",
] as const;

const ROOTS: ReadonlySet<unknown> = new Set(CONTENT_QUERY_ROOTS);

export function isContentQueryKey(key: QueryKey): boolean {
  return ROOTS.has(key[0]);
}

// 응답의 서명 주소(?exp=&sig=)는 1시간 유효 — 화면을 오래 띄워 둔 뒤 탭으로 돌아오면 만료 전에 다시 받는다.
// 전역 refetchOnWindowFocus:false(탭 복귀 일괄 재요청 방지)는 유지하고, 50분 넘은 콘텐츠 쿼리만 예외.
// 다른 화면에 갔다 돌아오는 경우는 staleTime(60초) 뒤 마운트 재요청이 이미 맡는다.
const SIGNED_REFRESH_MS = 50 * 60_000;
export function refetchContentOnFocus(query: Query): boolean {
  return isContentQueryKey(query.queryKey) && Date.now() - query.state.dataUpdatedAt > SIGNED_REFRESH_MS;
}

const CONTENT_READ_PATH = /^\/api\/(notices|events|bulletins|sermons|gallery)(\/|\?|$)/;

// 공개 범위 설정을 따르는 5개 메뉴의 읽기 요청인가(authFetch의 익명 재요청·403 갱신 대상).
export function isContentReadRequest(path: string, init?: RequestInit): boolean {
  const method = (init?.method ?? "GET").toUpperCase();
  return method === "GET" && CONTENT_READ_PATH.test(path);
}

// 로그인 상태가 바뀌면(로그인·로그아웃·강제 로그아웃·persist 복원) 콘텐츠 쿼리를 초기화한다.
// 그대로 두면 방문자 때 받은 목록이 로그인 뒤 staleTime 동안 재사용돼 교인 전용 글이 조용히 빠지고,
// 로그아웃 뒤엔 교인용 목록이 남는다(스펙 6.6-10). access만 바뀌는 refresh는 보는 사람이 같으므로 유지.
// 로그아웃 쪽은 날아가던 쿼리를 건너뛴다: 토큰을 실어 보낸 콘텐츠 읽기는 authFetch가 익명으로 다시 받아
// 끝내는데, 여기서 초기화하면 그 요청을 버리고 같은 GET을 또 보내 공지·설교 조회수가 2 오른다.
export function subscribeContentReset(qc: QueryClient): () => void {
  return useAuthStore.subscribe((s, prev) => {
    if (!!s.accessToken === !!prev.accessToken) return;
    const loggedOut = !s.accessToken;
    void qc.resetQueries({
      predicate: (q) => isContentQueryKey(q.queryKey) && !(loggedOut && q.state.fetchStatus === "fetching"),
    });
  });
}
