import { describe, expect, it } from "vitest";
import { PAIRS, readPairs, type AxisInput } from "./pairs";
import { BAND_TEXT } from "./bands";
import { POLES } from "./poles";
import { TRAIT_SCALES } from "../items/types";

const at = (p: number): AxisInput => ({
  percent: p,
  band: p < 40 ? "lower" : p > 60 ? "upper" : "middle",
});

const all = (p: number) => Object.fromEntries(TRAIT_SCALES.map((s) => [s, at(p)]));

describe("구간별 서술", () => {
  it("7축 × 3구간 = 21개가 빠짐없이 있다", () => {
    for (const s of TRAIT_SCALES) {
      expect(BAND_TEXT[s], s).toBeTruthy();
      for (const b of ["lower", "middle", "upper"] as const)
        expect(BAND_TEXT[s][b].length, `${s} ${b}`).toBeGreaterThan(20);
    }
    expect(Object.keys(BAND_TEXT)).toHaveLength(7);
  });

  it("보통 구간에도 문장이 있다 — 40~60에 다수가 들어온다", () => {
    for (const s of TRAIT_SCALES) expect(BAND_TEXT[s].middle).toBeTruthy();
  });

  it("양극 서술도 7축 전부 있다", () => {
    for (const s of TRAIT_SCALES) expect(POLES[s], s).toBeTruthy();
  });

  it("유형 이름을 붙이지 않는다 (00 §5)", () => {
    const banned = ["유형", "폭발적", "무감동", "미성숙"];
    for (const s of TRAIT_SCALES)
      for (const b of ["lower", "middle", "upper"] as const)
        for (const w of banned) expect(BAND_TEXT[s][b]).not.toContain(w);
  });
});

describe("두 축 같이 보기", () => {
  it("4쌍 × 4칸 = 16개", () => {
    expect(PAIRS).toHaveLength(4);
    for (const p of PAIRS) expect(Object.keys(p.text)).toHaveLength(4);
  });

  it("쌍에 쓰인 축은 전부 7축 안에 있다", () => {
    for (const p of PAIRS) {
      expect(TRAIT_SCALES).toContain(p.a);
      expect(TRAIT_SCALES).toContain(p.b);
    }
  });

  it("큐브에서 빠졌던 인내력이 들어온다", () => {
    expect(PAIRS.some((p) => p.a === "인내력" || p.b === "인내력")).toBe(true);
  });

  it("50에서 갈린다", () => {
    expect(readPairs(all(80))[0].key).toBe("HH");
    expect(readPairs(all(20))[0].key).toBe("LL");
    expect(readPairs(all(50))[0].key).toBe("HH");
    expect(readPairs(all(49))[0].key).toBe("LL");
  });

  it("보통 구간인 축은 뚜렷하지 않다고 표시한다", () => {
    const r = readPairs(all(51));
    expect(r[0].unclear).toEqual([r[0].pair.a, r[0].pair.b]);
  });

  it("축이 없으면 그 쌍은 건너뛴다 — 없는 해석을 지어내지 않는다", () => {
    expect(readPairs({ 자극추구: at(80) })).toHaveLength(0);
  });
});
