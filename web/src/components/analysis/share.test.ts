import { describe, expect, it } from "vitest";
import { formatShare, rankByAbs, shareFull, shareOf, sharePct } from "./share";

describe("formatShare", () => {
  it("r²를 %로, 부호는 r을 따른다", () => {
    expect(formatShare(0.39)).toBe("+15% (+0.39)");
    expect(formatShare(-0.19)).toBe("−4% (−0.19)");
    expect(formatShare(0.42)).toBe("+18% (+0.42)");
  });

  it("빼기는 하이픈이 아니라 마이너스 기호다", () => {
    expect(formatShare(-0.5)).not.toContain("-");
  });

  it("0%에는 부호를 달지 않는다 — 방향이 없는 크기에 방향을 만들지 않게", () => {
    expect(formatShare(0.04)).toBe("0% (+0.04)");
    expect(formatShare(-0.04)).toBe("0% (−0.04)");
    expect(sharePct(-0.04)).toBe(0);
  });
});

describe("shareOf", () => {
  it("막대용 값은 반올림하지 않고 부호를 단다", () => {
    expect(shareOf(-0.3)).toBeCloseTo(-9);
    expect(shareOf(0.5)).toBeCloseTo(25);
  });
});

describe("shareFull", () => {
  it("화면에서 가장 큰 %를 10% 단위로 올린다", () => {
    expect(shareFull([0.57, -0.2, 0.39])).toBe(40); // 32.5% → 40
    expect(shareFull([0.3])).toBe(10); // 9% → 10
  });

  it("바닥은 10%", () => {
    expect(shareFull([])).toBe(10);
    expect(shareFull([0.01])).toBe(10);
  });
});

describe("rankByAbs", () => {
  it("음수도 크기로 줄을 세운다", () => {
    const out = rankByAbs([{ r: 0.2 }, { r: -0.5 }, { r: 0.3 }]);
    expect(out.map((x) => x.r)).toEqual([-0.5, 0.3, 0.2]);
  });

  it("크기가 같으면 들어온 순서를 지킨다", () => {
    const out = rankByAbs([
      { r: 0.3, k: "a" },
      { r: -0.3, k: "b" },
    ]);
    expect(out.map((x) => x.k)).toEqual(["a", "b"]);
  });

  it("원본 배열을 건드리지 않는다", () => {
    const xs = [{ r: 0.1 }, { r: 0.9 }];
    rankByAbs(xs);
    expect(xs[0].r).toBe(0.1);
  });
});
