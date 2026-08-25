import { describe, expect, it } from "vitest";
import { BINS, quantile, spreadOf } from "./spread";

const P = (vals: number[]) =>
  vals.map((v, i) => ({ employeeId: `e${i}`, name: `사람${i}`, value: v }));

describe("quantile", () => {
  it("널리 쓰는 방식(R type 7)과 같은 값을 낸다", () => {
    const s = [1, 2, 3, 4];
    expect(quantile(s, 0.25)).toBeCloseTo(1.75);
    expect(quantile(s, 0.5)).toBeCloseTo(2.5);
    expect(quantile(s, 0.75)).toBeCloseTo(3.25);
  });

  it("값이 하나뿐이면 그 값", () => {
    expect(quantile([7], 0.5)).toBe(7);
  });
});

describe("spreadOf", () => {
  it("두 명이 안 되면 그리지 않는다", () => {
    expect(spreadOf("인내력", "temperament", P([50]))).toBeNull();
  });

  it("같은 칸에 들어온 사람은 위로 쌓인다", () => {
    // 4점 칸이므로 40·41·42는 같은 칸
    const s = spreadOf("인내력", "temperament", P([40, 41, 42, 80]))!;
    const stacked = s.dots.filter((d) => d.value < 50);
    expect(stacked.map((d) => d.level)).toEqual([0, 1, 2]);
    expect(s.peak).toBe(3);
  });

  it("같은 칸의 점은 x가 똑같다 — 칸 가운데", () => {
    const s = spreadOf("인내력", "temperament", P([40, 41, 42]))!;
    const xs = new Set(s.dots.map((d) => d.x));
    expect(xs.size).toBe(1);
  });

  it("100점이 저 혼자 칸을 만들지 않는다", () => {
    const s = spreadOf("인내력", "temperament", P([96, 100]))!;
    expect(new Set(s.dots.map((d) => d.x)).size).toBe(1);
    expect(s.dots[0].x).toBeCloseTo((BINS - 0.5) / BINS);
  });

  it("눈금 밖 값도 그림 안에 머문다", () => {
    const s = spreadOf("인내력", "temperament", P([-5, 105]))!;
    for (const d of s.dots) expect(d.x).toBeGreaterThanOrEqual(0);
    for (const d of s.dots) expect(d.x).toBeLessThanOrEqual(1);
  });

  it("쌓는 순서가 값에만 달렸다 — 넣는 순서가 달라도 같은 그림", () => {
    const a = spreadOf("인내력", "temperament", P([42, 40, 41]))!;
    const b = spreadOf("인내력", "temperament", P([41, 42, 40]))!;
    expect(a.dots.map((d) => d.value)).toEqual(b.dots.map((d) => d.value));
  });

  it("양끝 사람은 값 순서대로, 높은 쪽은 큰 값부터", () => {
    const s = spreadOf("인내력", "temperament", P([10, 20, 30, 80, 90]))!;
    expect(s.lowest.map((d) => d.value)).toEqual([10, 20, 30]);
    expect(s.highest.map((d) => d.value)).toEqual([90, 80, 30]);
  });

  it("사분위와 표준편차를 낸다", () => {
    const s = spreadOf("인내력", "temperament", P([10, 20, 30, 40]))!;
    expect(s.median).toBeCloseTo(25);
    expect(s.q1).toBeCloseTo(17.5);
    expect(s.q3).toBeCloseTo(32.5);
    expect(s.min).toBe(10);
    expect(s.max).toBe(40);
    // 표본 표준편차 (n−1)
    expect(s.sd).toBeCloseTo(12.909, 2);
  });
});
