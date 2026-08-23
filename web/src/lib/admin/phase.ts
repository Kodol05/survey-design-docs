import { prisma } from "../db";

/**
 * 평가·결과 국면 (00 D-33)
 *
 * 08이 대표님께 "평가는 검사 결과를 보시기 전에 받는다"고 약속했다.
 * 이건 원칙이 아니라 **장치로** 있어야 한다 — 사람은 반드시 실수로 깨뜨린다.
 *
 *   [평가 수집 중]  관리자는 결과 화면에 못 들어감
 *         │ 한 번 전환. 되돌릴 수 없음
 *         ▼
 *   [결과 공개]     결과·상관·대조 화면 전부 열림
 *
 * 되돌릴 수 없게 하는 이유 — 되돌아갈 수 있으면 "결과 보고 평가 고치기"가
 * 가능해져서 장치 자체가 무의미해진다.
 *
 * ⚠️ 사원 본인 결과는 국면과 무관하게 제출 직후 보인다 (F-06).
 *    잠기는 것은 관리자 화면뿐이다.
 */

export async function getAppState() {
  return prisma.appState.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export async function isResultsOpen() {
  return (await getAppState()).ratingPhase === "OPEN";
}

/** 되돌릴 수 없다. 누가 언제 열었는지 남긴다. */
export async function openResults(openedBy: string) {
  const state = await getAppState();
  if (state.ratingPhase === "OPEN") return state;
  return prisma.appState.update({
    where: { id: 1 },
    data: { ratingPhase: "OPEN", openedAt: new Date(), openedBy },
  });
}

/** 국면 잠금에 걸리지 않는 화면. 이것까지 잠그면 운영이 안 된다. */
export const ALWAYS_VISIBLE = [
  "응시 현황 — 몇 명이 했는지",
  "응답 품질 플래그",
  "문항 목록",
] as const;
