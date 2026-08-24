import { describe, expect, it } from "vitest";
import { gradeOf, isNotable, isUncertain, strengthOf } from "./correlationWords";

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

describe("gradeOf · isUncertain", () => {
  it("등급은 언제나 크기로만 말한다", () => {
    expect(gradeOf(0.35)).toBe("뚜렷함");
    // 구간이 0을 걸쳐도 등급 자리를 빼앗기지 않는다
    expect(gradeOf(0.24)).toBe("어느 정도");
  });

  it("「어느 정도」가 화면에서 사라지지 않는다", () => {
    // .20~.29는 37명에서 반드시 0을 걸친다. 등급을 덮어쓰면 영영 안 나온다
    for (const r of [0.2, 0.24, 0.29]) expect(gradeOf(r)).toBe("어느 정도");
  });

  it("확실함은 따로 잰다", () => {
    expect(isUncertain([-0.02, 0.72])).toBe(true);
    expect(isUncertain([0.18, 0.66])).toBe(false);
    expect(isUncertain([-0.6, -0.03])).toBe(false);
    expect(isUncertain(undefined)).toBe(false);
  });

  it("경계에 딱 닿는 구간도 0을 걸친 것으로 본다", () => {
    expect(isUncertain([0, 0.7])).toBe(true);
    expect(isUncertain([-0.7, 0])).toBe(true);
  });
});

describe("isNotable", () => {
  it(".30 위를 굵게 둘 값으로 본다", () => {
    expect(isNotable(0.29)).toBe(false);
    expect(isNotable(0.3)).toBe(true);
    expect(isNotable(-0.55)).toBe(true);
  });
});
