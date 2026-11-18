import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownEditor } from "./MarkdownEditor";

describe("MarkdownEditor", () => {
  it("작성 탭에서 입력하면 onChange로 값을 올린다", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "안녕하세요" } });
    expect(onChange).toHaveBeenCalledWith("안녕하세요");
  });

  it("미리보기 탭으로 전환하면 마크다운이 HTML로 렌더된다", () => {
    render(<MarkdownEditor value={"# 환영합니다"} onChange={() => {}} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "미리보기" })); // Radix Tabs는 jsdom에서 click 미동작
    expect(screen.getByRole("heading", { name: "환영합니다" })).toBeDefined();
  });

  it("본문이 비어 있으면 미리보기에 안내문을 보인다", () => {
    render(<MarkdownEditor value="   " onChange={() => {}} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "미리보기" })); // Radix Tabs는 jsdom에서 click 미동작
    expect(screen.getByText("미리볼 내용이 없습니다.")).toBeDefined();
  });

  it("rows를 Textarea에 전달한다", () => {
    const { container } = render(<MarkdownEditor value="" onChange={() => {}} rows={5} />);
    expect(container.querySelector("textarea")?.getAttribute("rows")).toBe("5");
  });

  it("작성 탭에 서식 툴바를 보인다", () => {
    render(<MarkdownEditor value="" onChange={() => {}} />);
    expect(screen.getByRole("toolbar", { name: "서식 도구" })).toBeDefined();
  });

  it("앨범 미리보기(mediaUrls 있음)는 서명 주소로 그리고, 맵에 없는 id는 상세 화면처럼 숨긴다", () => {
    const { container } = render(
      <MarkdownEditor value={"![a](media:3)\n\n![b](media:4)"} onChange={() => {}} mediaUrls={{ "3": "/api/media/3?exp=1&sig=q" }} />,
    );
    fireEvent.mouseDown(screen.getByRole("tab", { name: "미리보기" }));
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(srcs).toEqual(["/api/media/3?exp=1&sig=q"]);
  });

  it("서명 맵이 없는 본문(공지 등)은 저장된 이미지를 무서명으로 계속 보인다", () => {
    const { container } = render(<MarkdownEditor value={"![a](media:4)"} onChange={() => {}} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "미리보기" }));
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/api/media/4");
  });
});
