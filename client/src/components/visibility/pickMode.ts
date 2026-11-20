"use client";
import { useSearchParams } from "next/navigation";
import { useHasPermission } from "@/lib/auth/useMe";
import { VISIBILITY_MENUS } from "@/constants/visibility";
import type { VisibilityLevel } from "@/lib/api/types";

// 고르기 모드(#201) = 메뉴가 교인만 + 그 메뉴를 쓰는 사람 + 주소에 ?pick=1.
// 그 밖의 pick=1은 아무 일도 하지 않는다(권한 없는 교인·누구나 메뉴는 늘 보던 화면 그대로).
export function usePickMode(menu: "sermons" | "gallery", menuLevel: VisibilityLevel): boolean {
  const writePermission = VISIBILITY_MENUS.find((m) => m.key === menu)?.writePermission ?? "";
  const canWrite = useHasPermission(writePermission);
  const pick = useSearchParams().get("pick") === "1";
  return menuLevel === "MEMBERS" && canWrite && pick;
}
