import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const m = vi.hoisted(() => ({ fetchAlbum: vi.fn() }));
vi.mock("@/lib/api/gallery", () => ({ fetchAlbum: m.fetchAlbum, fetchAlbums: vi.fn() }));
// 템플릿 예시 부서에는 backendId가 없어(교회마다 다름) 테스트에서만 학생부를 7번에 연결한다. 8번 = 기본 활동 사진이 없는 부서.
vi.mock("@/constants/departments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/constants/departments")>();
  const student = actual.findDepartment("student")!;
  return {
    ...actual,
    findDepartmentByBackendId: (id: number) =>
      id === 7 ? { ...student, backendId: 7 } : id === 8 ? { ...student, backendId: 8, gallery: undefined } : undefined,
  };
});

import { DeptEditPreview, type DeptEditPreviewProps } from "./DeptEditPreview";
const { findDepartmentByBackendId, findDepartment } =
  await vi.importActual<typeof import("@/constants/departments")>("@/constants/departments");

// 공개 상세는 소개가 비면 상수 description(마크다운)을 보인다
const STUDENT_DESC = /매주 토요일 오전 11시, 학생·청년이 함께 예배하며/;
const photos = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, mediaId: 200 + i, sortOrder: i }));
const NO_CHANGE = { hero: false, description: false, album: false };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  m.fetchAlbum.mockResolvedValue({ id: 5, photos: [] });
});
afterEach(() => vi.clearAllMocks());

function renderPreview(over: Partial<DeptEditPreviewProps> = {}) {
  const props: DeptEditPreviewProps = {
    backendId: 7, heroMediaId: null, description: "", albumId: null, changed: NO_CHANGE, ...over,
  };
  return render(
    <QueryClientProvider client={qc}>
      <DeptEditPreview {...props} />
    </QueryClientProvider>,
  );
}
const heroImg = () => screen.getByRole("img", { name: "학생부 대표 사진" }) as HTMLImageElement;

describe("findDepartmentByBackendId", () => {
  it("백엔드 부서 번호로 공개 부서 상수를 찾는다(하위까지)", () => {
    const student = findDepartment("student")!;
    const list = [{ ...student, backendId: 1, children: [{ ...student, slug: "child", backendId: 2 }] }];
    expect(findDepartmentByBackendId(1, list)?.slug).toBe("student");
    expect(findDepartmentByBackendId(2, list)?.slug).toBe("child");
    expect(findDepartmentByBackendId(9999, list)).toBeUndefined();
  });

  it("템플릿 예시 부서는 연결된 번호가 없다", () => {
    expect(findDepartmentByBackendId(1)).toBeUndefined();
  });
});

describe("DeptEditPreview", () => {
  it("대표 사진이 없으면 공개 페이지처럼 상수 사진을, 있으면 그 사진을 보인다", () => {
    const { unmount } = renderPreview();
    expect(heroImg().getAttribute("src")).toBe("/dept/student.webp");
    unmount();
    renderPreview({ heroMediaId: 12 });
    expect(heroImg().getAttribute("src")).toContain("/api/media/12");
  });

  it("방금 고른 사진은 서명 주소로 보인다(저장 전엔 비공개)", () => {
    renderPreview({ heroMediaId: 12, heroPickedUrl: "/api/media/12?exp=1&sig=a" });
    expect(heroImg().getAttribute("src")).toContain("sig=a");
  });

  it("제목은 공개 페이지와 같은 상수 부서명이다", () => {
    renderPreview();
    expect(screen.getByText("학생부")).toBeDefined();
  });

  it("소개가 비면 상수 소개를, 있으면 그 글을 보이고 바뀌었으면 표시한다", () => {
    const { unmount } = renderPreview();
    expect(screen.getByText(STUDENT_DESC)).toBeDefined();
    expect(screen.queryByText("바뀜")).toBeNull();
    unmount();
    renderPreview({ description: "새 소개 글", changed: { ...NO_CHANGE, description: true } });
    expect(screen.getByText("새 소개 글")).toBeDefined();
    expect(screen.getByText("바뀜")).toBeDefined();
  });

  it("앨범이 없으면 공개 페이지처럼 기본 활동 사진을 보이고 그렇다고 알린다", () => {
    renderPreview();
    expect(screen.getByText("앨범을 연결하지 않아 기본 사진이 보입니다.")).toBeDefined();
    const imgs = screen.getAllByRole("img", { name: /학생부 활동 사진/ });
    expect(imgs).toHaveLength(4);
    expect(imgs[0].getAttribute("src")).toBe("/dept/student/1.webp");
  });

  it("앨범에 사진이 없거나 못 불러오면 기본 사진을 보이고 그 이유를 쓴다", async () => {
    m.fetchAlbum.mockRejectedValue(new Error("403"));
    renderPreview({ albumId: 5 });
    expect(await screen.findByText("앨범에 사진이 없어 기본 사진이 보입니다. 사진을 넣으면 바뀝니다.")).toBeDefined();
    expect(screen.getAllByRole("img", { name: /학생부 활동 사진/ })).toHaveLength(4);
  });

  it("기본 사진도 앨범도 없으면 구역이 안 보이는 이유를 쓴다", () => {
    renderPreview({ backendId: 8 });
    expect(screen.getByText("앨범을 연결하지 않아 부서 화면에 이 구역이 보이지 않습니다.")).toBeDefined();
  });

  it("앨범 사진은 4장까지 보이고 그보다 많으면 장수를 알린다", async () => {
    m.fetchAlbum.mockResolvedValue({ id: 5, photos: photos(5) });
    renderPreview({ albumId: 5, changed: { ...NO_CHANGE, album: true } });
    await screen.findByText(/사진 5장 · 부서 화면에서는 8장씩 보이고/);
    expect(screen.getAllByRole("img", { name: /학생부 활동 사진/ })).toHaveLength(4);
    expect(screen.getByText("바뀜")).toBeDefined();
  });

  it("공개 소개 페이지가 없는 부서는 안내 한 줄만 보인다", () => {
    renderPreview({ backendId: 9999 });
    expect(screen.getByText("이 부서는 공개 소개 페이지가 없습니다.")).toBeDefined();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("수정 화면이 빈 값으로 먼저 그려진 뒤 상세로 채워질 때는 내리지 않는다(열자마자 튀지 않게)", async () => {
    const scrollTo = vi.fn();
    m.fetchAlbum.mockResolvedValue({ id: 5, photos: photos(2) });
    const view = (albumId: number | null) => (
      <QueryClientProvider client={qc}>
        <div style={{ overflowY: "auto" }} ref={(el) => { if (el) el.scrollTo = scrollTo; }}>
          <DeptEditPreview backendId={7} heroMediaId={null} description="" albumId={albumId} changed={NO_CHANGE} />
        </div>
      </QueryClientProvider>
    );
    const { rerender } = render(view(null)); // 폼 첫 렌더(EMPTY)
    rerender(view(5)); // 상세 시드
    await screen.findAllByRole("img", { name: /학생부 활동 사진/ });
    await new Promise((r) => setTimeout(r, 20));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("사진을 넣으면(요청 번호 증가) 사진을 다 불러온 뒤 활동 사진 구역으로 내린다", async () => {
    const scrollTo = vi.fn();
    m.fetchAlbum.mockResolvedValue({ id: 5, photos: photos(2) });
    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <div style={{ overflowY: "auto" }} data-testid="box" ref={(el) => { if (el) el.scrollTo = scrollTo; }}>
          <DeptEditPreview backendId={7} heroMediaId={null} description="" albumId={5} changed={NO_CHANGE} />
        </div>
      </QueryClientProvider>,
    );
    await screen.findAllByRole("img", { name: /학생부 활동 사진/ });
    expect(scrollTo).not.toHaveBeenCalled(); // 처음 열 때는 움직이지 않는다
    m.fetchAlbum.mockResolvedValue({ id: 5, photos: photos(4) });
    await qc.invalidateQueries({ queryKey: ["album", 5] });
    rerender(
      <QueryClientProvider client={qc}>
        <div style={{ overflowY: "auto" }} data-testid="box" ref={(el) => { if (el) el.scrollTo = scrollTo; }}>
          <DeptEditPreview backendId={7} heroMediaId={null} description="" albumId={5} changed={NO_CHANGE} scrollRequest={1} />
        </div>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
  });
});
