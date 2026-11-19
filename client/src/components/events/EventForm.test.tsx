import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/auth/apiError";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock("@/lib/api/events.admin", () => ({ createEvent: vi.fn(), updateEvent: vi.fn() }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateEvents: vi.fn() }));
vi.mock("@/components/admin/TagMultiSelect", () => ({ TagMultiSelect: () => null }));
vi.mock("@/components/admin/MarkdownEditor", () => ({
  MarkdownEditor: ({ mediaUrls }: { mediaUrls?: Record<string, string> }) => (
    <div data-testid="md" data-media-urls={JSON.stringify(mediaUrls ?? null)} />
  ),
}));
// 409 처리(onError)를 직접 부르려고 useMutation 옵션을 잡아 둔다. 무효화 대상은 invalidate 스파이로 본다.
const { mutationRef, invalidateMock } = vi.hoisted(() => ({
  mutationRef: { current: null as null | { onError?: (e: unknown) => void } },
  invalidateMock: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useMutation: (opts: { onError?: (e: unknown) => void }) => {
    mutationRef.current = opts;
    return { mutate: vi.fn(), isPending: false };
  },
  useQueryClient: () => ({ invalidateQueries: invalidateMock }),
}));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { EventForm } from "./EventForm";
import type { EventDetailResponse } from "@/lib/api/types";

afterEach(() => vi.useRealTimers());

describe("EventForm 시작 일시 초기값", () => {
  it("새 일정은 시작이 지금(KST)으로 채워져 열린다, 종료는 비어 있다", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-19T05:07:00Z")); // = 2026-07-19 14:07 KST
    render(<EventForm mode="create" />);
    expect((screen.getByLabelText("시작") as HTMLInputElement).value).toBe("2026-07-19T14:07");
    expect((screen.getByLabelText("종료(선택)") as HTMLInputElement).value).toBe("");
  });

  it("수정은 저장된 시작·종료를 그대로 보인다", () => {
    const initial = {
      id: 1, title: "수련회", startAt: "2026-08-01T09:00:00", endAt: "2026-08-02T18:00:00",
      allDay: false, location: "", description: "", tags: [], version: 0,
    } as unknown as EventDetailResponse;
    render(<EventForm mode="edit" initial={initial} />);
    expect((screen.getByLabelText("시작") as HTMLInputElement).value).toBe("2026-08-01T09:00");
    expect((screen.getByLabelText("종료(선택)") as HTMLInputElement).value).toBe("2026-08-02T18:00");
  });
});

describe("EventForm 교인만 모드(#198)", () => {
  const initial = {
      id: 1, title: "수련회", startAt: "2026-08-01T09:00:00", endAt: null,
      allDay: false, location: "", description: "", tags: [], version: 0,
      mediaUrls: { "9": "/api/media/9?exp=1&sig=e" },
    } as unknown as EventDetailResponse;
  it("409면 ['event', id]를 무효화해 로더가 최신 version으로 다시 시드한다", () => {
    render(<EventForm mode="edit" initial={initial} />);
    mutationRef.current?.onError?.(new ApiError(409, "OPTIMISTIC_LOCK_CONFLICT", undefined));
    expect(invalidateMock).toHaveBeenCalledWith({ queryKey: ["event", 1] });
  });
  it("일정 편집 미리보기에 mediaUrls를 넘긴다", () => {
    render(<EventForm mode="edit" initial={initial} />);
    expect(screen.getByTestId("md").getAttribute("data-media-urls")).toBe(JSON.stringify({ "9": "/api/media/9?exp=1&sig=e" }));
  });
});
