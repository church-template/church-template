import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/auth/apiError";
import { VISIBILITY_COPY } from "@/constants/visibility";

const { perms, searchParamsRef, pathnameRef, patchSermonMock, patchAlbumMock, revalidateMainMock, notifySuccess, notifyError } = vi.hoisted(() => ({
  perms: { current: [] as string[] },
  searchParamsRef: { current: new URLSearchParams("") },
  pathnameRef: { current: "/sermons" },
  patchSermonMock: vi.fn(),
  patchAlbumMock: vi.fn(),
  revalidateMainMock: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@/lib/auth/useMe", () => ({ useHasPermission: (p: string) => perms.current.includes(p) }));
vi.mock("@/lib/api/sermons.admin", () => ({ patchSermon: patchSermonMock }));
vi.mock("@/lib/api/gallery.admin", () => ({ patchAlbum: patchAlbumMock }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateMain: revalidateMainMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: notifyError } }));
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParamsRef.current, usePathname: () => pathnameRef.current }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { MembersOnlyToggle, MembersOnlyBanner } from "./MembersOnlyToggle";

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  perms.current = ["SERMON_WRITE", "GALLERY_WRITE"];
  searchParamsRef.current = new URLSearchParams("");
  pathnameRef.current = "/sermons";
  patchSermonMock.mockResolvedValue({});
  patchAlbumMock.mockResolvedValue({});
  revalidateMainMock.mockResolvedValue(undefined);
});
afterEach(() => vi.clearAllMocks());
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

describe("MembersOnlyToggle", () => {
  it("누구나 글이면 버튼 글자 '누구나 공개', 누르면 membersOnly:true와 version으로 PATCH하고 Toast", async () => {
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    wrap(<MembersOnlyToggle kind="sermon" id={7} title="주일 설교" version={3} membersOnly={false} />);
    // 접근 이름 = 보이는 글자로 시작(WCAG 2.5.3 — 음성 제어로 "누구나 공개"를 불러도 눌린다) + 숨긴 동작 문장
    const btn = screen.getByRole("button", { name: "누구나 공개, 주일 설교 설교를 교인만 보도록 바꾸기" });
    expect(btn.hasAttribute("aria-label")).toBe(false);
    expect(btn.querySelector(".sr-only")?.textContent).toBe(", 주일 설교 설교를 교인만 보도록 바꾸기");
    fireEvent.click(btn);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith("교인만 볼 수 있게 바꿨습니다."));
    expect(patchSermonMock).toHaveBeenCalledWith(7, { membersOnly: true, version: 3 });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermons"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermon", 7] });
  });

  it("교인만 글이면 버튼 글자 '교인만', 누르면 누구나로 바꾸고 Toast '누구나 볼 수 있게 바꿨습니다.'", async () => {
    wrap(<MembersOnlyToggle kind="album" id={5} title="달란트 시장" version={2} membersOnly />);
    const btn = screen.getByRole("button", { name: "교인만, 달란트 시장 앨범을 누구나 보도록 바꾸기" });
    expect(btn.hasAttribute("aria-label")).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith("누구나 볼 수 있게 바꿨습니다."));
    expect(patchAlbumMock).toHaveBeenCalledWith(5, { membersOnly: false, version: 2 });
  });

  it("설교를 바꾸면 홈 캐시도 지운다", async () => {
    wrap(<MembersOnlyToggle kind="sermon" id={7} title="주일 설교" version={3} membersOnly={false} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
    expect(revalidateMainMock).toHaveBeenCalledTimes(1);
  });

  it("홈 캐시 지우기가 실패해도 바뀐 결과 Toast와 목록 무효화는 그대로(실패는 로그만)", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    revalidateMainMock.mockRejectedValueOnce(new Error("server action failed"));
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    wrap(<MembersOnlyToggle kind="sermon" id={7} title="주일 설교" version={3} membersOnly={false} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(VISIBILITY_COPY.toastMembers));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermons"] });
    expect(notifyError).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it("대조: 앨범을 바꿀 때는 홈 캐시를 지우지 않는다", async () => {
    wrap(<MembersOnlyToggle kind="album" id={5} title="달란트 시장" version={2} membersOnly={false} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
    expect(revalidateMainMock).not.toHaveBeenCalled();
  });

  it("409면 목록을 다시 받아 최신 version을 쓰게 한다", async () => {
    patchAlbumMock.mockRejectedValue(new ApiError(409, "OPTIMISTIC_LOCK_CONFLICT", undefined));
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    wrap(<MembersOnlyToggle kind="album" id={5} title="달란트 시장" version={2} membersOnly={false} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["albums"] }));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it("부서에 연결된 누구나 앨범은 버튼('누구나 공개')이 비활성이고 안내가 보인다", () => {
    wrap(<MembersOnlyToggle kind="album" id={5} title="달란트 시장" version={2} membersOnly={false} departmentLinked />);
    const btn = screen.getByRole("button", { name: "누구나 공개, 달란트 시장 앨범을 교인만 보도록 바꾸기" });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(VISIBILITY_COPY.deptLinked)).toBeDefined();
  });

  it("대조: 부서 연결 앨범이라도 이미 교인만이면 버튼('교인만')을 눌러 누구나로 바꿀 수 있다", async () => {
    wrap(<MembersOnlyToggle kind="album" id={5} title="달란트 시장" version={2} membersOnly departmentLinked />);
    const btn = screen.getByRole("button");
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(VISIBILITY_COPY.deptLinked)).toBeNull();
    fireEvent.click(btn);
    await waitFor(() => expect(patchAlbumMock).toHaveBeenCalledWith(5, { membersOnly: false, version: 2 }));
  });

  it("SERMON_WRITE가 없으면 버튼을 그리지 않는다", () => {
    perms.current = ["SERMON_VIEW"];
    wrap(<MembersOnlyToggle kind="sermon" id={7} title="주일 설교" version={3} membersOnly />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("대조: SERMON_WRITE만 있으면 설교 버튼은 그리고 앨범 버튼은 그리지 않는다", () => {
    perms.current = ["SERMON_WRITE"];
    wrap(
      <>
        <MembersOnlyToggle kind="sermon" id={7} title="주일 설교" version={3} membersOnly />
        <MembersOnlyToggle kind="album" id={5} title="달란트 시장" version={2} membersOnly />
      </>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^교인만, 주일 설교 설교를/ })).toBeDefined();
  });
});

// 고르기 모드(#201) — 메뉴가 교인만일 때 버튼 글자는 "메뉴를 누구나로 열었을 때"의 결과를 말한다.
describe("MembersOnlyToggle 고르기 모드", () => {
  it("표시 없는 설교: 글자 '열면 공개', 숨긴 동작도 연 뒤 기준, 누르면 교인만으로 저장 + 고르기 Toast", async () => {
    wrap(<MembersOnlyToggle kind="sermon" id={7} title="은혜로 사는 삶" version={3} membersOnly={false} pickMode />);
    const btn = screen.getByRole("button", { name: "열면 공개, 은혜로 사는 삶 설교는 메뉴를 열어도 교인만 보도록 바꾸기" });
    expect(btn.hasAttribute("aria-label")).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith("열어도 교인만 보게 바꿨습니다."));
    expect(patchSermonMock).toHaveBeenCalledWith(7, { membersOnly: true, version: 3 });
  });

  it("표시한 앨범: 글자 '열어도 교인만', 누르면 표시를 풀고 고르기 Toast", async () => {
    wrap(<MembersOnlyToggle kind="album" id={5} title="달란트 시장" version={2} membersOnly pickMode />);
    const btn = screen.getByRole("button", { name: "열어도 교인만, 달란트 시장 앨범은 메뉴를 열면 누구나 보도록 바꾸기" });
    fireEvent.click(btn);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith("열면 누구나 볼 수 있게 바꿨습니다."));
    expect(patchAlbumMock).toHaveBeenCalledWith(5, { membersOnly: false, version: 2 });
  });

  it("부서에 연결된 표시 없는 앨범은 고르기 모드에서도 비활성 + 안내", () => {
    wrap(<MembersOnlyToggle kind="album" id={5} title="달란트 시장" version={2} membersOnly={false} departmentLinked pickMode />);
    const btn = screen.getByRole("button", { name: /^열면 공개,/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(VISIBILITY_COPY.deptLinked)).toBeDefined();
  });

  it("409면 고르기 모드에서도 목록을 다시 받는다", async () => {
    patchSermonMock.mockRejectedValue(new ApiError(409, "OPTIMISTIC_LOCK_CONFLICT", undefined));
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    wrap(<MembersOnlyToggle kind="sermon" id={7} title="주일 설교" version={3} membersOnly={false} pickMode />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermons"] }));
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe("MembersOnlyBanner", () => {
  const banner = (menu: "sermons" | "gallery", menuLevel: "PUBLIC" | "MEMBERS") =>
    wrap(<MembersOnlyBanner menu={menu} menuLevel={menuLevel} />);

  it("메뉴가 교인만이고 글을 쓰는 사람이면 문장 + 고르기 링크(지금 조건에 pick=1을 더한다)", () => {
    searchParamsRef.current = new URLSearchParams("tagId=3&page=1");
    banner("sermons", "MEMBERS");
    expect(screen.getByText("지금은 설교 전체가 교인 전용입니다.")).toBeDefined();
    const link = screen.getByRole("link", { name: "열기 전에 교인 전용 글 고르기" });
    expect(link.getAttribute("href")).toBe("/sermons?tagId=3&page=1&pick=1");
  });

  it("갤러리 문장은 갤러리 이름으로", () => {
    pathnameRef.current = "/gallery";
    banner("gallery", "MEMBERS");
    expect(screen.getByText("지금은 갤러리 전체가 교인 전용입니다.")).toBeDefined();
    expect(screen.getByRole("link", { name: "열기 전에 교인 전용 글 고르기" }).getAttribute("href")).toBe("/gallery?pick=1");
  });

  it("고르기 모드면 연 뒤 기준 문장 + '고르기 끝내기'(pick만 뺀다)", () => {
    searchParamsRef.current = new URLSearchParams("tagId=3&pick=1");
    banner("sermons", "MEMBERS");
    expect(
      screen.getByText("지금은 설교 전체가 교인 전용입니다. 아래 표시는 설교를 누구나로 열었을 때 적용됩니다."),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "고르기 끝내기" }).getAttribute("href")).toBe("/sermons?tagId=3");
    expect(screen.queryByRole("link", { name: "열기 전에 교인 전용 글 고르기" })).toBeNull();
  });

  it("고르기 끝내기: 다른 조건이 없으면 목록 주소만", () => {
    pathnameRef.current = "/gallery";
    searchParamsRef.current = new URLSearchParams("pick=1");
    banner("gallery", "MEMBERS");
    expect(
      screen.getByText("지금은 갤러리 전체가 교인 전용입니다. 아래 표시는 갤러리를 누구나로 열었을 때 적용됩니다."),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "고르기 끝내기" }).getAttribute("href")).toBe("/gallery");
  });

  it("대조: 메뉴가 누구나면 없다(pick=1이 있어도)", () => {
    searchParamsRef.current = new URLSearchParams("pick=1");
    const { container } = banner("sermons", "PUBLIC");
    expect(container.textContent).toBe("");
  });

  it("대조: SERMON_WRITE가 없으면 없다(pick=1이 있어도)", () => {
    perms.current = ["SERMON_VIEW", "GALLERY_WRITE"];
    searchParamsRef.current = new URLSearchParams("pick=1");
    const { container } = banner("sermons", "MEMBERS");
    expect(container.textContent).toBe("");
  });
});
