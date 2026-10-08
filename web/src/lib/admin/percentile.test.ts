import { describe, expect, it } from "vitest";
import { topPercent } from "./percentile";

describe("사내 상위 %", () => {
  it("혼자면 상위 100%", () => {
    expect(topPercent([], 70)).toBe(100);
  });

  it("열 명 중 1등은 상위 10%, 꼴찌는 100%", () => {
    const others = [10, 20, 30, 40, 50, 60, 70, 80, 90]; // 나 + 9명 = 10명
    expect(topPercent(others, 95)).toBe(10);
    expect(topPercent(others, 5)).toBe(100);
    expect(topPercent(others, 55)).toBe(50); // 위에 4명 → 5등 / 10
  });

  it("나눠떨어지지 않으면 올린다 — 좋게 반올림하지 않는다", () => {
    const others = Array.from({ length: 41 }, (_, i) => i); // 나 + 41명 = 42명
    expect(topPercent(others, 100)).toBe(3); // 1/42 = 2.38%
    expect(topPercent(others, 39.5)).toBe(5); // 위에 1명(40) → 2등, 4.76%
  });

  it("같은 점수는 가장 좋은 등수를 함께 쓴다", () => {
    // 나(50) + 50, 50, 40 → 위에 아무도 없음 → 1등 / 4
    expect(topPercent([50, 50, 40], 50)).toBe(25);
    // 나(50) + 60, 50, 50 → 위에 1명 → 2등 / 4
    expect(topPercent([60, 50, 50], 50)).toBe(50);
  });

  it("숫자가 아닌 값은 모집단에서 뺀다", () => {
    expect(topPercent([Number.NaN, 80], 70)).toBe(100); // 나 + 80 → 2등 / 2
  });
});
