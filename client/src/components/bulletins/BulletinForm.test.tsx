import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock("@/lib/api/bulletins.admin", () => ({ createBulletin: vi.fn(), patchBulletin: vi.fn() }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateBulletins: vi.fn() }));
vi.mock("@/components/admin/MediaPicker", () => ({ MediaPicker: () => null }));
vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

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
