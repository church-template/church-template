import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/auth/apiError";
import { SERMON_DEFAULT_PREACHER } from "@/constants/church";
import { todayKstDate } from "@/lib/date";

const { createSermonMock, updateSermonMock, pushMock, refreshMock, notifySuccess, revalidateMainMock } = vi.hoisted(() => ({
  revalidateMainMock: vi.fn(),
  createSermonMock: vi.fn(),
  updateSermonMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/sermons.admin", () => ({ createSermon: createSermonMock, updateSermon: updateSermonMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
// server action(updateTag)은 요청 밖에서 못 부른다 — 호출 여부만 본다.
vi.mock("@/lib/admin/revalidate", () => ({ revalidateMain: revalidateMainMock }));
// 태그 옵션 fetch는 폼 테스트 범위 밖 — 빈 배열로 고정
vi.mock("@/lib/api/tags", () => ({ getTags: vi.fn().mockResolvedValue([]) }));

import { SermonForm } from "./SermonForm";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
function renderForm(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

// 수정 모드 시드 — 프리필 테스트와 version 테스트가 공유.
const EDIT_INITIAL = {
  id: 9, title: "원본", preacher: "김목사", series: null, scripture: null,
  content: "", videoUrl: null, audioUrl: null, preachedAt: "2026-06-01",
  viewCount: 0, createdAt: "2026-06-01T00:00:00", updatedAt: "2026-06-01T00:00:00",
  version: 4, tags: [], author: null,
};

describe("SermonForm", () => {
  it("필수 누락 시 검증 메시지를 보이고 제출하지 않는다", async () => {
    renderForm(<SermonForm mode="create" />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("제목을 입력해 주세요.")).toBeDefined());
    expect(createSermonMock).not.toHaveBeenCalled();
  });

  it("등록 성공 시 쿼리 무효화 후 상세로 이동한다", async () => {
    createSermonMock.mockResolvedValue({ id: 9 });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    renderForm(<SermonForm mode="create" />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "주일설교" } });
    fireEvent.change(screen.getByLabelText("설교자"), { target: { value: "김목사" } });
    fireEvent.change(screen.getByLabelText("설교일"), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(createSermonMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "주일설교", preacher: "김목사", preachedAt: "2026-06-01" }),
      ),
    );
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermons"] }));
    expect(pushMock).toHaveBeenCalledWith("/sermons/9");
    expect(notifySuccess).toHaveBeenCalled();
  });

  it("수정 모드는 initial.version을 PUT body에 포함하고 상세 쿼리도 무효화한다", async () => {
    updateSermonMock.mockResolvedValue({ id: 9 });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    renderForm(<SermonForm mode="edit" initial={EDIT_INITIAL} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(updateSermonMock).toHaveBeenCalledWith(9, expect.objectContaining({ version: 4 })),
    );
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermon", 9] }));
  });

  it("서버 필드 에러를 해당 입력에 매핑한다", async () => {
    createSermonMock.mockRejectedValue(
      new ApiError(400, "INVALID_INPUT_VALUE", undefined, undefined, undefined, [
        { field: "title", reason: "이미 존재하는 제목입니다." },
      ]),
    );
    renderForm(<SermonForm mode="create" />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "주일설교" } });
    fireEvent.change(screen.getByLabelText("설교자"), { target: { value: "김목사" } });
    fireEvent.change(screen.getByLabelText("설교일"), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("이미 존재하는 제목입니다.")).toBeDefined());
  });

  it("create 모드는 설교자·설교일이 미리 채워진다(교회 상수·오늘 KST)", () => {
    renderForm(<SermonForm mode="create" />);
    expect((screen.getByLabelText("설교자") as HTMLInputElement).value).toBe(
      SERMON_DEFAULT_PREACHER,
    );
    const date = screen.getByLabelText("설교일") as HTMLInputElement;
    expect(date.value).toBe(todayKstDate());
    // max가 연도 세그먼트를 4자리로 제한(6자리 연도 입력·자동 이동 안 됨 문제의 해결 장치)
    expect(date.getAttribute("max")).toBe("9999-12-31");
  });

  it("edit 모드는 프리필 대신 initial 값을 유지한다", () => {
    renderForm(<SermonForm mode="edit" initial={EDIT_INITIAL} />);
    expect((screen.getByLabelText("설교자") as HTMLInputElement).value).toBe("김목사");
    expect((screen.getByLabelText("설교일") as HTMLInputElement).value).toBe("2026-06-01");
  });
});

// 글 단위 교인만(#198)
describe("SermonForm 교인만 보기", () => {
  function fillRequired() {
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "주일설교" } });
    fireEvent.change(screen.getByLabelText("설교자"), { target: { value: "김목사" } });
    fireEvent.change(screen.getByLabelText("설교일"), { target: { value: "2026-06-01" } });
  }

  it("'이 설교는 교인만 보기'를 체크해 저장하면 body.membersOnly === true", async () => {
    createSermonMock.mockResolvedValue({ id: 9 });
    renderForm(<SermonForm mode="create" />);
    fillRequired();
    fireEvent.click(screen.getByLabelText("이 설교는 교인만 보기"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createSermonMock).toHaveBeenCalledWith(expect.objectContaining({ membersOnly: true })));
  });

  it("대조: 체크하지 않으면 membersOnly === false", async () => {
    createSermonMock.mockResolvedValue({ id: 9 });
    renderForm(<SermonForm mode="create" />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createSermonMock).toHaveBeenCalledWith(expect.objectContaining({ membersOnly: false })));
  });

  it("수정 모드는 저장된 교인만 값으로 체크해 두고 PUT에 싣는다", async () => {
    updateSermonMock.mockResolvedValue({ id: 9 });
    renderForm(<SermonForm mode="edit" initial={{ ...EDIT_INITIAL, membersOnly: true }} />);
    expect((screen.getByLabelText("이 설교는 교인만 보기") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(updateSermonMock).toHaveBeenCalledWith(9, expect.objectContaining({ membersOnly: true, version: 4 })),
    );
  });

  it("저장 성공 시 홈 캐시를 지운다(홈 설교 목록에 교인만 제목이 남지 않게)", async () => {
    createSermonMock.mockResolvedValue({ id: 9 });
    renderForm(<SermonForm mode="create" />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(revalidateMainMock).toHaveBeenCalledTimes(1));
  });

  // 저장은 이미 끝났다 — 캐시 지우기(서버 액션)가 실패해도 실패처럼 보이면 다시 저장해 중복 글이 생긴다.
  it("홈 캐시 지우기가 실패해도 저장 성공 Toast와 상세 이동은 그대로(실패는 로그만)", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    revalidateMainMock.mockRejectedValueOnce(new Error("server action failed"));
    createSermonMock.mockResolvedValue({ id: 9 });
    renderForm(<SermonForm mode="create" />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/sermons/9"));
    expect(notifySuccess).toHaveBeenCalledTimes(1);
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it("편집 미리보기에 응답 mediaUrls를 넘긴다", () => {
    const { container } = renderForm(
      <SermonForm
        mode="edit"
        initial={{ ...EDIT_INITIAL, content: "![](media:42)", mediaUrls: { "42": "/api/media/42?exp=1&sig=a" } }}
      />,
    );
    fireEvent.mouseDown(screen.getByRole("tab", { name: "미리보기" })); // Radix Tabs는 jsdom에서 click 미동작
    expect(container.querySelector("img")?.getAttribute("src")).toContain("sig=a");
  });
});

// #201 — 메뉴가 교인만이면 체크박스가 지금 당장은 아무것도 바꾸지 않는다는 것을 한 줄로 알린다.
describe("SermonForm 교인만 메뉴 안내", () => {
  const NOTE = "지금은 설교 전체가 교인 전용이라, 설교를 누구나로 열었을 때만 적용됩니다.";

  it("메뉴가 교인만이면 체크박스 아래 안내 한 줄(체크박스 설명으로 연결)", () => {
    renderForm(<SermonForm mode="create" menuLevel="MEMBERS" />);
    const note = screen.getByText(NOTE);
    const box = screen.getByLabelText("이 설교는 교인만 보기");
    expect(box.getAttribute("aria-describedby")).toBe(note.id);
  });

  it("대조: 메뉴가 누구나면 안내 없음", () => {
    renderForm(<SermonForm mode="create" menuLevel="PUBLIC" />);
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it("대조: 설정을 못 읽으면(menuLevel 없음) 지금처럼 안내 없음", () => {
    renderForm(<SermonForm mode="edit" initial={EDIT_INITIAL} />);
    expect(screen.queryByText(NOTE)).toBeNull();
    expect(screen.getByLabelText("이 설교는 교인만 보기").hasAttribute("aria-describedby")).toBe(false);
  });
});
