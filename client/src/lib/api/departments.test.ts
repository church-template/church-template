import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getDepartments,
  getDepartment,
  buildDepartmentTree,
  bySortOrder,
  getDepartmentOverrides,
  withListHeroMedia,
} from "./departments";
import { DEPARTMENTS, type Department } from "@/constants/departments";
import type { DepartmentCardResponse } from "./types";

afterEach(() => vi.unstubAllGlobals());

const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

const card = (over: Partial<DepartmentCardResponse>): DepartmentCardResponse => ({
  id: 1, name: "부서", leader: "", parentId: null, sortOrder: 0, ...over,
});

describe("getDepartments", () => {
  it("'/api/departments'를 revalidate 60 + departments 태그로 호출한다", async () => {
    const spy = vi.fn(async () => okJson([]));
    vi.stubGlobal("fetch", spy);
    await getDepartments();
    expect(spy).toHaveBeenCalledWith("/api/departments", { next: { revalidate: 60, tags: ["departments"] } });
  });

  it("null 응답은 빈 배열로 방어한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson(null)));
    expect(await getDepartments()).toEqual([]);
  });

  it("비 200이면 throw한다(error.tsx 위임)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(getDepartments()).rejects.toThrow("GET /api/departments 실패: 500");
  });
});

describe("getDepartment", () => {
  it("상세를 반환한다", async () => {
    const detail = { ...card({ id: 7, name: "청년부" }), description: "본문", createdAt: "", updatedAt: "", version: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => okJson(detail)));
    expect(await getDepartment(7)).toMatchObject({ id: 7, name: "청년부", description: "본문" });
  });

  it("404는 null을 반환한다(미존재)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as Response));
    expect(await getDepartment(999)).toBeNull();
  });

  it("그 외 비 200은 throw한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(getDepartment(7)).rejects.toThrow("GET /api/departments/7 실패: 500");
  });
});

describe("buildDepartmentTree", () => {
  it("parentId로 자식을 중첩하고 sortOrder,id로 정렬한다", () => {
    const list = [
      card({ id: 1, name: "교회학교", sortOrder: 1 }),
      card({ id: 3, name: "초등부", parentId: 1, sortOrder: 2 }),
      card({ id: 2, name: "유치부", parentId: 1, sortOrder: 1 }),
    ];
    const roots = buildDepartmentTree(list);
    expect(roots.map((r) => r.id)).toEqual([1]);
    expect(roots[0].children.map((c) => c.name)).toEqual(["유치부", "초등부"]);
  });

  it("부모 없는 parentId(고아)는 루트로 승격한다", () => {
    const roots = buildDepartmentTree([card({ id: 5, name: "고아", parentId: 99 })]);
    expect(roots.map((r) => r.id)).toEqual([5]);
  });

  it("입력 배열을 변형하지 않는다(불변)", () => {
    const list = [card({ id: 1 }), card({ id: 2, parentId: 1 })];
    const snapshot = JSON.stringify(list);
    buildDepartmentTree(list);
    expect(JSON.stringify(list)).toBe(snapshot);
  });

  it("bySortOrder는 sortOrder 후 id로 비교한다", () => {
    expect(bySortOrder(card({ id: 2, sortOrder: 1 }), card({ id: 1, sortOrder: 1 }))).toBeGreaterThan(0);
    expect(bySortOrder(card({ id: 1, sortOrder: 1 }), card({ id: 9, sortOrder: 2 }))).toBeLessThan(0);
  });
});

describe("부서 사진·소개 덮어쓰기(church-backend#92)", () => {
  const student = DEPARTMENTS.find((d) => d.slug === "student")!;
  const linked: Department = { ...student, backendId: 7 };
  const detail = (over: Record<string, unknown>) =>
    okJson({ ...card({ id: 7 }), description: "", createdAt: "", updatedAt: "", version: 1, ...over });

  it("은샘 상수는 아직 백엔드 id가 없다(운영 부서 미등록)", () => {
    const all = DEPARTMENTS.flatMap((d) => [d, ...(d.children ?? [])]);
    expect(all.every((d) => d.backendId === undefined)).toBe(true);
  });

  it("backendId가 없으면 fetch 없이 빈 덮어쓰기", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await getDepartmentOverrides(student)).toEqual({});
    expect(await withListHeroMedia(DEPARTMENTS)).toBe(DEPARTMENTS);
    expect(spy).not.toHaveBeenCalled();
  });

  it("API 값이 있으면 대표 사진·활동 사진·소개를 채운다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      detail({ heroMediaId: 11, albumId: 3, photos: [21, 22], description: "**소개**" }),
    ));
    expect(await getDepartmentOverrides(linked)).toEqual({
      media: { type: "image", src: "/api/media/11", alt: "학생부" },
      gallery: [
        { src: "/api/media/21", alt: "학생부 활동 사진 1" },
        { src: "/api/media/22", alt: "학생부 활동 사진 2" },
      ],
      introMarkdown: "**소개**",
    });
  });

  it("칸이 없거나(백엔드 미반영) 비면 덮어쓰지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => detail({ description: "  " })));
    expect(await getDepartmentOverrides(linked)).toEqual({});
    vi.stubGlobal("fetch", vi.fn(async () => detail({ heroMediaId: null, albumId: null, photos: [] })));
    expect(await getDepartmentOverrides(linked)).toEqual({}); // 앨범 삭제 시 계약: albumId null + photos []
  });

  it("조회 실패·404면 상수로 대체한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    expect(await getDepartmentOverrides(linked)).toEqual({});
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as Response));
    expect(await getDepartmentOverrides(linked)).toEqual({});
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    const list = [linked];
    expect(await withListHeroMedia(list)).toBe(list);
  });

  it("목록은 연결된 부서 중 heroMediaId가 있는 것만 바꾼다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson([card({ id: 7, heroMediaId: 11 }), card({ id: 8 })])));
    const youth = { ...DEPARTMENTS[1], backendId: 8 };
    const [a, b] = await withListHeroMedia([linked, youth]);
    expect(a.media).toEqual({ type: "image", src: "/api/media/11", alt: "학생부" });
    expect(b).toBe(youth);
  });
});
