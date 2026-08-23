import { prisma } from "../db";
import { ABILITY_AXES, TRAIT_SCALES } from "../items/types";
import type { AxisScore } from "../scoring/score";

/** 저장된 결과를 화면이 쓰기 좋은 모양으로 꺼낸다. */

export type StoredTraits = Record<string, AxisScore & { facets: Record<string, AxisScore> }>;
export type StoredAbilities = Record<string, AxisScore>;

export type PersonResult = {
  sessionId: string;
  completedAt: Date | null;
  durationSec: number | null;
  traits: StoredTraits;
  abilities: StoredAbilities;
};

/** 가장 최근에 마친 응시. 없으면 null. */
export async function latestResult(employeeId: string): Promise<PersonResult | null> {
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

/** 7축을 정해진 순서로. 화면마다 순서가 달라지면 안 된다. */
export function orderedTraits(traits: StoredTraits) {
  return TRAIT_SCALES.filter((s) => traits[s]).map((s) => ({ scale: s, ...traits[s] }));
}

export function orderedAbilities(abilities: StoredAbilities) {
  return ABILITY_AXES.filter((a) => abilities[a]).map((a) => ({ axis: a, ...abilities[a] }));
}
