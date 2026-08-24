import { describe, expect, it } from "vitest";
import { predictFromResearch } from "./researchPrediction";
import type { Person } from "./analysis";
import { TRAIT_SCALES } from "@/lib/items/types";
import { getCell, loadResearchTable } from "@/lib/research/correlations";

/** 논문 값이 하나라도 있는 직무능력 축을 찾는다 */
function studiedAxis(): string {
  const table = loadResearchTable();
  for (const axis of ["협력", "조직생활", "자율적실행"])
    for (const scale of TRAIT_SCALES)
      if (getCell(table, scale, axis).kind === "value") return axis;
  throw new Error("연구값이 있는 축이 없다");
}

/** 성향은 퍼지게, 직무능력은 첫 축과 같이 움직이게 */
function makePeople(n: number, link: number, axis: string): Person[] {
  return Array.from({ length: n }, (_, i) => {
    const traits: Record<string, number> = {};
    TRAIT_SCALES.forEach((s, k) => {
      traits[s] = 30 + ((i * 7 + k * 13) % 41);
    });
    const base = traits[TRAIT_SCALES[0]];
    return {
      employeeId: `p${i}`,
      name: `사람${i}`,
      traits,
      abilities: { [axis]: 50 + (base - 50) * link + ((i % 5) - 2) },
      quality: "ok",
    };
  });
}

describe("predictFromResearch", () => {
  const axis = studiedAxis();

  it("사람이 적으면 만들지 않는다", () => {
    expect(predictFromResearch(makePeople(5, 1, axis), axis)).toBeNull();
  });

  it("논문 값이 없는 축은 예측하지 않는다 — 0으로 채우지 않는다", () => {
    // 조직생활은 연구를 찾지 못해 가중치가 없다 (07)
    const table = loadResearchTable();
    const hasAny = TRAIT_SCALES.some(
      (s) => getCell(table, s, "조직생활").kind === "value",
    );
    if (!hasAny)
      expect(predictFromResearch(makePeople(30, 1, "조직생활"), "조직생활")).toBeNull();
  });

  it("예측을 실제와 같은 눈금으로 되돌린다", () => {
    const people = makePeople(30, 0.8, axis);
    const out = predictFromResearch(people, axis)!;
    const actual = people.map((p) => p.abilities[axis]);
    const pm = out.rows.reduce((n, r) => n + r.predicted, 0) / out.rows.length;
    const am = actual.reduce((a, b) => a + b, 0) / actual.length;
    // 평균이 맞아야 "예측 62 → 실제 48" 같은 말이 성립한다
    expect(pm).toBeCloseTo(am, 6);
  });

  it("차이는 실제 − 예측이다", () => {
    const out = predictFromResearch(makePeople(30, 0.8, axis), axis)!;
    for (const r of out.rows) expect(r.gap).toBeCloseTo(r.actual - r.predicted, 10);
    expect(out.above + out.below).toBeLessThanOrEqual(out.n);
  });

  it("구간을 셋으로 나누고 인원을 다 담는다", () => {
    const out = predictFromResearch(makePeople(30, 0.5, axis), axis)!;
    expect(out.bins).toHaveLength(3);
    expect(out.bins.reduce((n, b) => n + b.count, 0)).toBe(out.n);
  });

  it("가중치는 논문 값 그대로다", () => {
    const table = loadResearchTable();
    const out = predictFromResearch(makePeople(30, 0.5, axis), axis)!;
    for (const w of out.weights) {
      const c = getCell(table, w.scale, axis);
      expect(c.kind).toBe("value");
      if (c.kind === "value") expect(w.r).toBe(c.value);
    }
  });
});
