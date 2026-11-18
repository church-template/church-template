import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock("@/lib/api/events.admin", () => ({ createEvent: vi.fn(), updateEvent: vi.fn() }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateEvents: vi.fn() }));
vi.mock("@/components/admin/TagMultiSelect", () => ({ TagMultiSelect: () => null }));
vi.mock("@/components/admin/MarkdownEditor", () => ({ MarkdownEditor: () => null }));
vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

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
