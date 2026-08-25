import { describe, expect, it } from "vitest";
import { fragility, influenceOf } from "./influence";

const P = (pairs: [number, number][]) =>
  pairs.map(([x, y], i) => ({ id: `e${i}`, name: `사람${i}`, x, y }));

describe("influenceOf", () => {
  it("사람이 너무 적으면 재지 않는다", () => {
    expect(influenceOf(P([[1, 1], [2, 2], [3, 3], [4, 4]]))).toBeNull();
  });

  it("한 사람이 관계를 통째로 만들고 있으면 그 사람을 짚는다", () => {
    /*
      앞의 여섯은 x가 달라도 y가 그대로다 — 그들끼리는 아무 관계가 없다.
      마지막 한 명만 저 멀리 있어서 상관이 생긴다.
    */
    const pts = P([
      [10, 50],
      [12, 50],
      [14, 50],
      [16, 50],
      [18, 50],
      [20, 50],
      [90, 95],
    ]);
    const inf = influenceOf(pts)!;
    expect(inf.who.name).toBe("사람6");
    expect(Math.abs(inf.r)).toBeGreaterThan(0.9);
    // 빼고 나면 관계가 사라진다
    expect(Math.abs(inf.without)).toBeLessThan(0.1);
    expect(fragility(inf)).toBe("fragile");
  });

  it("고르게 퍼져 있으면 한 명을 빼도 별로 안 흔들린다", () => {
    const pts = P([
      [10, 12],
      [20, 19],
      [30, 33],
      [40, 38],
      [50, 52],
      [60, 58],
      [70, 73],
      [80, 79],
    ]);
    const inf = influenceOf(pts)!;
    expect(Math.abs(inf.delta)).toBeLessThan(0.1);
    expect(inf.flips).toBe(false);
    expect(fragility(inf)).toBe("sturdy");
  });

  it("한 사람 때문에 방향이 뒤집히면 그렇게 말한다", () => {
    // 여섯은 오른쪽 아래로 내려가고, 한 명이 그 반대를 통째로 만든다
    const pts = P([
      [10, 60],
      [20, 58],
      [30, 56],
      [40, 54],
      [50, 52],
      [95, 99],
    ]);
    const inf = influenceOf(pts)!;
    expect(inf.r).toBeGreaterThan(0);
    expect(inf.without).toBeLessThan(0);
    expect(inf.flips).toBe(true);
    expect(fragility(inf)).toBe("fragile");
  });

  it("가장 크게 흔드는 사람을 고른다 — 두 번째로 큰 사람이 아니라", () => {
    const pts = P([
      [10, 10],
      [20, 20],
      [30, 30],
      [40, 40],
      [50, 50],
      [60, 15],
    ]);
    const inf = influenceOf(pts)!;
    expect(inf.who.name).toBe("사람5");
  });

  it("전체 인원과 변화량을 같이 준다", () => {
    const pts = P([
      [1, 2],
      [2, 4],
      [3, 5],
      [4, 9],
      [5, 10],
      [6, 13],
    ]);
    const inf = influenceOf(pts)!;
    expect(inf.n).toBe(6);
    expect(inf.without - inf.r).toBeCloseTo(inf.delta, 10);
  });
});
