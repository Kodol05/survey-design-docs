import { prisma } from "../db";
import { MIN_N } from "@/components/ui/NBadge";
import type { StoredAbilities, StoredTraits } from "../survey/result";

/**
 * 사내 분포 위치 — 00 D-24, 11 §2.1
 *
 * 08의 차별점 세 개 중 하나라서 P0이다. 계산은 정렬 한 번이다.
 *
 * **세 단계로만 표현한다.** 백분위 숫자는 사람이 늘 때마다 흔들려서,
 * 정밀해 보이는 만큼 신뢰를 잃는다.
 *
 * ⚠️ 개인 화면에는 절대 표시하지 않는다 (D-09).
 */

export type Band = "lower" | "middle" | "upper";

/** 3등분 경계. 아래 1/3 · 가운데 1/3 · 위 1/3 */
const LOW = 1 / 3;
const HIGH = 2 / 3;

/**
 * 회사 안에서 이 점수가 어디쯤인지.
 * `values`는 이 축에 대한 전 직원 점수. 자기 점수도 포함한다.
 */
export function bandOf(values: number[], score: number): Band {
  if (values.length === 0) return "middle";
  const below = values.filter((v) => v < score).length;
  const same = values.filter((v) => v === score).length;
  // 같은 점수가 여럿이면 그 무리의 가운데를 위치로 본다
  const rank = (below + same / 2) / values.length;
  if (rank < LOW) return "lower";
  if (rank >= HIGH) return "upper";
  return "middle";
}

export type CompanyDistribution = {
  /** 응시를 마친 인원 */
  n: number;
  /** n이 이 값 미만이면 위치를 보여주지 않는다 (D-24) */
  enough: boolean;
  /** 축 이름 → 전 직원 점수 목록 */
  traits: Map<string, number[]>;
  abilities: Map<string, number[]>;
};

/** 완료된 결과를 모아 축별 점수 목록을 만든다. */
export async function loadDistribution(): Promise<CompanyDistribution> {
  const results = await prisma.result.findMany({
    where: { session: { status: "COMPLETED" } },
    select: { scoresJson: true, abilityScoresJson: true },
  });

  const traits = new Map<string, number[]>();
  const abilities = new Map<string, number[]>();
  const push = (m: Map<string, number[]>, k: string, v: number) =>
    m.set(k, [...(m.get(k) ?? []), v]);

  for (const r of results) {
    for (const [k, v] of Object.entries((r.scoresJson ?? {}) as StoredTraits))
      push(traits, k, v.percent);
    for (const [k, v] of Object.entries((r.abilityScoresJson ?? {}) as StoredAbilities))
      push(abilities, k, v.percent);
  }

  return { n: results.length, enough: results.length >= MIN_N, traits, abilities };
}

/** 축 하나의 사내 평균. 관리자 개인 상세의 레이더 오버레이에 쓴다 (F-39). */
export function averageOf(values: number[] | undefined): number | undefined {
  if (!values?.length) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
