import { apiUrl } from "@/lib/auth/apiBase";

// 미디어 주소 조립 단일 지점(church-backend#92). 비공개 미디어는 API가 서명 경로
// (`/api/media/{id}?exp=…&sig=…`, 교회 접두사 없음, 1시간 유효)를 내려 준다 → 고치지 않고 API 베이스 뒤에 붙인다.
// 칸 자체가 없을 때(undefined = 구 백엔드)만 지금처럼 무서명 주소로 조립한다.
export function mediaSrc(id: number | string, signedPath?: string): string {
  return apiUrl(signedPath ?? `/api/media/${id}`);
}
