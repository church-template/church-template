import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

// next/link → plain <a> (프로젝트 테스트 컨벤션)
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const { useSermonsMock, useSermonTagsMock, searchParamsRef } = vi.hoisted(() => ({
  useSermonsMock: vi.fn(),
  useSermonTagsMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams("") },
}));
vi.mock("./queries", () => ({ useSermons: useSermonsMock, useSermonTags: useSermonTagsMock }));
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParamsRef.current, usePathname: () => "/sermons" }));
// 자식 컴포넌트 격리 — URL 조작 동작은 각자 테스트(SermonSearch.test 등)에서 검증.
vi.mock("./SermonSearch", () => ({ SermonSearch: () => null }));
vi.mock("./ActiveFilters", () => ({ ActiveFilters: () => null }));
vi.mock("@/components/common/TagFilter", () => ({ TagFilter: () => null }));
vi.mock("@/components/common/Pagination", () => ({ Pagination: () => "PAGINATION" }));
// 글 단위 버튼·배너는 권한·저장 동작을 MembersOnlyToggle.test에서 검증 — 여기선 자리(링크 밖·1회)만 본다.
vi.mock("@/components/visibility/MembersOnlyToggle", () => ({
  MembersOnlyToggle: ({ id }: { id: number }) => <button type="button">{`TOGGLE-${id}`}</button>,
  MembersOnlyBanner: ({ menuLevel }: { menuLevel: string }) =>
    menuLevel === "MEMBERS" ? <p>지금은 전체가 교인 전용입니다</p> : null,
}));

import { SermonList } from "./SermonList";
import { ApiError } from "@/lib/auth/apiError";
import { SERMON_LIST } from "@/constants/sermons";

function state(over: Record<string, unknown>) {
  return { data: undefined, isPending: false, isError: false, refetch: vi.fn(), ...over };
}
const card = {
  id: 1, title: "주일설교", preacher: "김목사", series: null, scripture: null,
  preachedAt: "2026-07-19", viewCount: 0, tags: [],
};
const page = { size: 12, number: 0, totalElements: 1, totalPages: 1 };

beforeEach(() => {
  useSermonsMock.mockReset();
  useSermonTagsMock.mockReturnValue({ data: [], isPending: false, isError: false });
  searchParamsRef.current = new URLSearchParams("");
});

describe("SermonList", () => {
  it("로딩 중엔 카드 링크가 없다(스켈레톤)", () => {
    useSermonsMock.mockReturnValue(state({ isPending: true }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("빈 배열이면 EmptyState를 보인다", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [], page: { ...page, totalElements: 0, totalPages: 0 } } }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(screen.getByText("조건에 맞는 설교가 없습니다.")).toBeDefined();
  });

  it("필터 없는 첫 페이지면 최신 설교를 띠로, 나머지를 월별 목록으로 보인다", () => {
    const older = { ...card, id: 2, title: "지난 설교", preachedAt: "2026-06-28" };
    useSermonsMock.mockReturnValue(state({ data: { content: [card, older], page } }));
    render(<SermonList menuLevel="PUBLIC" />);
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/sermons/1", "/sermons/2"]);
    expect(links[0].textContent).toContain("말씀 보기");
    expect(screen.getByRole("heading", { level: 2, name: "2026년 6월" })).toBeDefined();
    expect(screen.queryByRole("heading", { level: 2, name: "2026년 7월" })).toBeNull(); // 최신 설교는 띠에만
  });

  it("검색·필터가 걸리면 띠 없이 월별 목록만 보인다", () => {
    searchParamsRef.current = new URLSearchParams("q=믿음");
    useSermonsMock.mockReturnValue(state({ data: { content: [card], page } }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(screen.queryByText("말씀 보기")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "2026년 7월" })).toBeDefined();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/sermons/1");
  });

  it("두 번째 페이지부터는 띠를 보이지 않는다", () => {
    searchParamsRef.current = new URLSearchParams("page=1");
    useSermonsMock.mockReturnValue(state({ data: { content: [card], page: { ...page, number: 1, totalPages: 2 } } }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(screen.queryByText("말씀 보기")).toBeNull();
  });

  it("여러 페이지면 페이지네이션을 보인다", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [card], page: { ...page, totalElements: 30, totalPages: 3 } } }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(screen.queryByText("PAGINATION")).not.toBeNull();
  });

  it("한 페이지면 페이지네이션을 숨긴다", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [card], page } }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(screen.queryByText("PAGINATION")).toBeNull();
  });

  it("에러면 다시 시도 버튼을 보이고, 클릭하면 refetch를 호출한다", () => {
    const refetch = vi.fn();
    useSermonsMock.mockReturnValue(state({ isError: true, refetch }));
    render(<SermonList menuLevel="PUBLIC" />);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetch).toHaveBeenCalled();
  });

  // 구 RSC 페이지 parseParams 커버리지 이전 — 파싱 로직이 SermonList로 이동했다.
  it("URL 파라미터를 파싱해 쿼리에 전달한다", () => {
    searchParamsRef.current = new URLSearchParams("q=은혜&tagId=3&page=0&preacher=김목사");
    useSermonsMock.mockReturnValue(state({ isPending: true }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(useSermonsMock).toHaveBeenCalledWith(
      expect.objectContaining({ q: "은혜", tagId: 3, page: 0, preacher: "김목사" }),
    );
  });

  it("잘못된 쿼리 파라미터는 undefined로 방어한다", () => {
    searchParamsRef.current = new URLSearchParams("tagId=abc&from=not-a-date&to=2026-12-31");
    useSermonsMock.mockReturnValue(state({ isPending: true }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(useSermonsMock).toHaveBeenCalledWith(
      expect.objectContaining({ tagId: undefined, from: undefined, to: "2026-12-31" }),
    );
  });
});

// 교인 전용 글·낡은 설정: 401/403은 오류가 아니라 MemberGate와 같은 안내(errorCode 분기)
describe("SermonList 접근 안내", () => {
  it("401 INVALID_TOKEN이면 로그인 안내와 로그인 링크", () => {
    useSermonsMock.mockReturnValue(state({ isError: true, error: new ApiError(401, "INVALID_TOKEN", undefined) }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(screen.getByText("로그인 후 이용 가능합니다")).toBeDefined();
    expect(screen.getByText("설교는 교인 전용입니다. 로그인해 주세요.")).toBeDefined();
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login?next=%2Fsermons");
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });
  it("403 ACCESS_DENIED면 승인 안내", () => {
    useSermonsMock.mockReturnValue(state({ isError: true, error: new ApiError(403, "ACCESS_DENIED", undefined) }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(screen.getByText("교인 승인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });
  it("대조: 500이면 지금처럼 '불러오지 못했습니다' + 다시 시도", () => {
    useSermonsMock.mockReturnValue(state({ isError: true, error: new ApiError(500, "INTERNAL_ERROR", undefined) }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(screen.getByText(SERMON_LIST.loadError)).toBeDefined();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
    expect(screen.queryByText("로그인 후 이용 가능합니다")).toBeNull();
  });
});

// 글 단위 교인만(#198) — 배지는 교인에게, 버튼은 링크 밖 형제, 배너는 목록 위 한 번.
describe("SermonList 교인만 표시", () => {
  const a = { ...card, id: 1, title: "첫 설교", preachedAt: "2026-07-19", membersOnly: false, version: 1 };
  const b = { ...card, id: 2, title: "교인 설교", preachedAt: "2026-07-12", membersOnly: true, version: 1 };
  const c = { ...card, id: 3, title: "셋째 설교", preachedAt: "2026-07-05", membersOnly: false, version: 1 };

  it("교인만 설교 행에 배지, 공개 설교 행에는 배지 없음(대조)", () => {
    searchParamsRef.current = new URLSearchParams("q=x"); // 띠 없이 모두 줄 목록
    useSermonsMock.mockReturnValue(state({ data: { content: [a, b], page } }));
    render(<SermonList menuLevel="PUBLIC" />);
    const rowB = screen.getByText("교인 설교").closest("li") as HTMLElement;
    const rowA = screen.getByText("첫 설교").closest("li") as HTMLElement;
    expect(rowB.textContent).toContain("교인만");
    expect(rowA.textContent).not.toContain("교인만");
  });

  it("메뉴가 교인만이면 배너는 목록 위에 정확히 1개", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [a, b, c], page } }));
    render(<SermonList menuLevel="MEMBERS" />);
    expect(screen.getAllByText("지금은 전체가 교인 전용입니다")).toHaveLength(1);
  });

  it("대조: 메뉴가 누구나면 배너 없음", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [a, b, c], page } }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(screen.queryByText("지금은 전체가 교인 전용입니다")).toBeNull();
  });

  it("토글 버튼은 행·띠 링크 안에 있지 않다(행마다 1개)", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [a, b, c], page } }));
    render(<SermonList menuLevel="PUBLIC" />);
    const buttons = ["TOGGLE-1", "TOGGLE-2", "TOGGLE-3"].map((t) => screen.getByRole("button", { name: t }));
    buttons.forEach((btn) => expect(btn.closest("a")).toBeNull());
  });

  it("version이 없는 카드(구 백엔드)는 버튼을 그리지 않는다", () => {
    searchParamsRef.current = new URLSearchParams("q=x");
    const old = { ...card, id: 4, title: "옛 설교" };
    useSermonsMock.mockReturnValue(state({ data: { content: [a, old], page } }));
    render(<SermonList menuLevel="PUBLIC" />);
    expect(screen.getByRole("button", { name: "TOGGLE-1" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "TOGGLE-4" })).toBeNull();
  });
});
