import { mediaSrc } from "@/lib/mediaUrl";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { parseYouTubeId } from "./youtube";

// 경계 안전: media:42 뒤에 숫자가 이어지면 매칭 안 함(420/421 오탐 방지) — 서버 추적 규약과 동일.
const MEDIA_REF = /media:(\d+)(?!\d)/g;
// 이미지 문법 전체(![alt](media:42 …)) — 서명 맵에 없는 id의 이미지를 통째로 지울 때 쓴다.
const MEDIA_IMAGE = /!\[[^\]]*\]\(\s*media:(\d+)(?!\d)[^)]*\)/g;

// 마크다운이 생성하는 태그만 허용. 저자 작성 raw HTML(<div>·<iframe> 등)은 태그가 제거되고(내용은 보존),
// <script>·이벤트 핸들러는 통째 제거된다 → 가이드 5.1 "raw HTML 비허용" + 이슈 §7 "raw HTML 제거" 충족.
const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
  "strong", "em", "del", "blockquote", "ul", "ol", "li",
  "a", "img", "code", "pre", "table", "thead", "tbody", "tr", "th", "td",
];
const ALLOWED_ATTR = ["href", "title", "src", "alt"];

export type MarkdownSegment =
  | { type: "markdown"; source: string }
  | { type: "youtube"; url: string; label: string | null };

// 문단 전체가 유튜브 링크 하나일 때만 임베드 대상 — 문장 속 인라인 링크는 링크로 남긴다(글 흐름 보존).
function youtubeBlock(block: string): { url: string; label: string | null } | null {
  const link = block.match(/^\[([^\]]*)\]\((\S+)\)$/); // [라벨](URL) 단독 문단
  if (link) {
    return parseYouTubeId(link[2]) ? { url: link[2], label: link[1].trim() || null } : null;
  }
  const bare = block.match(/^<?(https?:\/\/\S+?)>?$/); // 맨 URL 또는 <URL> 단독 문단
  return bare && parseYouTubeId(bare[1]) ? { url: bare[1], label: null } : null;
}

// 본문을 [마크다운, 유튜브, 마크다운…] 세그먼트로 분할 — MarkdownContent가 유튜브만 임베드로 렌더.
export function splitYouTubeSegments(raw: string | null | undefined): MarkdownSegment[] {
  if (!raw) return [];
  const segments: MarkdownSegment[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length > 0) {
      segments.push({ type: "markdown", source: buf.join("\n\n") });
      buf = [];
    }
  };
  for (const block of raw.split(/(?:\r?\n){2,}/)) {
    const yt = youtubeBlock(block.trim());
    if (yt) {
      flush();
      segments.push({ type: "youtube", ...yt });
    } else {
      buf.push(block);
    }
  }
  flush();
  return segments;
}

// 본문의 모든 media:{id} → 무서명 경로 맵. 편집 미리보기가 서명 맵과 합쳐 "없는 id = 무서명"으로 쓸 때 사용.
export function unsignedMediaUrls(raw: string): Record<string, string> {
  return Object.fromEntries([...raw.matchAll(MEDIA_REF)].map(([, id]) => [id, `/api/media/${id}`]));
}

// mediaUrls: media:{id} → 서명 경로 맵(갤러리 앨범 설명 `mediaUrls`, church-backend#92 확정 형태 Record<string,string>).
// - 미지정: 기존처럼 무서명 /api/media/{id}(공지·행사·부서 본문은 공개).
// - 지정: 맵에 없는 id는 열 수 없는 미디어 → 그 이미지는 렌더하지 않는다(링크·단독 토큰은 무서명으로 둔다).
export function renderMarkdown(raw: string | null | undefined, mediaUrls?: Record<string, string>): string {
  if (!raw) return ""; // 서버가 본문 없음을 null로 내려준다(설교 content 등) — replace 크래시 방어
  const kept = mediaUrls
    ? raw.replace(MEDIA_IMAGE, (img, id: string) => (Object.hasOwn(mediaUrls, id) ? img : ""))
    : raw;
  // 1) media:{id} → URL. API 베이스(교회 접두사 포함)를 거쳐야 백엔드를 향한다 — 상대경로로 두면 프론트 도메인을 향한다.
  const withUrls = kept.replace(MEDIA_REF, (_, id: string) =>
    mediaSrc(id, mediaUrls && Object.hasOwn(mediaUrls, id) ? mediaUrls[id] : undefined),
  );
  const html = marked.parse(withUrls, { async: false }) as string;        // 2) MD → HTML
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });        // 3) 마크다운 태그만 허용(raw HTML 제거)
}
