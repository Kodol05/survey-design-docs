import { describe, expect, it } from "vitest";
import { gradeOf, isNotable, strengthOf } from "./correlationWords";

describe("strengthOf", () => {
  it("Gignac·Szodorai 분포에 맞춘 경계에서 갈린다", () => {
    expect(strengthOf(0.09)).toBe("없음");
    expect(strengthOf(0.1)).toBe("약함");
    expect(strengthOf(0.19)).toBe("약함");
    expect(strengthOf(0.2)).toBe("어느 정도");
    expect(strengthOf(0.3)).toBe("뚜렷함");
    expect(strengthOf(0.49)).toBe("뚜렷함");
    expect(strengthOf(0.5)).toBe("매우 뚜렷함");
  });

  it("음수도 크기로만 본다 — 방향은 부호가 말한다", () => {
    expect(strengthOf(-0.42)).toBe("뚜렷함");
    expect(strengthOf(-0.05)).toBe("없음");
  });
});

describe("gradeOf", () => {
  it("신뢰구간이 없으면 크기 그대로", () => {
    expect(gradeOf(0.35)).toBe("뚜렷함");
  });

  it("신뢰구간이 0을 걸치면 세기를 말하지 않는다", () => {
    // 값은 커 보여도 방향조차 정해지지 않았다
    expect(gradeOf(0.45, [-0.02, 0.72])).toBe("불확실");
    expect(gradeOf(-0.31, [-0.6, 0.05])).toBe("불확실");
  });

  it("구간이 0을 안 걸치면 등급이 나온다", () => {
    expect(gradeOf(0.45, [0.18, 0.66])).toBe("뚜렷함");
    expect(gradeOf(-0.24, [-0.48, -0.03])).toBe("어느 정도");
  });

  it("경계에 딱 닿는 구간도 0을 걸친 것으로 본다", () => {
    expect(gradeOf(0.4, [0, 0.7])).toBe("불확실");
  });
});

describe("isNotable", () => {
  it(".30 위를 굵게 둘 값으로 본다", () => {
    expect(isNotable(0.29)).toBe(false);
    expect(isNotable(0.3)).toBe(true);
    expect(isNotable(-0.55)).toBe(true);
  });
});
