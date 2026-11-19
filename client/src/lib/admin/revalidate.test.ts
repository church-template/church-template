import { describe, it, expect, vi, afterEach } from "vitest";

const { updateTagMock } = vi.hoisted(() => ({ updateTagMock: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: updateTagMock }));

import { revalidateEvents, revalidateNotices, revalidateTags, revalidateVisibility, revalidateMain } from "./revalidate";

afterEach(() => vi.clearAllMocks());

describe("어드민 캐시 무효화 서버 액션", () => {
  it("revalidateEvents는 events 태그를 즉시 무효화한다", async () => {
    await revalidateEvents();
    expect(updateTagMock).toHaveBeenCalledWith("events");
  });
  it("revalidateNotices는 notices 태그를 무효화한다", async () => {
    await revalidateNotices();
    expect(updateTagMock).toHaveBeenCalledWith("notices");
  });
  it("revalidateVisibility는 visibility·notices·events·bulletins·main을 즉시 무효화한다", async () => {
    await revalidateVisibility();
    expect(updateTagMock.mock.calls.map((c) => c[0]).sort()).toEqual(["bulletins", "events", "main", "notices", "visibility"]);
  });
  it("revalidateMain은 main만", async () => {
    await revalidateMain();
    expect(updateTagMock.mock.calls.map((c) => c[0])).toEqual(["main"]);
  });
  it("대조: revalidateTags는 여전히 tags만", async () => {
    await revalidateTags();
    expect(updateTagMock.mock.calls.map((c) => c[0])).toEqual(["tags"]);
  });
});
