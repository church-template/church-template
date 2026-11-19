import { describe, it, expect } from "vitest";
import { VISIBILITY_COPY, VISIBILITY_FALLBACK, VISIBILITY_MENUS, openConfirmMessage, toggleActionText } from "./visibility";

describe("openConfirmMessage", () => {
  it("갤러리 확인 문장은 스펙 4B 그대로", () => {
    expect(openConfirmMessage("gallery", { total: 32, membersOnly: 9 })).toBe(
      "갤러리를 누구나 볼 수 있게 바꿉니다. 앨범 32개 중 9개는 교인만 보고, 23개는 로그인하지 않은 사람에게도 보입니다.",
    );
  });
  it("설교 확인 문장(편)", () => {
    expect(openConfirmMessage("sermons", { total: 10, membersOnly: 2 })).toBe(
      "설교를 누구나 볼 수 있게 바꿉니다. 설교 10편 중 2편은 교인만 보고, 8편은 로그인하지 않은 사람에게도 보입니다.",
    );
  });
  it("숫자가 없을 때와 글 단위 표시가 없는 메뉴", () => {
    expect(openConfirmMessage("events")).toBe("일정을 누구나 볼 수 있게 바꿉니다. 로그인하지 않은 사람에게도 보입니다.");
    expect(openConfirmMessage("notices")).toBe("공지를 누구나 볼 수 있게 바꿉니다. 로그인하지 않은 사람에게도 보입니다.");
    expect(openConfirmMessage("gallery")).toBe("갤러리를 누구나 볼 수 있게 바꿉니다. 교인만으로 표시한 앨범은 계속 교인만 봅니다.");
    expect(openConfirmMessage("sermons")).toBe("설교를 누구나 볼 수 있게 바꿉니다. 교인만으로 표시한 설교는 계속 교인만 봅니다.");
  });
});

describe("toggleActionText", () => {
  it("보이는 버튼 글자 뒤에 붙을 동작(쉼표로 시작)을 말한다", () => {
    expect(toggleActionText("album", "달란트 시장", true)).toBe(", 달란트 시장 앨범을 교인만 보도록 바꾸기");
    expect(toggleActionText("sermon", "은혜의 길", false)).toBe(", 은혜의 길 설교를 누구나 보도록 바꾸기");
  });
});

describe("VISIBILITY_MENUS · VISIBILITY_FALLBACK", () => {
  it("메뉴 5개를 순서대로, 설교·갤러리만 글 단위", () => {
    expect(VISIBILITY_MENUS.map((m) => m.key)).toEqual(["notices", "events", "bulletins", "sermons", "gallery"]);
    expect(VISIBILITY_MENUS.filter((m) => m.perItem).map((m) => m.key)).toEqual(["sermons", "gallery"]);
    expect(VISIBILITY_MENUS.find((m) => m.key === "events")).toMatchObject({
      label: "일정", viewPermission: "EVENT_VIEW", writePermission: "EVENT_WRITE", href: "/events",
    });
  });
  it("실패 시 값은 지금 동작(닫힌 쪽)", () => {
    expect(VISIBILITY_FALLBACK).toEqual({
      notices: "PUBLIC", events: "PUBLIC", bulletins: "PUBLIC", sermons: "MEMBERS", gallery: "MEMBERS",
    });
  });
});

describe("VISIBILITY_COPY", () => {
  const all = JSON.stringify(VISIBILITY_COPY) + VISIBILITY_MENUS.map((m) => m.label).join("") +
    VISIBILITY_MENUS.map((m) => openConfirmMessage(m.key, { total: 3, membersOnly: 1 }) + openConfirmMessage(m.key)).join("");
  it("문구에 '권한'·'퍼블릭'이 없다", () => expect(all).not.toMatch(/권한|퍼블릭/));
  it("대조: 문구에 '누구나'와 '교인만'은 있다", () => {
    expect(all).toMatch(/누구나/);
    expect(all).toMatch(/교인만/);
  });
});
