import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { getNotice } = vi.hoisted(() => ({ getNotice: vi.fn() }));
vi.mock("@/lib/api/notices", () => ({ getNotice }));
const { getVisibilityMock, connectionMock } = vi.hoisted(() => ({
  getVisibilityMock: vi.fn(),
  connectionMock: vi.fn(async () => {}),
}));
vi.mock("next/server", () => ({ connection: connectionMock }));
vi.mock("@/lib/api/visibility", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/visibility")>()),
  getVisibility: getVisibilityMock,
}));
vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ permission, children }: { permission: string; children: ReactNode }) => (
    <div data-testid="gate" data-permission={permission}>{children}</div>
  ),
}));
vi.mock("@/components/notices/NoticeMemberViews", () => ({
  NoticeDetailClient: ({ id }: { id: number }) => <div data-testid="client-detail" data-id={id} />,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// 클라이언트 island는 스텁(useMe·QueryClientProvider 의존 차단) — 단위 테스트가 커버.
vi.mock("@/components/notices/NoticeAdminActions", () => ({ NoticeDetailActions: () => null }));

import NoticeDetailPage, { generateMetadata } from "./page";
import { MembersOnlyError } from "@/lib/api/visibility";

afterEach(() => { vi.clearAllMocks(); getVisibilityMock.mockReset(); });

const base = {
  id: 5, title: "2026 여름 수련회 안내", content: "# 안내\n수련회 일정입니다",
  isPinned: false, viewCount: 142, createdAt: "2026-06-01T09:00:00",
  updatedAt: "2026-06-01T09:00:00", version: 0,
  tags: [{ id: 3, name: "행사" }], author: "홍길동",
};

describe("NoticeDetailPage (상세)", () => {
  it("제목·메타(날짜·조회수·작성자)·태그·본문 합성(고정 아님 → 배지 없음)", async () => {
    getNotice.mockResolvedValueOnce(base);
    const { container } = render(
      await NoticeDetailPage({ params: Promise.resolve({ id: "5" }) }),
    );
    expect(getNotice).toHaveBeenCalledWith(5);
    expect(screen.getByRole("heading", { name: "2026 여름 수련회 안내" })).toBeDefined();
    // 메타: 날짜 · 조회수 · 작성자(서버 마스킹 그대로)
    expect(container.textContent).toContain("2026. 6. 1.");
    expect(container.textContent).toContain("142");
    expect(container.textContent).toContain("홍길동");
    // 태그 클릭 필터
    expect(screen.getByRole("link", { name: "행사" }).getAttribute("href")).toBe(
      "/notices?tagId=3",
    );
    // 마크다운 본문
    expect(container.querySelector(".prose-church")?.textContent).toContain("수련회 일정입니다");
    // 고정 아님 → "고정" 배지 없음
    expect(screen.queryByText("고정")).toBeNull();
  });

  it("isPinned면 고정 배지 표시", async () => {
    getNotice.mockResolvedValueOnce({ ...base, isPinned: true });
    render(await NoticeDetailPage({ params: Promise.resolve({ id: "5" }) }));
    expect(screen.getByText("고정")).toBeDefined();
  });

  it("author 없으면 메타에서 생략", async () => {
    getNotice.mockResolvedValueOnce({ ...base, author: null });
    const { container } = render(
      await NoticeDetailPage({ params: Promise.resolve({ id: "5" }) }),
    );
    expect(container.textContent).toContain("142");
    expect(container.textContent).not.toContain("홍길동");
  });

  it("없는 공지(null)면 notFound", async () => {
    getNotice.mockResolvedValueOnce(null);
    await expect(
      NoticeDetailPage({ params: Promise.resolve({ id: "99" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("비숫자·0·음수 id면 notFound(fetch 미호출)", async () => {
    await expect(
      NoticeDetailPage({ params: Promise.resolve({ id: "abc" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      NoticeDetailPage({ params: Promise.resolve({ id: "0" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      NoticeDetailPage({ params: Promise.resolve({ id: "-3" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getNotice).not.toHaveBeenCalled();
  });
});

describe("공지 상세 generateMetadata (#117)", () => {
  it("제목·요약·canonical을 산출한다", async () => {
    getNotice.mockResolvedValueOnce({
      ...base,
      id: 7,
      title: "가을 행사 안내",
      content: "# 인사\n\n본문 **강조** 문장.",
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ id: "7" }),
    });
    expect(meta.title).toBe("가을 행사 안내");
    expect(meta.description).toBe("인사 본문 강조 문장.");
    expect(meta.alternates?.canonical).toBe("/notices/7");
  });

  it("잘못된 id·없는 글은 빈 metadata를 반환한다", async () => {
    getNotice.mockResolvedValueOnce(null);
    expect(
      await generateMetadata({ params: Promise.resolve({ id: "abc" }) }),
    ).toEqual({});
    expect(
      await generateMetadata({ params: Promise.resolve({ id: "99" }) }),
    ).toEqual({});
  });
});

const levels = (notices: "PUBLIC" | "MEMBERS") =>
  ({ notices, events: "PUBLIC", bulletins: "PUBLIC", sermons: "MEMBERS", gallery: "MEMBERS" }) as const;

// 공개 범위(#198)
describe("공지 상세 공개 범위", () => {
  it("교인만이면 generateMetadata가 공지를 조회하지 않고 robots noindex", async () => {
    getVisibilityMock.mockResolvedValue(levels("MEMBERS"));
    const meta = await generateMetadata({ params: Promise.resolve({ id: "5" }) });
    expect(getNotice).not.toHaveBeenCalled();
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.title).toBe("공지");
  });

  it("교인만이면 본문은 NOTICE_VIEW 게이트 + 브라우저 상세(서버 조회 0회, 조회수 부수효과 없음)", async () => {
    getVisibilityMock.mockResolvedValue(levels("MEMBERS"));
    render(await NoticeDetailPage({ params: Promise.resolve({ id: "5" }) }));
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("NOTICE_VIEW");
    expect(screen.getByTestId("client-detail").getAttribute("data-id")).toBe("5");
    expect(getNotice).not.toHaveBeenCalled();
    expect(connectionMock).toHaveBeenCalled(); // 교인만 분기엔 no-store 조회가 없어 정적으로 굳지 않게
  });

  it("누구나 + MembersOnlyError면 metadata도 noindex, 본문은 게이트(오류 화면 아님)", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    getNotice.mockRejectedValue(new MembersOnlyError("401"));
    const meta = await generateMetadata({ params: Promise.resolve({ id: "5" }) });
    expect(meta.robots).toEqual({ index: false, follow: false });
    render(await NoticeDetailPage({ params: Promise.resolve({ id: "5" }) }));
    expect(screen.getByTestId("gate")).toBeDefined();
  });

  it("대조: 누구나 + 정상이면 지금처럼 제목·설명 메타(robots 없음)", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    getNotice.mockResolvedValueOnce(base);
    const meta = await generateMetadata({ params: Promise.resolve({ id: "5" }) });
    expect(meta.title).toBe(base.title);
    expect(meta.robots).toBeUndefined();
  });

  // 서버 렌더 경로는 응답 mediaUrls를 쓰지 않는다(누구나 메뉴 전용 — 캐시된 HTML에 1시간짜리 서명 주소를 굽지 않게).
  // 서명 주소·맵에 없는 이미지 제거 대조(브라우저 조회 경로)는 NoticeMemberViews.test.
  it("응답에 mediaUrls가 있어도 서버 렌더 본문 이미지는 무서명 /api/media/{id}", async () => {
    getVisibilityMock.mockResolvedValue(levels("PUBLIC"));
    getNotice.mockResolvedValueOnce({
      ...base,
      content: "![](media:42)\n\n![](media:43)",
      mediaUrls: { "42": "/api/media/42?exp=1&sig=s" },
    });
    const { container } = render(await NoticeDetailPage({ params: Promise.resolve({ id: "5" }) }));
    const srcs = [...container.querySelectorAll(".prose-church img")].map((i) => i.getAttribute("src"));
    expect(srcs).toEqual(["/api/media/42", "/api/media/43"]);
  });
});
