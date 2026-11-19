// src/app/(site)/notices/[id]/edit/page.test.tsx
// sermons/[id]/edit/page.test.tsx 패턴을 미러링 — 가드 동작(notFound·fetch 미호출·mode='edit' 전달) 검증
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { getNotice } = vi.hoisted(() => ({ getNotice: vi.fn() }));
vi.mock("@/lib/api/notices", () => ({ getNotice }));
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
vi.mock("@/components/admin/RequirePermission", () => ({
  RequirePermission: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/admin/EditGate", () => ({
  EditAccessDenied: () => <div data-testid="access-denied" />,
}));
// 수정 화면은 설정과 무관하게 브라우저에서 읽는다(교인만이면 서버가 읽을 수 없다, 스펙 6.3).
vi.mock("@/components/notices/NoticeMemberViews", () => ({
  NoticeEditLoader: ({ id }: { id: number }) => <div data-testid="notice-edit-loader" data-id={id} />,
}));

import NoticeEditPage from "./page";

afterEach(() => vi.clearAllMocks());

describe("NoticeEditPage (수정)", () => {
  it("수정 화면은 설정과 무관하게 NoticeEditLoader를 그리고 서버 조회하지 않는다", async () => {
    render(await NoticeEditPage({ params: Promise.resolve({ id: "5" }) }));
    expect(screen.getByTestId("notice-edit-loader").getAttribute("data-id")).toBe("5");
    expect(getNotice).not.toHaveBeenCalled();
  });

  // 기존 "없는 공지(null)면 notFound"의 기대를 바꾼 것 — 없는 글 판단은 브라우저 로더가 응답으로 한다(NoticeMemberViews.test).
  it("없는 공지 판단은 서버가 하지 않는다(notFound 대신 로더)", async () => {
    render(await NoticeEditPage({ params: Promise.resolve({ id: "99" }) }));
    expect(screen.getByTestId("notice-edit-loader").getAttribute("data-id")).toBe("99");
    expect(getNotice).not.toHaveBeenCalled();
  });

  it("비숫자 id면 notFound(fetch 미호출)", async () => {
    await expect(
      NoticeEditPage({ params: Promise.resolve({ id: "abc" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getNotice).not.toHaveBeenCalled();
  });

  it("id가 0·음수면 notFound(fetch 미호출)", async () => {
    await expect(
      NoticeEditPage({ params: Promise.resolve({ id: "0" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      NoticeEditPage({ params: Promise.resolve({ id: "-3" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getNotice).not.toHaveBeenCalled();
  });
});
