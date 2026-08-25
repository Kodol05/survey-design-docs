import { describe, expect, it } from "vitest";
import { CORR_FULL } from "./correlationColor";
import { FULL, widthFor } from "./DivergingBar";

/*
  막대 눈금 (2026-08-26 사용자 지적).

  ## 무슨 일이 있었나

  눈금 끝이 `0.7`이었다. 「실제 데이터에서 |r|이 1에 가는 일은 없다」는
  이유였는데, 그 판단은 **그때 화면에 있던 값(최대 0.59)에 맞춘 것**이었다.

  실제로 넘는 값이 이미 있었다 — 평가 대조의 본인↔대표님 상관은
  0.95 · 0.85 · 0.80이다. 0.7 눈금에서는 셋이 **똑같이 꽉 찬 막대**가 되고,
  넘쳤다는 말도 없이 조용히 잘린다.

  상관은 −1에서 +1 사이라는 것이 정의다. 눈금을 거기 맞추면 어떤 데이터가
  와도 잘리지 않는다.
*/

describe("눈금 끝", () => {
  it("상관의 실제 한계와 같다 — 오늘 데이터가 얼마냐와 무관해야 한다", () => {
    expect(CORR_FULL).toBe(1);
  });

  it("막대를 그리는 곳들이 같은 눈금을 쓴다", () => {
    // 세 군데(TopRelations · CorrelationTable · DivergingBar)에 따로 적혀
    // 있던 것을 한 곳으로 모았다. 하나만 고치면 화면마다 다른 눈금이 된다.
    expect(FULL).toBe(CORR_FULL);
  });
});

describe("어떤 값도 조용히 잘리지 않는다", () => {
  /** 0에서 한쪽 끝까지 = 50%. 여기에 닿으면 꽉 찬 것이다 */
  const HALF = 50;

  it("상관이 가질 수 있는 가장 큰 값에서 딱 꽉 찬다", () => {
    expect(widthFor(1)).toBeCloseTo(HALF, 5);
    expect(widthFor(-1)).toBeCloseTo(HALF, 5);
  });

  it("⚠️ 평가 대조에 실제로 나오는 0.80·0.85·0.95가 서로 다르게 그려진다", () => {
    const w = [0.8, 0.85, 0.95].map((r) => widthFor(r));
    expect(w[0]).toBeLessThan(w[1]);
    expect(w[1]).toBeLessThan(w[2]);
    // 눈금이 0.7이던 시절에는 셋 다 50이 되어 구분이 사라졌다
    expect(new Set(w).size).toBe(3);
  });

  it("0.7 을 넘는 값도 끝에 붙어 버리지 않는다", () => {
    expect(widthFor(0.75)).toBeLessThan(HALF);
    expect(widthFor(0.99)).toBeLessThan(HALF);
  });

  it("클수록 길다 — 순서가 뒤집히는 곳이 없다", () => {
    const rs = [0, 0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 1];
    const ws = rs.map((r) => widthFor(r));
    for (let i = 1; i < ws.length; i++)
      expect(ws[i]).toBeGreaterThanOrEqual(ws[i - 1]);
  });
});

describe("작은 값도 보인다", () => {
  it("0이어도 자리는 그린다 — 아예 없으면 「값이 없음」과 구분이 안 된다", () => {
    expect(widthFor(0)).toBeGreaterThan(0);
  });

  it("부호가 달라도 크기가 같으면 길이가 같다", () => {
    expect(widthFor(0.42)).toBeCloseTo(widthFor(-0.42), 10);
  });
});
