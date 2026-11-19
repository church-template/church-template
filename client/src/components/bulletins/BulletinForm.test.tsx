import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/auth/apiError";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock("@/lib/api/bulletins.admin", () => ({ createBulletin: vi.fn(), patchBulletin: vi.fn() }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateBulletins: vi.fn() }));
vi.mock("@/components/admin/MediaPicker", () => ({ MediaPicker: () => null }));
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

import { BulletinForm } from "./BulletinForm";
import type { BulletinDetailResponse } from "@/lib/api/types";

afterEach(() => vi.useRealTimers());

describe("BulletinForm 예배일 초기값", () => {
  it("새 주보는 예배일이 오늘(KST)로 채워져 열린다", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-19T05:07:00Z")); // = 2026-07-19 KST
    render(<BulletinForm mode="create" />);
    expect((screen.getByLabelText("예배일") as HTMLInputElement).value).toBe("2026-07-19");
  });

  it("수정은 저장된 예배일을 그대로 보인다", () => {
    const initial = { id: 1, title: "주보", serviceDate: "2026-06-07", mediaId: 4, version: 0 } as BulletinDetailResponse;
    render(<BulletinForm mode="edit" initial={initial} />);
    expect((screen.getByLabelText("예배일") as HTMLInputElement).value).toBe("2026-06-07");
  });
});

describe("BulletinForm 교인만 모드(#198)", () => {
  const initial = { id: 1, title: "주보", serviceDate: "2026-06-07", mediaId: 4, version: 0 } as BulletinDetailResponse;
  it("409면 ['bulletin', id]를 무효화해 로더가 최신 version으로 다시 시드한다", () => {
    render(<BulletinForm mode="edit" initial={initial} />);
    mutationRef.current?.onError?.(new ApiError(409, "OPTIMISTIC_LOCK_CONFLICT", undefined));
    expect(invalidateMock).toHaveBeenCalledWith({ queryKey: ["bulletin", 1] });
  });
});
