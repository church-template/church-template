// 부서 등록·수정 폼의 순수 변환(DepartmentFormDialog에서 옮김, #33). 컴포넌트와 분리해 두면 화면이 바뀌어도 그대로 쓴다.
import { buildDepartmentTree } from "@/lib/api/departments";
import type { DepartmentCreateRequest, DepartmentUpdateRequest } from "@/lib/api/departments.admin";
import type { DepartmentCardResponse, DepartmentDetailResponse } from "@/lib/api/types";
import { collectDescendantIds, findNode } from "./treeUtils";
import type { DepartmentFormValues } from "./schema";

export const EMPTY_DEPARTMENT: DepartmentFormValues = {
  name: "",
  description: "",
  leader: "",
  parentId: null,
  sortOrder: null,
  heroMediaId: null,
  albumId: null,
};

// POST·PUT 공용 body. 선택 빈값은 전송 제외. parentId는 null 그대로(PUT 루트화 의미 보존).
// sortOrder 생략(=DTO null)은 백엔드에서 create=max+10·PUT=기존 유지로 동일 처리(api-docs §부서).
// heroMediaId·albumId는 항상 싣는다. 백엔드 규칙(church-backend#92): 생략=유지, null=비움, 숫자=설정 —
// 폼이 두 칸을 직접 편집하므로 현재 값(비운 경우 null)을 명시한다. 생략해도 지워지진 않는다.
export function toRequestBody(
  v: DepartmentFormValues,
): DepartmentCreateRequest & Pick<DepartmentUpdateRequest, "heroMediaId" | "albumId"> {
  const opt = (s: string) => (s.trim() === "" ? undefined : s);
  return {
    name: v.name,
    description: opt(v.description),
    leader: opt(v.leader),
    parentId: v.parentId,
    sortOrder: v.sortOrder ?? undefined,
    heroMediaId: v.heroMediaId,
    albumId: v.albumId,
  };
}

export function seedValues(d: DepartmentDetailResponse): DepartmentFormValues {
  return {
    name: d.name,
    description: d.description ?? "",
    leader: d.leader ?? "",
    parentId: d.parentId,
    sortOrder: d.sortOrder,
    // 백엔드 반영 전엔 칸이 없다 → null(지금도 연결된 사진이 없으므로 잃을 값 없음)
    heroMediaId: d.heroMediaId ?? null,
    albumId: d.albumId ?? null,
  };
}

// 상위 select 옵션 — edit 시 자기 자신 + 모든 하위 제외(순환 방지), create는 전체. 목록 기준 계산(시드 상세와 무관).
export function parentOptionsFor(
  departments: DepartmentCardResponse[],
  mode: "create" | "edit",
  editId: number | undefined,
): DepartmentCardResponse[] {
  if (mode === "edit" && editId != null) {
    const self = findNode(buildDepartmentTree(departments), editId);
    const excluded = self ? collectDescendantIds(self) : new Set<number>();
    excluded.add(editId);
    return departments.filter((d) => !excluded.has(d.id));
  }
  return departments;
}
