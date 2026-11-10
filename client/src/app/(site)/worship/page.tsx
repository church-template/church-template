import type { Metadata } from "next";
import { WorshipHero } from "@/components/worship/WorshipHero";
import { SundayFlow } from "@/components/worship/SundayFlow";
import { WorshipRegular } from "@/components/worship/WorshipRegular";
import { WorshipSpecial } from "@/components/worship/WorshipSpecial";
import { WorshipPlace } from "@/components/worship/WorshipPlace";
import { CHURCH_NAME } from "@/constants/church";
import { WORSHIP } from "@/constants/content";

export const metadata: Metadata = {
  title: WORSHIP.title,
  description: `${CHURCH_NAME} 예배 시간과 장소를 안내합니다.`,
  alternates: { canonical: "/worship" },
};

// 예배 시간 안내 — 주일이 주인공: 히어로(주일 시간) → 다음 예배·주일 아침 흐름 → 주중 예배 → 특별 예배 → 장소.
// 정적 생성(공개 콘텐츠는 상수 주입, API 호출 없음). "다음 예배"만 클라이언트에서 현재 시각으로 계산한다.
export default function WorshipPage() {
  return (
    <>
      <WorshipHero />
      <SundayFlow />
      <WorshipRegular />
      <WorshipSpecial />
      <WorshipPlace />
    </>
  );
}
