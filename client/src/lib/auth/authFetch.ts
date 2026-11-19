import { apiUrl } from "./apiBase";
import { useAuthStore } from "./authStore";
import { isContentReadRequest } from "./contentQueries";

// 동시 401들이 refresh를 1회만 호출하도록 공유 프로미스로 큐잉.
let refreshing: Promise<string> | null = null;

// 403 때문에 갱신해 본 access 토큰(갱신 전 토큰 + 갱신해 받은 토큰). 같은 토큰으로 또 403이면 갱신해도
// 권한이 그대로라 건너뛴다 — 권한이 정말 없는 교인이 403마다 refresh를 부르지 않게.
// ponytail: 세션 동안 토큰 수만큼 자란다(403 갱신 1회당 2개), 커지면 마지막 몇 개만 남긴다.
const deniedTokens = new Set<string>();

// access를 새로 발급(access만 갱신). 실패 시 forceLogout 후 reject.
async function refresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  const r = await fetch(apiUrl("/api/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!r.ok) {
    useAuthStore.getState().forceLogout(); // 401 INVALID_TOKEN
    throw new Error("refresh failed");
  }
  const { tokens } = await r.json();
  useAuthStore.getState().setAccessToken(tokens.accessToken);
  return tokens.accessToken as string;
}

// path는 항상 "/api/..." path만. 항상 Response를 반환(HTTP status로 throw 안 함, 네트워크 오류만 throw).
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = apiUrl(path);
  // 토큰이 없으면 헤더 자체를 넣지 않는다 — 빈 "Bearer "는 백엔드의 무효 토큰 401 규칙과 부딪힌다.
  const withAuth = (token: string | null): RequestInit =>
    token ? { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } } : init;

  const sent = useAuthStore.getState().accessToken;
  const contentRead = isContentReadRequest(path, init);
  // 세션을 살리지 못하면 토큰을 보냈던 콘텐츠 읽기만 익명으로 한 번 더 — 만료 세션이 공개 목록까지 잃지 않게.
  // 쓰기·/api/members/me 등은 원래 응답 그대로(스펙 6.6-11).
  const fallback = (r: Response): Promise<Response> =>
    sent && contentRead ? fetch(url, withAuth(null)) : Promise.resolve(r);

  const res = await fetch(url, withAuth(sent));
  if (res.status !== 401 && res.status !== 403) {
    // 응답이 오기 전에 로그아웃됐으면 교인용 응답을 버리고 익명으로 다시 받는다. 로그아웃 때 콘텐츠 쿼리 초기화가
    // 날아가던 쿼리를 건너뛰므로(subscribeContentReset), 그 결과는 여기서 방문자용이 된다.
    return useAuthStore.getState().accessToken ? res : fallback(res);
  }

  const { errorCode } = await res
    .clone()
    .json()
    .catch(() => ({}) as { errorCode?: string });

  if (res.status === 403) {
    // 배포 직후 토큰에 새 조회 권한이 없을 수 있어 콘텐츠 읽기만 한 번 갱신해 본다(6.6-4).
    // 재요청이 또 403이면 그대로 돌려준다(루프 없음).
    if (errorCode !== "ACCESS_DENIED" || !contentRead || !sent || !useAuthStore.getState().refreshToken) {
      return res;
    }
    if (deniedTokens.has(sent) && !refreshing) {
      // 이미 갱신해 본 토큰. 그 사이 토큰이 바뀌었으면(늦게 온 동시 요청) 지금 토큰으로 한 번만, 아니면 그대로.
      const current = useAuthStore.getState().accessToken;
      return current && current !== sent ? fetch(url, withAuth(current)) : res;
    }
    // 갱신 중이면 아래에서 그 결과를 나눠 쓴다(refresh 추가 호출 없음).
    deniedTokens.add(sent);
  } else {
    // INVALID_TOKEN만 refresh 대상. AUTHENTICATION_FAILED 등은 그대로 반환.
    if (errorCode !== "INVALID_TOKEN") return res;
    // refreshToken이 없으면(비로그인·hydration 전) refresh 시도하지 않음.
    if (!useAuthStore.getState().refreshToken) {
      useAuthStore.getState().forceLogout();
      return fallback(res);
    }
  }

  refreshing ??= refresh().finally(() => {
    refreshing = null;
  });

  try {
    const fresh = await refreshing;
    if (res.status === 403) deniedTokens.add(fresh); // 방금 받은 토큰은 지금 권한을 담고 있다 — 또 403이면 갱신 무의미
    return await fetch(url, withAuth(fresh)); // 원요청 재시도
  } catch {
    // refresh 실패: forceLogout은 refresh() 내부에서 1회 수행됨.
    return fallback(res);
  }
}
