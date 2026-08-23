import { describe, expect, it } from "vitest";
import { averageOf, bandOf } from "./distribution";

describe("사내 분포 위치", () => {
  const nine = [10, 20, 30, 40, 50, 60, 70, 80, 90];

  it("아래 3분의 1은 lower, 위 3분의 1은 upper", () => {
    expect(bandOf(nine, 10)).toBe("lower");
    expect(bandOf(nine, 20)).toBe("lower");
    expect(bandOf(nine, 50)).toBe("middle");
    expect(bandOf(nine, 80)).toBe("upper");
    expect(bandOf(nine, 90)).toBe("upper");
  });

  it("같은 점수가 여럿이면 그 무리의 가운데를 위치로 본다", () => {
    expect(bandOf([50, 50, 50, 50], 50)).toBe("middle");
  });

  it("혼자면 가운데", () => {
    expect(bandOf([70], 70)).toBe("middle");
  });

  it("데이터가 없으면 가운데로 둔다 — 없는 위치를 지어내지 않는다", () => {
    expect(bandOf([], 70)).toBe("middle");
  });

  it("평균", () => {
    expect(averageOf([10, 20, 30])).toBe(20);
    expect(averageOf([])).toBeUndefined();
    expect(averageOf(undefined)).toBeUndefined();
  });
});
