import { describe, expect, it } from "vitest";
import { POLES } from "@/lib/interpretation/poles";
import { BAND } from "@/lib/scoring/score";
import { TRAIT_SCALES } from "@/lib/items/types";

/**
 * QuickRead는 문장을 짓지 않고 POLES에서 고르기만 한다.
 * 그 고르는 규칙만 여기서 지킨다 — 렌더링은 시험하지 않는다.
 */
const pick = (traits: Record<string, number>) =>
  TRAIT_SCALES.filter((s) => typeof traits[s] === "number")
    .map((s) => ({ scale: s, v: traits[s] }))
    .filter((x) => x.v < BAND.lower || x.v > BAND.upper)
    .sort((a, b) => Math.abs(b.v - 50) - Math.abs(a.v - 50));

const flat = Object.fromEntries(TRAIT_SCALES.map((s) => [s, 50]));

describe("한눈에 요약이 고르는 축", () => {
  it("가운데 범위 축은 빠진다", () => {
    expect(pick({ ...flat, 자율성: 55, 인내력: 41 })).toEqual([]);
  });

  it("경계값은 가운데로 본다 — D-26은 미만·초과다", () => {
    expect(pick({ ...flat, 자율성: BAND.upper, 인내력: BAND.lower })).toEqual([]);
    expect(pick({ ...flat, 자율성: BAND.upper + 1 })).toHaveLength(1);
  });

  it("가운데에서 먼 축이 먼저 온다", () => {
    const out = pick({ ...flat, 자율성: 72, 인내력: 18, 연대감: 65 });
    expect(out.map((x) => x.scale)).toEqual(["인내력", "자율성", "연대감"]);
  });

  it("높으면 high, 낮으면 low 문장을 쓴다", () => {
    const out = pick({ ...flat, 자율성: 80, 인내력: 12 });
    const text = (x: { scale: string; v: number }) =>
      x.v > BAND.upper ? POLES[x.scale].high : POLES[x.scale].low;

    expect(text(out.find((x) => x.scale === "자율성")!)).toBe(POLES.자율성.high);
    expect(text(out.find((x) => x.scale === "인내력")!)).toBe(POLES.인내력.low);
  });

  it("일곱 축 모두 양극단이어도 다 잡는다 — 자르는 것은 화면 몫", () => {
    const extreme = Object.fromEntries(TRAIT_SCALES.map((s) => [s, 90]));
    expect(pick(extreme)).toHaveLength(TRAIT_SCALES.length);
  });

  it("모든 축에 POLES 문장이 있다", () => {
    for (const s of TRAIT_SCALES) {
      expect(POLES[s]?.low).toBeTruthy();
      expect(POLES[s]?.high).toBeTruthy();
    }
  });
});
