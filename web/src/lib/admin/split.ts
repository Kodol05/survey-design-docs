import { TRAIT_SCALES } from "@/lib/items/types";
import { groupDiff, type GroupDiff } from "./stats";
import type { Person } from "./analysis";

/**
 * **성향 축이 높은 무리와 낮은 무리로 갈라, 직무능력 평균을 견준다**
 * (2026-08-25 사용자 요청).
 *
 * ## 상관계수 대신 점수로 말한다
 *
 * `+.32`는 「크기」를 말하지만 **얼마나 큰지는 말하지 않는다.** 대표님이
 * 실제로 알고 싶은 것은 「인내력이 높은 사람들은 직무능력이 몇 점 더
 * 높은가」다. 그건 숫자 하나로 답할 수 있다 — 두 무리로 갈라 평균을 빼면
 * 된다.
 *
 *   인내력 높은 쪽 58점 · 낮은 쪽 45점 — **13점 차이**
 *
 * 같은 데이터를 상관으로도, 점수 차이로도 말할 수 있다. 둘 다 맞는데
 * **점수 쪽이 회의에서 쓸 수 있는 말**이다.
 *
 * ## 3분의 1씩 자른다
 *
 * 절반으로 자르면 가운데 애매한 사람들이 양쪽에 섞여 차이가 흐려진다.
 * 3분의 1씩 떼면 **뚜렷한 양끝**을 견주게 되어 차이가 선명해진다.
 * 대신 가운데 3분의 1은 버리는 셈이라 인원이 줄어든다 — 40명이면
 * 13명씩이다.
 *
 * ⚠️ **차이만 보면 안 된다.** 13명씩이면 관계가 없어도 10점 안팎은 그냥
 *    나온다. `groupDiff`가 신뢰구간과 Cohen's d를 같이 내주므로 화면에서
 *    그것도 같이 보여준다.
 *
 * ## 방향
 *
 * `diff`가 음수면 **그 축이 낮은 쪽**의 직무능력이 높다는 뜻이다. 화면에서
 * 「위험회피가 낮으면」이라고 적으려면 이 부호를 봐야 한다.
 */

export type Split = GroupDiff & {
  scale: string;
  /** 무리 하나의 인원 (양쪽 같다) */
  groupN: number;
  /** 구간이 0을 벗어나 방향이 확정됐는가 */
  settled: boolean;
};

export function splitByTrait(
  people: Person[],
  scale: string,
  valueOf: (p: Person) => number | undefined,
): Split | null {
  const rows = people
    .map((p) => ({ t: p.traits[scale], v: valueOf(p) }))
    .filter(
      (r): r is { t: number; v: number } =>
        typeof r.t === "number" &&
        typeof r.v === "number" &&
        !Number.isNaN(r.t) &&
        !Number.isNaN(r.v),
    )
    .sort((a, b) => a.t - b.t);

  // 양쪽 무리가 두 명은 되어야 퍼진 정도를 잴 수 있다
  const k = Math.floor(rows.length / 3);
  if (k < 2) return null;

  const g = groupDiff(
    rows.slice(-k).map((r) => r.v),
    rows.slice(0, k).map((r) => r.v),
  );
  if (!g) return null;

  return {
    ...g,
    scale,
    groupN: k,
    settled: !(g.ci[0] <= 0 && g.ci[1] >= 0),
  };
}

/** 일곱 축을 **차이가 큰 순**으로. 방향은 상관없이 절댓값으로 줄 세운다 */
export function splitsFor(
  people: Person[],
  valueOf: (p: Person) => number | undefined,
): Split[] {
  return TRAIT_SCALES.map((s) => splitByTrait(people, s, valueOf))
    .filter((x): x is Split => x !== null)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}
