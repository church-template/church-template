// 수정 화면에서 돌아갈 주소(?from=). 같은 사이트 경로만 받는다 — 외부 주소로 보내는 열린 리다이렉트 방지.
// 문자열 모양으로 거르지 않고 브라우저와 같은 규칙(URL 파서)으로 해석해 출처를 비교한다:
// "//host"·"/\host"는 물론, 파서가 지우는 탭·줄바꿈("/\t/host" → "//host")도 같은 방식으로 걸러진다.
// 점 경로는 정규화되며 "//"를 남길 수 있다("/a/..//host" → "//host") — 돌려줄 경로도 다시 확인한다.
const SAME = "http://same.invalid";

export function safeReturnPath(from: string | null | undefined, fallback: string): string {
  if (!from || !from.startsWith("/")) return fallback;
  try {
    const u = new URL(from, SAME);
    if (u.origin !== SAME || u.pathname.startsWith("//")) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
