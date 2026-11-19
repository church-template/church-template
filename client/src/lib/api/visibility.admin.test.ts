import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { fetchVisibility, updateVisibility } from "./visibility.admin";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const levels = { notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "MEMBERS", gallery: "MEMBERS" } as const;

describe("visibility.admin", () => {
  it("fetchVisibility는 60초 캐시가 아닌 지금 값을 no-store로 읽는다", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(levels), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchVisibility()).toEqual(levels);
    expect(fetchMock).toHaveBeenCalledWith("/api/visibility", { cache: "no-store" });
  });
  it("fetchVisibility 실패는 ApiError(errorCode)로 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ errorCode: "INTERNAL_ERROR" }), { status: 500 })));
    await expect(fetchVisibility()).rejects.toMatchObject({ errorCode: "INTERNAL_ERROR" });
  });
  it("updateVisibility는 PUT /api/admin/visibility로 5개 값을 보낸다", async () => {
    apiMutateMock.mockResolvedValue(levels);
    await updateVisibility(levels);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/visibility", { method: "PUT", body: levels });
  });
});
