import { describe, expect, it } from "vitest";
import { formatReliability, reliabilityPct } from "./reliability";

describe("검사 신뢰도 % 표기", () => {
  it("α를 그대로 백분율로 옮긴다 (제곱하지 않는다)", () => {
    expect(reliabilityPct(0.93)).toBe(93);
    expect(formatReliability(0.93)).toBe("93%");
    expect(formatReliability(0.6)).toBe("60%");
  });

  it("1을 넘지 않는다", () => {
    expect(formatReliability(1)).toBe("100%");
  });

  it("음수 α는 비율로 적지 않는다", () => {
    expect(formatReliability(-0.12)).toBe("0% 미만");
  });
});
