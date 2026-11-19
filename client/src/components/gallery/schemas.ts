// src/components/gallery/schemas.ts
import { z } from "zod";

export const albumSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요.").max(200),
  description: z.string().max(50000),
  tagIds: z.array(z.number()),
  membersOnly: z.boolean(), // 이 앨범은 교인만 보기
});
export type AlbumFormValues = z.infer<typeof albumSchema>;
