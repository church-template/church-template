"use client";

import { useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/Textarea";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import type { MediaResponse } from "@/lib/api/media.admin";
import { unsignedMediaUrls } from "@/lib/markdown";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  error?: string;
  placeholder?: string;
  /** Textarea 행 수. 미지정 시 Textarea 기본(12) 유지 — 폼별로 높이를 조정할 때 사용. */
  rows?: number;
  /** 미리보기 media:{id} → 서명 경로 초기값(앨범 수정 시 응답 mediaUrls). */
  mediaUrls?: Record<string, string>;
}

// Radix TabsContent는 비활성 탭의 자식을 아예 마운트하지 않는다.
// → preview 탭이 선택될 때만 MarkdownContent가 마운트되므로 작성 중 renderMarkdown은 실행되지 않는다.
export function MarkdownEditor({ value, onChange, id, error, placeholder, rows, mediaUrls }: MarkdownEditorProps) {
  const [tab, setTab] = useState("write");
  // 이번 편집에서 고른 미디어의 서명 경로 — 아직 아무 데도 안 쓰인 파일은 무서명 주소가 404라 미리보기에 필요.
  const [pickedUrls, setPickedUrls] = useState<Record<string, string>>({});
  // 앨범(서명 맵 있음)은 맵 그대로 — 없는 id는 상세 화면처럼 숨김. 그 밖의 본문은 저장된 이미지가 공개라 무서명으로 채운다.
  const previewUrls = { ...(mediaUrls ?? unsignedMediaUrls(value)), ...pickedUrls };
  const handlePicked = (picked: MediaResponse[]) =>
    setPickedUrls((prev) => ({
      ...prev,
      ...Object.fromEntries(picked.flatMap((m) => (m.url ? [[String(m.id), m.url]] : []))),
    }));
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="write">작성</TabsTrigger>
        <TabsTrigger value="preview">미리보기</TabsTrigger>
      </TabsList>
      <TabsContent value="write">
        <div className="flex flex-col gap-xs">
          <MarkdownToolbar textareaRef={textareaRef} value={value} onChange={onChange} onMediaPicked={handlePicked} />
          <Textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
            placeholder={placeholder}
            rows={rows}
          />
        </div>
      </TabsContent>
      <TabsContent value="preview">
        {value.trim() ? (
          <MarkdownContent source={value} mediaUrls={previewUrls} />
        ) : (
          <p className={cn(typo.bodySm, "text-muted")}>미리볼 내용이 없습니다.</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
