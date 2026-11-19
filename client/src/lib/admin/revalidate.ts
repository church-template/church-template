"use server";

import { updateTag } from "next/cache";

// 어드민 쓰기(생성·수정·삭제) 성공 후 client onSuccess에서 await 호출 → 해당 도메인 공개 ISR 캐시를
// 즉시 무효화(read-your-own-writes). updateTag는 server action 전용·단일 인자·즉시(Next 16).
// 다음 요청이 stale 캐시 없이 fresh 데이터를 fetches한다.
// (revalidateTag 단일 인자는 legacy behavior — updateTag가 read-your-own-writes 전용 명시 API)
export async function revalidateEvents() {
  updateTag("events");
}

export async function revalidateNotices() {
  updateTag("notices");
}

export async function revalidateBulletins() {
  updateTag("bulletins");
}

export async function revalidateTags() {
  updateTag("tags");
}

export async function revalidateDepartments() {
  updateTag("departments");
}

// 공개 범위 저장 직후: 설정 자체 + 그 설정을 따르는 서버 캐시(공지·일정·주보 목록, 홈).
// sitemap·RSS(revalidate 86400)도 이 태그의 조회를 쓰므로 함께 만료된다(스펙 6.6-15).
// 기존 revalidateTags()는 태그 도메인용이라 새 함수로 둔다.
export async function revalidateVisibility() {
  for (const tag of ["visibility", "notices", "events", "bulletins", "main"]) updateTag(tag);
}

// 설교 한 편의 교인만 변경 직후 — 홈 캐시(60초)에 제목이 남지 않게.
export async function revalidateMain() {
  updateTag("main");
}
