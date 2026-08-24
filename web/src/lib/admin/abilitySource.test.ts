import { describe, expect, it } from "vitest";
import {
  isValidRating,
  parseSource,
  ratingToPercent,
  resolveAbilities,
} from "./abilitySource";

describe("ratingToPercent", () => {
  it("1~10을 0~100으로 편다 — 가운데가 가운데다", () => {
    expect(ratingToPercent(1)).toBe(0);
    expect(ratingToPercent(5.5)).toBe(50);
    expect(ratingToPercent(10)).toBe(100);
  });

  it("눈금 사이가 고르다", () => {
    // 한 칸이 100/9 ≈ 11.11점
    expect(ratingToPercent(2) - ratingToPercent(1)).toBeCloseTo(100 / 9, 10);
    expect(ratingToPercent(10) - ratingToPercent(9)).toBeCloseTo(100 / 9, 10);
  });
});

describe("isValidRating", () => {
  it("1~10 정수만 받는다", () => {
    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(10)).toBe(true);
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(11)).toBe(false);
    expect(isValidRating(5.5)).toBe(false);
    expect(isValidRating(NaN)).toBe(false);
  });
});

describe("parseSource", () => {
  it("모르는 값은 직원 설문으로 돌린다", () => {
    expect(parseSource(undefined)).toBe("self");
    expect(parseSource("이상한값")).toBe("self");
    expect(parseSource("boss")).toBe("boss");
    expect(parseSource("mean")).toBe("mean");
  });
});

describe("resolveAbilities", () => {
  const self = { 협력: 80, 조직생활: 40, 자율적실행: 60 };
  const boss = { 협력: 10, 조직생활: 1 }; // 자율적실행은 아직 안 매김

  it("self는 설문 값을 그대로 쓴다", () => {
    expect(resolveAbilities("self", self, boss)).toEqual(self);
  });

  it("boss는 1~10을 옮긴 값만 쓴다", () => {
    const out = resolveAbilities("boss", self, boss);
    expect(out).toEqual({ 협력: 100, 조직생활: 0 });
    // 대표님이 안 매긴 축은 아예 없다 — 0으로 채우지 않는다
    expect("자율적실행" in out).toBe(false);
  });

  it("mean은 양쪽이 다 있는 축만 섞는다", () => {
    const out = resolveAbilities("mean", self, boss);
    expect(out).toEqual({ 협력: 90, 조직생활: 20 });
    expect("자율적실행" in out).toBe(false);
  });

  it("한쪽이 통째로 비면 그 소스는 빈 값이다", () => {
    expect(resolveAbilities("boss", self, {})).toEqual({});
    expect(resolveAbilities("mean", self, {})).toEqual({});
    expect(resolveAbilities("self", {}, boss)).toEqual({});
  });

  it("없는 축을 지어내지 않는다", () => {
    const out = resolveAbilities("self", { 협력: 55, 없는축: 99 }, {});
    expect(out).toEqual({ 협력: 55 });
  });
});
