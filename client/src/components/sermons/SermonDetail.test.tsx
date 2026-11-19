import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const { useSermonMock } = vi.hoisted(() => ({ useSermonMock: vi.fn() }));
vi.mock("./queries", () => ({ useSermon: useSermonMock }));
vi.mock("./SermonVideo", () => ({ SermonVideo: () => "VIDEO" }));
vi.mock("./SermonAudio", () => ({ SermonAudio: () => "AUDIO" }));
// SermonDetailActions(useRouter·RequirePermission 포함) 무력화 — SermonAdminActions.test에서 검증.
vi.mock("./SermonAdminActions", () => ({ SermonDetailActions: () => null, SermonListAction: () => null }));
vi.mock("@/components/common/MarkdownContent", () => ({
  MarkdownContent: ({ source, mediaUrls }: { source: string; mediaUrls?: Record<string, string> }) => (
    <div data-media-urls={JSON.stringify(mediaUrls ?? null)}>{source}</div>
  ),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/sermons/7" }));

import { SermonDetail } from "./SermonDetail";
import { ApiError } from "@/lib/auth/apiError";

function state(over: Record<string, unknown>) {
  return { data: undefined, isPending: false, isError: false, refetch: vi.fn(), ...over };
}
const sermon = {
  id: 7, title: "은혜의 설교", preacher: "김목사", series: "로마서", scripture: "롬 1:1",
  content: "본문 마크다운", videoUrl: "https://youtu.be/x", audioUrl: "https://cdn.x.com/s.mp3",
  preachedAt: "2026-07-19", viewCount: 1240, createdAt: "2026-07-19T10:00:00",
  updatedAt: "2026-07-19T10:00:00", version: 0, tags: [{ id: 2, name: "주일" }], author: "관리자",
};

beforeEach(() => useSermonMock.mockReset());

describe("SermonDetail", () => {
  it("로딩 중엔 제목을 렌더하지 않는다", () => {
    useSermonMock.mockReturnValue(state({ isPending: true }));
    render(<SermonDetail id={7} />);
    expect(screen.queryByText("은혜의 설교")).toBeNull();
  });

  it("에러면 다시 시도 버튼을 보인다", () => {
    useSermonMock.mockReturnValue(state({ isError: true }));
    render(<SermonDetail id={7} />);
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
  });

  it("성공 시 제목·조회수·클릭 메타·본문·영상·오디오를 렌더한다", () => {
    useSermonMock.mockReturnValue(state({ data: sermon }));
    render(<SermonDetail id={7} />);
    expect(screen.getByText("은혜의 설교")).toBeDefined();
    expect(screen.getByText("VIDEO")).toBeDefined();
    expect(screen.getByText("AUDIO")).toBeDefined();
    expect(screen.getByText(/조회 1,240/)).toBeDefined();
    // 클릭 메타 → 목록 필터 링크(스펙 D9)
    expect(screen.getByRole("link", { name: "김목사" }).getAttribute("href")).toBe(
      `/sermons?preacher=${encodeURIComponent("김목사")}`,
    );
    expect(screen.getByRole("link", { name: "로마서" }).getAttribute("href")).toBe(
      `/sermons?series=${encodeURIComponent("로마서")}`,
    );
    expect(screen.getByText("주일").closest("a")?.getAttribute("href")).toBe("/sermons?tagId=2");
    expect(screen.getByText("본문 마크다운")).toBeDefined();
  });

  it("videoUrl·audioUrl 없으면 각 영역이 없다", () => {
    useSermonMock.mockReturnValue(state({ data: { ...sermon, videoUrl: null, audioUrl: null } }));
    render(<SermonDetail id={7} />);
    expect(screen.queryByText("VIDEO")).toBeNull();
    expect(screen.queryByText("AUDIO")).toBeNull();
  });
});

// 교인 전용 글·낡은 설정: 401/403은 오류가 아니라 MemberGate와 같은 안내(errorCode 분기)
describe("SermonDetail 접근 안내", () => {
  it("401 INVALID_TOKEN이면 로그인 안내와 로그인 링크", () => {
    useSermonMock.mockReturnValue(state({ isError: true, error: new ApiError(401, "INVALID_TOKEN", undefined) }));
    render(<SermonDetail id={7} />);
    expect(screen.getByText("로그인 후 이용 가능합니다")).toBeDefined();
    expect(screen.getByText("설교는 교인 전용입니다. 로그인해 주세요.")).toBeDefined();
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login?next=%2Fsermons%2F7");
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });
  it("403 ACCESS_DENIED면 승인 안내", () => {
    useSermonMock.mockReturnValue(state({ isError: true, error: new ApiError(403, "ACCESS_DENIED", undefined) }));
    render(<SermonDetail id={7} />);
    expect(screen.getByText("교인 승인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });
  it("대조: 500이면 지금처럼 '불러오지 못했습니다' + 다시 시도", () => {
    useSermonMock.mockReturnValue(state({ isError: true, error: new ApiError(500, "INTERNAL_ERROR", undefined) }));
    render(<SermonDetail id={7} />);
    expect(screen.getByText("설교를 불러오지 못했습니다.")).toBeDefined();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
    expect(screen.queryByText("로그인 후 이용 가능합니다")).toBeNull();
  });
});

describe("SermonDetail 교인만·서명 주소", () => {
  it("교인만 설교면 제목 옆에 '교인만' 배지", () => {
    useSermonMock.mockReturnValue(state({ data: { ...sermon, membersOnly: true } }));
    render(<SermonDetail id={7} />);
    expect(screen.getByText("교인만")).toBeDefined();
  });
  it("대조: 일반 설교는 배지 없음", () => {
    useSermonMock.mockReturnValue(state({ data: { ...sermon, membersOnly: false } }));
    render(<SermonDetail id={7} />);
    expect(screen.queryByText("교인만")).toBeNull();
  });
  // 교인만 설교의 본문 이미지는 무서명 주소가 404 — 응답 mediaUrls의 서명 주소로 그린다(스펙 6.2).
  it("본문에 응답의 mediaUrls를 넘긴다", () => {
    const mediaUrls = { "42": "/api/media/42?exp=1&sig=s" };
    useSermonMock.mockReturnValue(state({ data: { ...sermon, mediaUrls } }));
    render(<SermonDetail id={7} />);
    expect(screen.getByText("본문 마크다운").getAttribute("data-media-urls")).toBe(JSON.stringify(mediaUrls));
  });
});
