import { prisma } from "../db";
import { ABILITY_AXES, TRAIT_SCALES } from "../items/types";
import type { AxisScore } from "../scoring/score";

/** 저장된 결과를 화면이 쓰기 좋은 모양으로 꺼낸다. */

export type StoredTraits = Record<
  string,
  AxisScore & { facets: Record<string, AxisScore> }
>;
export type StoredAbilities = Record<string, AxisScore>;

export type PersonResult = {
  sessionId: string;
  completedAt: Date | null;
  durationSec: number | null;
  traits: StoredTraits;
  abilities: StoredAbilities;
};

/** 가장 최근에 마친 응시. 없으면 null. */
export async function latestResult(
  employeeId: string,
): Promise<PersonResult | null> {
  const s = await prisma.testSession.findFirst({
    where: { employeeId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    include: { result: true },
  });
  if (!s?.result) return null;
  return {
    sessionId: s.id,
    completedAt: s.completedAt,
    durationSec: s.durationSec,
    traits: s.result.scoresJson as unknown as StoredTraits,
    abilities: (s.result.abilityScoresJson ?? {}) as unknown as StoredAbilities,
  };
}

/**
 * 아직 끝내지 않은 사람이 어디까지 왔는가.
 *
 * ## 왜 필요한가
 *
 * `latestResult`는 **끝낸 것만** 찾는다. 그래서 결과 화면이 진행 중인 사람에게
 * 「아직 응시하지 않으셨습니다」라고 말하고 있었다 (2026-08-26 발견).
 * 105문항 중 여든까지 답한 사람이 그 문장을 읽으면 **답이 날아간 줄 안다.**
 * 실제로는 그대로 있고 이어서 하면 되는데도 그렇다.
 *
 * 진행 중인 세션이 없으면 `null`이다 — 그때는 정말로 시작 전이다.
 */
export async function inProgress(employeeId: string) {
  const s = await prisma.testSession.findFirst({
    where: { employeeId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    include: { _count: { select: { responses: true } } },
  });
  if (!s) return null;

  const total = await prisma.item.count({
    where: { assessmentId: s.assessmentId, status: "ACTIVE" },
  });
  return { answered: s._count.responses, total };
}

/** 7축을 정해진 순서로. 화면마다 순서가 달라지면 안 된다. */
export function orderedTraits(traits: StoredTraits) {
  return TRAIT_SCALES.filter((s) => traits[s]).map((s) => ({
    scale: s,
    ...traits[s],
  }));
}

export function orderedAbilities(abilities: StoredAbilities) {
  return ABILITY_AXES.filter((a) => abilities[a]).map((a) => ({
    axis: a,
    ...abilities[a],
  }));
}
