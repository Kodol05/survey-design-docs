import { correlate } from "./stats";

/**
 * **한 사람이 이 관계를 끌고 있는가** (2026-08-25).
 *
 * ## 왜 이 값이 필요한가
 *
 * 44명은 상관계수를 믿기에 적은 수다. 한 사람만 유별난 자리에 있어도
 * `+.35`가 나올 수 있고, 그 사람을 빼면 `+.08`이 된다. 산점도를 보면 눈에
 * 띄기도 하지만 — 이 시스템이 점을 그대로 두는 이유가 그것이다 —
 * **눈으로 보는 것과 「빼면 얼마가 되는지」를 아는 것은 다르다.**
 *
 * 그래서 한 명씩 빼 보고(leave-one-out) 가장 크게 흔드는 사람을 찾는다.
 * 계산은 n번 상관을 내는 것뿐이라 40명에서는 즉시 끝난다.
 *
 * ## 무엇을 말하고 무엇을 말하지 않는가
 *
 * 「이 사람이 이상하다」가 아니다. **「이 숫자가 이 사람 한 명에 매달려
 * 있다」**이다. 그 사람의 값이 틀렸을 수도 있고, 진짜로 그런 사람일 수도
 * 있다 — 어느 쪽인지는 이 계산이 답하지 못한다.
 *
 * 빼고 나온 값을 진짜 값으로 삼지도 않는다. 마음에 안 드는 점을 빼고
 * 다시 재면 무엇이든 원하는 답이 나온다. 이 값은 **얼마나 위태로운지**를
 * 재는 것이지 더 나은 추정치가 아니다.
 */

export type Influence = {
  /** 전부 넣고 낸 값 */
  r: number;
  n: number;
  /** 가장 크게 흔드는 사람 */
  who: { id: string; name: string };
  /** 그 사람을 뺐을 때의 값 */
  without: number;
  /** 변화량 (뺀 값 − 전체 값) */
  delta: number;
  /** 그 사람을 빼면 방향이 뒤집히는가 */
  flips: boolean;
  /** 전부 넣었을 때 구간이 0을 벗어나는가 */
  settled: boolean;
  /** 그 사람을 뺐을 때도 구간이 0을 벗어나는가 */
  settledWithout: boolean;
};

/** 이만큼 흔들리면 「한 사람에 매달려 있다」고 본다 */
export const FRAGILE = 0.1;

export function influenceOf(
  points: { id: string; name: string; x: number; y: number }[],
): Influence | null {
  // 넷은 있어야 하나 빼고도 셋이 남는다. 둘로 낸 상관은 언제나 ±1이다
  if (points.length < 5) return null;

  const all = correlate(
    points.map((p) => p.x),
    points.map((p) => p.y),
  );
  if (!Number.isFinite(all.r)) return null;

  let worst: Influence | null = null;
  for (let i = 0; i < points.length; i++) {
    const rest = points.filter((_, j) => j !== i);
    const c = correlate(
      rest.map((p) => p.x),
      rest.map((p) => p.y),
    );
    if (!Number.isFinite(c.r)) continue;
    const delta = c.r - all.r;
    if (worst && Math.abs(delta) <= Math.abs(worst.delta)) continue;
    worst = {
      r: all.r,
      n: points.length,
      who: { id: points[i].id, name: points[i].name },
      without: c.r,
      delta,
      // 0은 뒤집힌 것으로 세지 않는다 — 방향이 없던 것이 없어진 것뿐이다
      flips: all.r !== 0 && c.r !== 0 && Math.sign(c.r) !== Math.sign(all.r),
      settled: outsideZero(all.ci),
      settledWithout: outsideZero(c.ci),
    };
  }
  return worst;
}

const outsideZero = (ci: [number, number]) => !(ci[0] <= 0 && ci[1] >= 0);

/** 이 관계를 그대로 믿어도 되는지 한 낱말로 */
export function fragility(i: Influence): "sturdy" | "shaky" | "fragile" {
  if (i.flips || (i.settled && !i.settledWithout)) return "fragile";
  if (Math.abs(i.delta) >= FRAGILE) return "shaky";
  return "sturdy";
}
