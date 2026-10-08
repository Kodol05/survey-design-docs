import { describe, expect, it } from "vitest";
import { quantile, spreadOf } from "./spread";

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

  it("사람 목록은 값이 낮은 쪽부터 — 넣는 순서가 달라도 같다", () => {
    const a = spreadOf("인내력", "temperament", P([42, 40, 41]))!;
    const b = spreadOf("인내력", "temperament", P([41, 42, 40]))!;
    expect(a.dots.map((d) => d.value)).toEqual([40, 41, 42]);
    expect(b.dots.map((d) => d.value)).toEqual([40, 41, 42]);
  });

  it("동점이면 이름 순", () => {
    const s = spreadOf("인내력", "temperament", [
      { employeeId: "b", name: "나", value: 50 },
      { employeeId: "a", name: "가", value: 50 },
    ])!;
    expect(s.dots.map((d) => d.name)).toEqual(["가", "나"]);
  });

  it("값이 없는 사람은 뺀다", () => {
    const s = spreadOf("인내력", "temperament", P([10, NaN, 30]))!;
    expect(s.n).toBe(2);
    expect(s.dots).toHaveLength(2);
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
