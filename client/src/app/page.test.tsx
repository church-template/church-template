import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { WORSHIP, MAIN_SECTIONS, CTA_BAND, HISTORY, MINISTRY, COLLAGE_SECTION } from "@/constants/content";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/api/main", () => ({
  getMain: vi.fn(async () => ({
    sermons: [
      {
        id: 1,
        title: "부활의 증인",
        preacher: "김목사",
        series: null,
        scripture: null,
        preachedAt: "2026-06-01",
        viewCount: 0,
        tags: [],
      },
    ],
    notices: [
      {
        id: 2,
        title: "전교인 수련회 안내",
        isPinned: true,
        viewCount: 0,
        createdAt: "2026-06-02T09:00:00",
        tags: [],
      },
    ],
    upcomingEvents: [
      {
        id: 3,
        title: "성가대 연습",
        location: "본당",
        startAt: "2026-06-14T10:00:00",
        endAt: null,
        allDay: false,
        tags: [],
      },
    ],
  })),
}));

import Home from "./page";
import { getMain } from "@/lib/api/main";

function stubBrowserApis() {
  // jsdom 미구현 API — CrossHero(matchMedia)·HeroHeaderSync(IO)가 사용.
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Home (메인)", () => {
  it("예배·설교·교회 소식 섹션과 CTA·푸터를 합성한다", async () => {
    stubBrowserApis();
    const { container } = render(await Home());
    // 섹션 타이틀은 h2(heading)로 좁힘 — 푸터 nav <a>와 텍스트 중복 방어
    expect(screen.getByRole("heading", { name: WORSHIP.title })).toBeDefined();
    expect(screen.getByRole("heading", { name: MAIN_SECTIONS.sermons.title })).toBeDefined();
    expect(screen.getByText("부활의 증인")).toBeDefined();
    // 공지·일정은 "교회 소식" 탭 하나 — 처음엔 공지 탭 내용만 렌더된다(일정 탭 내용은 NewsSection 테스트)
    expect(screen.getByRole("heading", { name: MAIN_SECTIONS.news.title })).toBeDefined();
    expect(screen.getByRole("tab", { name: MAIN_SECTIONS.notices.title })).toBeDefined();
    expect(screen.getByRole("tab", { name: MAIN_SECTIONS.events.title })).toBeDefined();
    expect(screen.getByText("전교인 수련회 안내")).toBeDefined();
    expect(screen.getByText(CTA_BAND.heading)).toBeDefined();
    expect(screen.getByRole("contentinfo")).toBeDefined();
    expect(screen.getByText("부활의 증인").closest("a")?.getAttribute("href")).toBe(
      "/sermons/1",
    );
    // 장면 섹션(콜라주)은 히어로 밖, 히어로 바로 다음에 합성된다(#157)
    const collageImg = container.querySelector('img[src="/collage-1.jpeg"]')!;
    expect(collageImg).not.toBeNull();
    expect(collageImg.closest("section")?.querySelector("h2")?.textContent).toBe(COLLAGE_SECTION.title);
    // 연혁·사역 섹션이 장면 섹션 뒤에 합성된다(스펙 H1)
    const historyHead = screen.getByText(HISTORY.items[0].text);
    expect(
      collageImg.compareDocumentPosition(historyHead) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: MINISTRY.title })).toBeDefined();
  });

  it("히어로 카피는 줄 단위로 DOM에 존재한다(SEO)", async () => {
    stubBrowserApis();
    const { HERO_CAPTION } = await import("@/constants/church");
    render(await Home());
    for (const line of HERO_CAPTION) {
      expect(screen.getByText(line)).toBeDefined();
    }
  });

  it("소식 로드 실패 시 그 자리에만 폴백이 뜨고 나머지 섹션은 살아남는다(장애 격리)", async () => {
    stubBrowserApis();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getMain).mockRejectedValueOnce(new Error("backend down"));
    render(await Home());
    // 소식 자리엔 폴백 문구
    expect(screen.getByText(MAIN_SECTIONS.error)).toBeDefined();
    // 페이지 나머지(예배·CTA·푸터)는 정상 렌더
    expect(screen.getByRole("heading", { name: WORSHIP.title })).toBeDefined();
    expect(screen.getByText(CTA_BAND.heading)).toBeDefined();
    expect(screen.getByRole("contentinfo")).toBeDefined();
    // 설교 데이터는 노출되지 않는다
    expect(screen.queryByText("부활의 증인")).toBeNull();
  });
});
