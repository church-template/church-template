import { apiUrl } from "@/lib/auth/apiBase";
import { mediaSrc } from "@/lib/mediaUrl";
import type { Department, DeptPhoto } from "@/constants/departments";
import type { HeroMedia } from "@/hero/types";
import type {
  DepartmentCardResponse,
  DepartmentDetailResponse,
  DepartmentNode,
} from "./types";

// 부서 조회(공개, 인증 불필요) — 서버 컴포넌트 전용. revalidate 60 = main.ts와 동일 캐시 정책.
// tags 부착으로 관리 화면 저장 시 updateTag("departments") 즉시 무효화 연결.
export async function getDepartments(): Promise<DepartmentCardResponse[]> {
  const res = await fetch(apiUrl("/api/departments"), { next: { revalidate: 60, tags: ["departments"] } });
  if (!res.ok) {
    throw new Error(`GET /api/departments 실패: ${res.status}`);
  }
  // 비페이징 평배열(정렬 sortOrder,id는 서버 보장). null 방어.
  return ((await res.json()) as DepartmentCardResponse[] | null) ?? [];
}

export async function getDepartment(id: number): Promise<DepartmentDetailResponse | null> {
  const res = await fetch(apiUrl(`/api/departments/${id}`), {
    next: { revalidate: 60, tags: ["departments"] },
  });
  if (res.status === 404) {
    return null; // 미존재 → 페이지가 notFound()로 처리
  }
  if (!res.ok) {
    throw new Error(`GET /api/departments/${id} 실패: ${res.status}`);
  }
  return (await res.json()) as DepartmentDetailResponse;
}

const heroImage = (mediaId: number, name: string): HeroMedia => ({
  type: "image",
  src: mediaSrc(mediaId),
  alt: name,
});

// 공개 부서 페이지의 사진·소개 덮어쓰기. 상수에 backendId가 있고 API 값이 있을 때만 채운다 —
// 값이 비거나 조회가 실패하면 빈 객체 → 페이지는 지금 상수 그대로 보인다(백엔드 미반영·부서 미등록 대비).
export interface DepartmentOverrides {
  media?: HeroMedia;
  gallery?: DeptPhoto[];
  introMarkdown?: string; // description(raw 마크다운) — 소개 리드 자리를 대신한다
}

export async function getDepartmentOverrides(dept: Department): Promise<DepartmentOverrides> {
  if (dept.backendId == null) return {};
  let detail: DepartmentDetailResponse | null;
  try {
    detail = await getDepartment(dept.backendId);
  } catch {
    return {}; // 백엔드 장애가 공개 페이지를 깨지 않게 상수로 대체
  }
  if (!detail) return {};
  const overrides: DepartmentOverrides = {};
  if (detail.heroMediaId != null) overrides.media = heroImage(detail.heroMediaId, dept.name);
  if (detail.photos?.length) {
    overrides.gallery = detail.photos.map((mediaId, i) => ({
      src: mediaSrc(mediaId),
      alt: `${dept.name} 활동 사진 ${i + 1}`,
    }));
  }
  if (detail.description?.trim()) overrides.introMarkdown = detail.description;
  return overrides;
}

// 목록용 — backendId가 있는 부서만 heroMediaId로 대표 사진을 바꾼다. 연결된 부서가 없으면 fetch하지 않는다.
export async function withListHeroMedia(list: Department[]): Promise<Department[]> {
  if (!list.some((d) => d.backendId != null)) return list;
  let cards: DepartmentCardResponse[];
  try {
    cards = await getDepartments();
  } catch {
    return list;
  }
  const heroById = new Map(cards.map((c) => [c.id, c.heroMediaId ?? null]));
  return list.map((d) => {
    const mediaId = d.backendId != null ? heroById.get(d.backendId) : null;
    return mediaId != null ? { ...d, media: heroImage(mediaId, d.name) } : d;
  });
}

// 정렬 비교자 — 트리 조립·상세 자식 정렬 공용(서버 정렬 방어 + 트리 재정렬).
export const bySortOrder = (
  a: DepartmentCardResponse,
  b: DepartmentCardResponse,
): number => a.sortOrder - b.sortOrder || a.id - b.id;

// 평배열 → parentId 트리. 입력 불변(새 노드 생성). 부모 미존재(고아)는 루트로 승격.
export function buildDepartmentTree(
  list: DepartmentCardResponse[],
): DepartmentNode[] {
  const byId = new Map<number, DepartmentNode>();
  for (const d of list) {
    byId.set(d.id, { ...d, children: [] });
  }
  const roots: DepartmentNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId != null ? byId.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  for (const node of byId.values()) {
    node.children.sort(bySortOrder);
  }
  roots.sort(bySortOrder);
  return roots;
}
