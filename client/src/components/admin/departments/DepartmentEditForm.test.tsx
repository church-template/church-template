import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const m = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  detail: vi.fn(),
  list: vi.fn(),
  revalidate: vi.fn(),
  fetchAlbums: vi.fn(),
  fetchAlbum: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  push: vi.fn(),
  createAlbum: vi.fn(),
}));
vi.mock("@/lib/api/departments.admin", () => ({
  createDepartment: m.create,
  updateDepartment: m.update,
  getDepartmentDetail: m.detail,
  listDepartmentsAdmin: m.list,
}));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateDepartments: m.revalidate }));
vi.mock("@/lib/api/gallery", () => ({ fetchAlbums: m.fetchAlbums, fetchAlbum: m.fetchAlbum }));
vi.mock("@/lib/api/gallery.admin", () => ({ createAlbum: m.createAlbum, addPhotos: vi.fn() }));
// 템플릿 예시 부서에는 backendId가 없어(교회마다 다름) 테스트에서만 학생부를 7번에 연결한다.
vi.mock("@/constants/departments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/constants/departments")>();
  const student = actual.findDepartment("student")!;
  return { ...actual, findDepartmentByBackendId: (id: number) => (id === 7 ? { ...student, backendId: 7 } : undefined) };
});
vi.mock("@/lib/notify", () => ({ notify: { success: m.success, error: m.error } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push, refresh: vi.fn() }) }));
vi.mock("@/lib/auth/useMe", () => ({
  useMe: () => ({ data: { permissions: ["DEPT_WRITE", "GALLERY_VIEW", "GALLERY_WRITE"] }, isLoading: false }),
  usePermission: () => true,
  useHasPermission: () => true,
}));

import { DepartmentEditForm } from "./DepartmentEditForm";
import { onlineManager } from "@tanstack/react-query";
import { ApiError } from "@/lib/auth/apiError";

const departments = [
  { id: 1, name: "학생부", leader: "", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "", parentId: 1, sortOrder: 10 },
  { id: 3, name: "청년부", leader: "", parentId: null, sortOrder: 20 },
];
const detail = (over: Record<string, unknown> = {}) => ({
  id: 2, name: "중등부", description: "", leader: "", parentId: 1, sortOrder: 10,
  createdAt: "", updatedAt: "", version: 4, ...over,
});

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  m.list.mockResolvedValue(departments);
  m.revalidate.mockResolvedValue(undefined);
  m.fetchAlbums.mockResolvedValue({ content: [{ id: 3, title: "여름 수련회" }, { id: 8, title: "찬양의 밤" }] });
  m.fetchAlbum.mockResolvedValue({ id: 3, title: "여름 수련회", photos: [] });
});
afterEach(() => vi.clearAllMocks());

function renderForm(props: Parameters<typeof DepartmentEditForm>[0]) {
  return render(
    <QueryClientProvider client={qc}>
      <DepartmentEditForm {...props} />
    </QueryClientProvider>,
  );
}
const save = () => screen.getByRole("button", { name: "저장" }) as HTMLButtonElement;
const nameInput = () => screen.getByLabelText("부서명 (필수)") as HTMLInputElement;

describe("DepartmentEditForm", () => {
  it("부서명이 비면 검증 메시지를 보이고 생성하지 않는다", async () => {
    renderForm({ mode: "create" });
    fireEvent.click(save());
    await waitFor(() => expect(screen.getByText("부서명을 입력해 주세요.")).toBeDefined());
    expect(m.create).not.toHaveBeenCalled();
  });

  it("생성은 POST body를 보내고 부서 관리로 돌아간다", async () => {
    m.create.mockResolvedValue({ id: 9 });
    renderForm({ mode: "create" });
    expect(screen.getByRole("heading", { level: 1, name: "새 부서" })).toBeDefined();
    fireEvent.change(nameInput(), { target: { value: "새부서" } });
    fireEvent.click(save());
    await waitFor(() => expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ name: "새부서", parentId: null })));
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/mypage/manage/departments"));
    expect(m.success).toHaveBeenCalledWith("저장했습니다.");
    expect(m.revalidate).toHaveBeenCalled();
  });

  it("defaultParentId를 주면 생성 폼의 상위가 프리셋된다", async () => {
    m.create.mockResolvedValue({ id: 9 });
    renderForm({ mode: "create", defaultParentId: 2 });
    await waitFor(() => expect((screen.getByLabelText("상위 부서 (선택)") as HTMLSelectElement).value).toBe("2"));
    fireEvent.change(nameInput(), { target: { value: "1학년부" } });
    fireEvent.click(save());
    await waitFor(() => expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ name: "1학년부", parentId: 2 })));
  });

  it("수정은 상세로 시드하고 제목에 부서명을 쓰며 PUT에 version과 사진 칸 두 개를 싣는다", async () => {
    m.detail.mockResolvedValue(detail({ heroMediaId: 11, albumId: 3 }));
    m.update.mockResolvedValue({ id: 2 });
    renderForm({ mode: "edit", editId: 2 });
    await waitFor(() => expect(nameInput().value).toBe("중등부"));
    expect(screen.getByRole("heading", { level: 1, name: "중등부 수정" })).toBeDefined();
    fireEvent.click(save());
    await waitFor(() =>
      expect(m.update).toHaveBeenCalledWith(2, expect.objectContaining({ version: 4, heroMediaId: 11, albumId: 3 })),
    );
  });

  it("백엔드가 사진 칸을 안 줘도 PUT에 두 칸을 null로 명시한다", async () => {
    m.detail.mockResolvedValue(detail());
    m.update.mockResolvedValue({ id: 2 });
    renderForm({ mode: "edit", editId: 2 });
    await waitFor(() => expect(nameInput().value).toBe("중등부"));
    fireEvent.click(save());
    await waitFor(() => expect(m.update).toHaveBeenCalled());
    expect(m.update.mock.calls[0][1]).toMatchObject({ heroMediaId: null, albumId: null });
  });

  it("수정 시 상위 옵션에서 자기 자신과 하위를 제외한다", async () => {
    m.detail.mockResolvedValue(detail({ id: 1, name: "학생부", parentId: null, version: 1 }));
    renderForm({ mode: "edit", editId: 1 });
    await waitFor(() => expect(nameInput().value).toBe("학생부"));
    await waitFor(() => {
      const values = Array.from((screen.getByLabelText("상위 부서 (선택)") as HTMLSelectElement).options).map((o) => o.value);
      expect(values).toEqual(["", "3"]);
    });
  });

  it("상세를 불러오는 중에는 저장이 비활성, 도착 후 활성된다", async () => {
    let resolve: (d: unknown) => void = () => {};
    m.detail.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderForm({ mode: "edit", editId: 2 });
    await waitFor(() => expect(save().disabled).toBe(true));
    resolve(detail());
    await waitFor(() => expect(save().disabled).toBe(false));
  });

  it("상세 조회가 실패하면 토스트하고 저장은 비활성이다(낡은 version PUT 방지)", async () => {
    m.detail.mockRejectedValue(new Error("network"));
    renderForm({ mode: "edit", editId: 2 });
    await waitFor(() => expect(m.error).toHaveBeenCalled());
    expect(save().disabled).toBe(true);
  });

  it("사진 빼기는 heroMediaId를 null로 보낸다", async () => {
    m.detail.mockResolvedValue(detail({ heroMediaId: 11 }));
    m.update.mockResolvedValue({ id: 2 });
    renderForm({ mode: "edit", editId: 2 });
    await waitFor(() => expect(nameInput().value).toBe("중등부"));
    fireEvent.click(screen.getByRole("button", { name: "사진 빼기" }));
    fireEvent.click(save());
    await waitFor(() => expect(m.update).toHaveBeenCalledWith(2, expect.objectContaining({ heroMediaId: null })));
  });

  it("공개 부서 화면에서 왔으면 그 화면으로 돌아가고 돌아가기 문구에 부서명을 쓴다", async () => {
    m.detail.mockResolvedValue(detail({ id: 7, name: "학생부", parentId: null }));
    m.update.mockResolvedValue({ id: 7 });
    renderForm({ mode: "edit", editId: 7, from: "/departments/student" });
    await waitFor(() => expect(nameInput().value).toBe("학생부"));
    expect(screen.getByRole("link", { name: "학생부 화면으로 돌아가기" }).getAttribute("href")).toBe("/departments/student");
    fireEvent.click(save());
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/departments/student"));
  });

  it("외부 주소 from은 무시하고 부서 관리로 돌아간다", async () => {
    m.detail.mockResolvedValue(detail());
    m.update.mockResolvedValue({ id: 2 });
    renderForm({ mode: "edit", editId: 2, from: "//evil.example" });
    await waitFor(() => expect(nameInput().value).toBe("중등부"));
    expect(screen.getByRole("link", { name: "부서 관리로 돌아가기" }).getAttribute("href")).toBe("/mypage/manage/departments");
    fireEvent.click(save());
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/mypage/manage/departments"));
  });

  it("취소는 돌아갈 주소로 간다", async () => {
    renderForm({ mode: "create" });
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(m.push).toHaveBeenCalledWith("/mypage/manage/departments");
  });

  it("칸을 바꾸면 저장하지 않은 변경을 알린다", async () => {
    m.detail.mockResolvedValue(detail());
    renderForm({ mode: "edit", editId: 2 });
    await waitFor(() => expect(nameInput().value).toBe("중등부"));
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.change(screen.getByLabelText("담당 (선택)"), { target: { value: "김은혜 전도사" } });
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("저장하지 않은 변경이 있습니다."));
  });

  it("앨범 칸에서 고른 앨범이 PUT albumId로 간다", async () => {
    m.detail.mockResolvedValue(detail({ albumId: null }));
    m.update.mockResolvedValue({ id: 2 });
    renderForm({ mode: "edit", editId: 2 });
    await waitFor(() => expect(nameInput().value).toBe("중등부"));
    await screen.findByRole("option", { name: "찬양의 밤" });
    fireEvent.change(screen.getByLabelText("활동 사진 앨범 선택"), { target: { value: "8" } });
    fireEvent.click(save());
    await waitFor(() => expect(m.update).toHaveBeenCalledWith(2, expect.objectContaining({ albumId: 8 })));
  });

  it("미리보기는 공개 페이지의 부서를 보이고, 소개를 고치면 그 구역에 바뀜을 붙인다", async () => {
    m.detail.mockResolvedValue(detail({ id: 7, name: "학생부", parentId: null }));
    renderForm({ mode: "edit", editId: 7 });
    await waitFor(() => expect(nameInput().value).toBe("학생부"));
    const preview = screen.getByRole("complementary", { name: "방문자에게 이렇게 보입니다" });
    expect(preview.querySelector('img[alt="학생부 대표 사진"]')).not.toBeNull();
    expect(preview.textContent).not.toContain("바뀜");
    fireEvent.change(document.getElementById("dept-description") as HTMLTextAreaElement, { target: { value: "새 소개" } });
    await waitFor(() => expect(preview.textContent).toContain("바뀜"));
    expect(preview.textContent).toContain("새 소개");
  });

  it("저장이 충돌(409)해 최신값으로 다시 채워도 이번에 만든 앨범 연결은 남는다", async () => {
    m.detail.mockResolvedValueOnce(detail({ albumId: null, version: 4 })).mockResolvedValue(detail({ albumId: null, version: 5, leader: "다른 사람" }));
    m.fetchAlbums.mockResolvedValue({ content: [] });
    m.createAlbum.mockResolvedValue({ id: 42, title: "중등부 활동 사진", photos: [] });
    m.update.mockRejectedValueOnce(new ApiError(409, "OPTIMISTIC_LOCK_CONFLICT", "충돌")).mockResolvedValue({ id: 2 });
    renderForm({ mode: "edit", editId: 2 });
    await waitFor(() => expect(nameInput().value).toBe("중등부"));
    fireEvent.click(await screen.findByRole("button", { name: "새 앨범 만들기" }));
    fireEvent.click(screen.getByRole("button", { name: "만들고 연결" }));
    await waitFor(() => expect(m.createAlbum).toHaveBeenCalled());
    fireEvent.click(save());
    await waitFor(() => expect(m.detail).toHaveBeenCalledTimes(2)); // 충돌 → 최신본 재조회
    await waitFor(() => expect((screen.getByLabelText("담당 (선택)") as HTMLInputElement).value).toBe("다른 사람"));
    await waitFor(() => expect(save().disabled).toBe(false));
    fireEvent.click(save());
    await waitFor(() => expect(m.update).toHaveBeenLastCalledWith(2, expect.objectContaining({ albumId: 42, version: 5 })));
  });

  it("설명이 너무 길면 저장하지 않고 이유를 보인다", async () => {
    renderForm({ mode: "create" });
    fireEvent.change(nameInput(), { target: { value: "새부서" } });
    fireEvent.change(document.getElementById("dept-description") as HTMLTextAreaElement, { target: { value: "가".repeat(50001) } });
    fireEvent.click(save());
    expect(await screen.findByText("설명은 50,000자 이내로 써 주세요.")).toBeDefined();
    expect(m.create).not.toHaveBeenCalled();
  });

  it("저장은 됐는데 공개 화면 캐시 갱신이 실패해도 저장 완료로 처리하고 돌아간다", async () => {
    m.create.mockResolvedValue({ id: 9 });
    m.revalidate.mockRejectedValue(new Error("network"));
    renderForm({ mode: "create" });
    fireEvent.change(nameInput(), { target: { value: "새부서" } });
    fireEvent.click(save());
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/mypage/manage/departments"));
    expect(m.success).toHaveBeenCalledWith("저장했습니다.");
    expect(m.create).toHaveBeenCalledTimes(1);
  });

  it("만든 앨범에서 다른 앨범으로 바꾼 뒤 충돌(409)이 나면 만든 앨범을 되살리지 않는다", async () => {
    m.detail.mockResolvedValueOnce(detail({ albumId: null, version: 4 })).mockResolvedValue(detail({ albumId: null, version: 5 }));
    m.fetchAlbums.mockResolvedValue({ content: [{ id: 8, title: "찬양의 밤" }] });
    m.createAlbum.mockResolvedValue({ id: 42, title: "중등부 활동 사진", photos: [] });
    m.update.mockRejectedValueOnce(new ApiError(409, "OPTIMISTIC_LOCK_CONFLICT", "충돌")).mockResolvedValue({ id: 2 });
    renderForm({ mode: "edit", editId: 2 });
    await waitFor(() => expect(nameInput().value).toBe("중등부"));
    fireEvent.click(await screen.findByRole("button", { name: "새 앨범 만들기" }));
    fireEvent.click(screen.getByRole("button", { name: "만들고 연결" }));
    await waitFor(() => expect(m.createAlbum).toHaveBeenCalled());
    await screen.findByRole("option", { name: "찬양의 밤" });
    fireEvent.change(screen.getByLabelText("활동 사진 앨범 선택"), { target: { value: "8" } });
    fireEvent.click(save());
    await waitFor(() => expect(m.detail).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(save().disabled).toBe(false));
    fireEvent.click(save());
    await waitFor(() => expect(m.update).toHaveBeenCalledTimes(2));
    expect(m.update.mock.calls[1][1].albumId).not.toBe(42);
  });

  it("인터넷이 끊겼다 다시 이어져도 고치던 칸을 서버 값으로 덮지 않는다", async () => {
    m.detail.mockResolvedValueOnce(detail()).mockResolvedValue(detail({ leader: "다른 관리자가 바꾼 값", version: 5 }));
    renderForm({ mode: "edit", editId: 2 });
    await waitFor(() => expect(nameInput().value).toBe("중등부"));
    fireEvent.change(screen.getByLabelText("담당 (선택)"), { target: { value: "내가 고치는 중" } });
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    await new Promise((r) => setTimeout(r, 50));
    expect((screen.getByLabelText("담당 (선택)") as HTMLInputElement).value).toBe("내가 고치는 중");
    expect(m.detail).toHaveBeenCalledTimes(1);
  });

  it("정렬 순서 칸은 아래 설명을 스크린리더가 함께 읽도록 연결한다", () => {
    renderForm({ mode: "create" });
    const ids = (screen.getByLabelText("정렬 순서 (선택)").getAttribute("aria-describedby") ?? "").split(" ");
    const help = screen.getByText("숫자가 작을수록 앞에 나옵니다.");
    expect(ids).toContain(help.id);
  });

  it("부서명·담당은 공개 소개 페이지에 나오지 않는다고 기본 정보 구역에서 한 번 알린다", () => {
    renderForm({ mode: "create" });
    const region = screen.getByRole("region", { name: "기본 정보" });
    const notes = screen.getAllByText("부서명과 담당은 공개 소개 페이지에는 나오지 않고 부서 관리 목록에 쓰입니다.");
    expect(notes).toHaveLength(1);
    expect(region.contains(notes[0])).toBe(true);
  });
});
