import { describe, expect, it } from "vitest";
import {
  densityAt,
  densityCurve,
  integrate,
  MIN_BANDWIDTH,
  quartiles,
  silvermanBandwidth,
  sliceCurve,
} from "./density";

describe("silvermanBandwidth", () => {
  it("0.9 · min(sd, IQR/1.34) · n^(-1/5)", () => {
    // 0, 10, 20, … 90 — sd ≈ 30.28, IQR = 45 → IQR/1.34 ≈ 33.58 이므로 sd 쪽
    const v = Array.from({ length: 10 }, (_, i) => i * 10);
    const sd = Math.sqrt(
      v.reduce((a, x) => a + (x - 45) ** 2, 0) / (v.length - 1),
    );
    expect(silvermanBandwidth(v)).toBeCloseTo(0.9 * sd * 10 ** -0.2, 6);
  });

  it("몇 명이 한 점수에 몰려도 바닥 아래로 내려가지 않는다", () => {
    expect(silvermanBandwidth([50, 50, 50, 51, 51, 52])).toBe(MIN_BANDWIDTH);
  });

  it("값이 없거나 하나뿐이면 바닥값", () => {
    expect(silvermanBandwidth([])).toBe(MIN_BANDWIDTH);
    expect(silvermanBandwidth([42])).toBe(MIN_BANDWIDTH);
    expect(silvermanBandwidth([42, 42, 42])).toBe(MIN_BANDWIDTH);
  });
});

describe("densityCurve", () => {
  const people = [12, 30, 41, 44, 47, 50, 52, 53, 55, 58, 61, 66, 70, 88];

  it("0~100 위 넓이가 1", () => {
    const c = densityCurve(people);
    expect(integrate(c.xs, c.ys)).toBeCloseTo(1, 6);
    expect(c.xs[0]).toBe(0);
    expect(c.xs[c.xs.length - 1]).toBe(100);
    expect(c.xs).toHaveLength(101);
  });

  it("끝에 몰린 값도 넓이가 1이고, 끝이 꺼지지 않는다 (반사법)", () => {
    const c = densityCurve([97, 98, 99, 100, 100]);
    expect(integrate(c.xs, c.ys)).toBeCloseTo(1, 6);
    // 100에서 접었으므로 가장 높은 곳이 눈금 끝 근처다
    expect(c.ys.indexOf(c.peak)).toBeGreaterThanOrEqual(96);
  });

  it("띠 폭이 아주 넓어도 넓이가 1", () => {
    const c = densityCurve([50], { bandwidth: 80 });
    expect(integrate(c.xs, c.ys)).toBeCloseTo(1, 6);
  });

  it("값이 하나면 그 자리에 봉우리 하나", () => {
    const c = densityCurve([30]);
    expect(c.bandwidth).toBe(MIN_BANDWIDTH);
    expect(c.ys.indexOf(c.peak)).toBe(30);
    expect(integrate(c.xs, c.ys)).toBeCloseTo(1, 6);
  });

  it("값이 없으면 납작한 0", () => {
    const c = densityCurve([]);
    expect(c.peak).toBe(0);
    expect(c.ys.every((y) => y === 0)).toBe(true);
  });

  it("눈금 밖 값은 끝으로 당겨 넣는다", () => {
    const c = densityCurve([-10, 110]);
    expect(integrate(c.xs, c.ys)).toBeCloseTo(1, 6);
  });

  it("넣는 순서와 상관없이 같은 곡선", () => {
    const a = densityCurve(people);
    const b = densityCurve([...people].reverse());
    a.ys.forEach((y, i) => expect(b.ys[i]).toBeCloseTo(y, 12));
  });
});

describe("sliceCurve · densityAt", () => {
  it("잰 자리 사이는 직선으로 잇는다", () => {
    const c = densityCurve([40, 60]);
    expect(densityAt(c, 40.5)).toBeCloseTo((c.ys[40] + c.ys[41]) / 2, 12);
  });

  it("조각의 양 끝은 정확히 주어진 값에서 끊긴다", () => {
    const c = densityCurve([40, 60]);
    const s = sliceCurve(c, 42.5, 57.25);
    expect(s[0][0]).toBe(42.5);
    expect(s[s.length - 1][0]).toBe(57.25);
    expect(s.slice(1, -1).every(([x]) => x > 42.5 && x < 57.25)).toBe(true);
  });
});

describe("quartiles", () => {
  it("R type 7과 같은 값", () => {
    expect(quartiles([4, 1, 3, 2])).toEqual({
      q1: 1.75,
      median: 2.5,
      q3: 3.25,
    });
    expect(quartiles([10, 20, 30, 40, 50])).toEqual({
      q1: 20,
      median: 30,
      q3: 40,
    });
  });

  it("값이 하나면 셋 다 그 값, 없으면 NaN", () => {
    expect(quartiles([7])).toEqual({ q1: 7, median: 7, q3: 7 });
    const e = quartiles([]);
    expect(Number.isNaN(e.median)).toBe(true);
  });
});
