import { describe, it, expect } from "vitest";
import { mediaRemotePatterns } from "./mediaRemotePattern";

describe("mediaRemotePatterns", () => {
  it("API 베이스에 교회 접두사가 있으면 경로에 그대로 보존한다", () => {
    const [pattern] = mediaRemotePatterns("https://api.example.com/church/eunsaem");
    expect(pattern.protocol).toBe("https:");
    expect(pattern.hostname).toBe("api.example.com");
    expect(pattern.pathname).toBe("/church/eunsaem/api/media/**");
  });

  it("접두사가 없는 베이스(로컬 개발)는 기존과 같은 경로다", () => {
    const [pattern] = mediaRemotePatterns("http://localhost:8080");
    expect(pattern.hostname).toBe("localhost");
    expect(pattern.port).toBe("8080");
    expect(pattern.pathname).toBe("/api/media/**");
  });

  it("끝에 슬래시가 붙어도 결과가 같다", () => {
    expect(mediaRemotePatterns("https://api.example.com/church/eunsaem/")[0].pathname).toBe(
      "/church/eunsaem/api/media/**",
    );
    expect(mediaRemotePatterns("http://localhost:8080/")[0].pathname).toBe("/api/media/**");
  });

  it("베이스가 없으면(CI 빌드) 원격 패턴이 없다", () => {
    expect(mediaRemotePatterns(undefined)).toEqual([]);
    expect(mediaRemotePatterns("")).toEqual([]);
  });
});
