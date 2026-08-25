import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import { correlate, alphaVerdict, type Correlation } from "./stats";
import type { Person } from "./analysis";

/**
 * 세 직무능력을 하나로 묶은 값 (2026-08-25 사용자 요청).
 *
 * ## 묶어도 되는가 — 먼저 확인했다
 *
 * 서로 다른 것을 재는 축을 더하면 총합은 아무 뜻도 없어진다. 그래서 만들기
 * 전에 세 축이 실제로 같이 움직이는지를 봤다:
 *
 *   협력 × 조직생활      +.34
 *   협력 × 자율적 실행   +.36
 *   조직생활 × 자율적 실행 +.33
 *
 * 셋을 묶었을 때 α는 **.60**이다. 뜻밖에도 **개별 축보다 총합이 더
 * 안정적이다** — 협력 하나는 α .08이라 못 쓰는데, 셋을 평균 내면 각 축의
 * 잡음이 서로 상쇄되고 셋이 공유하는 부분만 남는다.
 *
 * 그러니 이 값은 「협력·조직생활·자율적 실행이 **함께 말하는 것**」이다.
 * 셋 중 어느 하나가 아니라 그 공통분모다.
 *
 * ## 합이 아니라 평균이다
 *
 * 세 축이 다 0~100이라 평균도 0~100이 된다. 합(0~300)으로 두면 눈금이
 * 달라져서 다른 화면의 값과 나란히 볼 수 없다.
 *
 * ## 한 축이라도 없으면 세지 않는다
 *
 * 대표님 평가로 볼 때 두 축만 매겨진 사람이 생긴다. 있는 것만 평균 내면
 * 그 사람의 총합은 **다른 잣대로 잰 값**이 되어 남과 견줄 수 없다.
 */

export type Composite = {
  /** 사람별 총합 */
  values: { employeeId: string; name: string; value: number }[];
  /** 세 축을 문항처럼 보고 낸 Cronbach's α */
  alpha: number | null;
  verdict: ReturnType<typeof alphaVerdict>;
  /** 축끼리의 상관 — 묶을 만한지의 근거 */
  pairs: { a: string; b: string; r: number }[];
  /** 성향 7축과 총합의 상관, 큰 순 */
  drivers: { scale: string; corr: Correlation }[];
  /**
   * 맨 위와 **사실상 같은 크기**인 축들 (자기 자신 포함).
   *
   * `−.32 / +.32 / +.31` 처럼 셋이 붙어 있는데 「가장 크게 연관된 것은
   * 위험회피」라고 단정하면 **`.01` 차이로 순위를 매기는 셈**이다.
   * 40명 남짓에서 그 차이는 다시 재면 뒤집힌다.
   */
  topGroup: { scale: string; corr: Correlation }[];
};

/** 이 안에 들면 순위를 따지지 않는다. 40명 규모에서 이 정도는 그냥 흔들림이다 */
export const TIE = 0.05;

export function abilityComposite(people: Person[]): Composite | null {
  const rows = people
    .map((p) => ({
      employeeId: p.employeeId,
      name: p.name,
      traits: p.traits,
      cols: ABILITY_AXES.map((a) => p.abilities[a]),
    }))
    .filter((r) => r.cols.every((v) => typeof v === "number" && !Number.isNaN(v)));

  if (rows.length < 4) return null;

  const values = rows.map((r) => ({
    employeeId: r.employeeId,
    name: r.name,
    value: r.cols.reduce((a, b) => a + b, 0) / r.cols.length,
  }));

  // 축끼리의 상관 — 묶을 만한지를 사람이 직접 볼 수 있게 같이 넘긴다
  const pairs: Composite["pairs"] = [];
  for (let i = 0; i < ABILITY_AXES.length; i++)
    for (let j = i + 1; j < ABILITY_AXES.length; j++)
      pairs.push({
        a: ABILITY_AXES[i],
        b: ABILITY_AXES[j],
        r: correlate(
          rows.map((r) => r.cols[i]),
          rows.map((r) => r.cols[j]),
        ).r,
      });

  const alpha = alphaOf(rows.map((r) => r.cols));

  const drivers = TRAIT_SCALES.map((scale) => {
    const pick = rows
      .map((r, i) => [r.traits[scale], values[i].value] as const)
      .filter(([t]) => typeof t === "number" && !Number.isNaN(t));
    return {
      scale,
      corr: correlate(
        pick.map(([t]) => t),
        pick.map(([, v]) => v),
      ),
    };
  })
    .filter((d) => d.corr.n >= 4)
    .sort((a, b) => Math.abs(b.corr.r) - Math.abs(a.corr.r));

  const best = drivers[0] ? Math.abs(drivers[0].corr.r) : 0;
  const topGroup = drivers.filter((d) => best - Math.abs(d.corr.r) < TIE);

  return { values, alpha, verdict: alphaVerdict(alpha), pairs, drivers, topGroup };
}

/**
 * 축 셋을 문항처럼 보고 낸 α.
 *
 * 「이 셋이 같은 것을 재고 있는가」를 묻는 것이라 문항 단위 α와 계산이
 * 같다. 다만 문항 셋이 아니라 **척도 셋**이라는 것이 다르다 —
 * 그래서 화면에서도 문항 α와 나란히 놓지 않는다.
 */
function alphaOf(rows: number[][]): number | null {
  const k = rows[0]?.length ?? 0;
  if (k < 2 || rows.length < 3) return null;
  const cols = Array.from({ length: k }, (_, i) => rows.map((r) => r[i]));
  const varOf = (xs: number[]) => {
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    return xs.reduce((acc, v) => acc + (v - m) ** 2, 0) / xs.length;
  };
  const parts = cols.reduce((s, c) => s + varOf(c), 0);
  const total = varOf(rows.map((r) => r.reduce((a, b) => a + b, 0)));
  if (total === 0) return null;
  return (k / (k - 1)) * (1 - parts / total);
}
