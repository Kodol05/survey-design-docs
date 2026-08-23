import { describe, expect, it } from "vitest";
import {
  alphaVerdict,
  correlate,
  crossesZero,
  cronbachAlpha,
  fisherCI,
  fitLinear,
  loocv,
  pearson,
  predict,
} from "./stats";

describe("상관", () => {
  it("완전한 정·부 상관", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 6);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 6);
  });

  it("한쪽이 전부 같은 값이면 0", () => {
    expect(pearson([1, 2, 3], [5, 5, 5])).toBe(0);
  });

  it("길이가 다르면 던진다 — 조용히 짝을 맞추면 엉뚱한 값이 나온다", () => {
    expect(() => pearson([1, 2], [1, 2, 3])).toThrow();
  });
});

describe("신뢰구간", () => {
  it("표본이 작을수록 넓어진다 — 같은 .30이라도 다르다", () => {
    const small = fisherCI(0.3, 37);
    const large = fisherCI(0.3, 500);
    expect(small[1] - small[0]).toBeGreaterThan(large[1] - large[0]);
  });

  it("n=37에서 .30은 0을 겨우 벗어난다", () => {
    const [lo, hi] = fisherCI(0.3, 37);
    expect(lo).toBeGreaterThan(-0.05);
    expect(hi).toBeLessThan(0.6);
  });

  it("0을 걸치는지 판단한다", () => {
    expect(crossesZero({ r: 0.1, n: 37, ci: fisherCI(0.1, 37) })).toBe(true);
    expect(crossesZero({ r: 0.6, n: 37, ci: fisherCI(0.6, 37) })).toBe(false);
  });

  it("표본이 너무 작으면 구간을 좁히지 않는다", () => {
    expect(fisherCI(0.9, 3)).toEqual([-1, 1]);
  });

  it("correlate가 셋을 같이 낸다", () => {
    const c = correlate([1, 2, 3, 4, 5], [2, 4, 5, 4, 6]);
    expect(c.n).toBe(5);
    expect(c.ci).toHaveLength(2);
  });
});

describe("회귀", () => {
  it("직선을 정확히 복원한다", () => {
    const X = [[1], [2], [3], [4]];
    const y = [3, 5, 7, 9]; // y = 2x + 1
    const r = fitLinear(X, y);
    expect(r.intercept).toBeCloseTo(1, 3);
    expect(r.coefficients[0]).toBeCloseTo(2, 3);
    expect(predict(r, [10])).toBeCloseTo(21, 2);
  });

  it("예측변수 두 개도 푼다", () => {
    const X = [
      [1, 1],
      [2, 1],
      [1, 2],
      [3, 2],
      [2, 3],
    ];
    const y = X.map(([a, b]) => 5 + 2 * a - 3 * b);
    const r = fitLinear(X, y);
    expect(r.coefficients[0]).toBeCloseTo(2, 2);
    expect(r.coefficients[1]).toBeCloseTo(-3, 2);
  });
});

describe("LOOCV", () => {
  it("관계가 없는 데이터에서는 교차검증 오차가 훈련 오차보다 크다 — 과적합이 드러난다", () => {
    let s = 7;
    const rnd = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const X = Array.from({ length: 25 }, () =>
      Array.from({ length: 7 }, () => rnd() * 100),
    );
    const y = Array.from({ length: 25 }, () => rnd() * 100);
    const r = loocv(X, y);
    expect(r.gap).toBeGreaterThan(0);
    expect(r.cvMae).toBeGreaterThan(r.trainMae);
  });

  it("진짜 관계가 있으면 둘 다 작다", () => {
    const X = Array.from({ length: 30 }, (_, i) => [i, i * 0.5]);
    const y = X.map(([a]) => 10 + 2 * a);
    const r = loocv(X, y);
    expect(r.cvMae).toBeLessThan(0.5);
  });

  it("사람 수만큼 점을 낸다 — 산점도에 그대로 쓴다", () => {
    const X = Array.from({ length: 12 }, (_, i) => [i]);
    const y = X.map(([a]) => a * 3);
    expect(loocv(X, y).points).toHaveLength(12);
  });
});

describe("Cronbach's α", () => {
  it("문항이 서로 맞물리면 높다", () => {
    const rows = [
      [5, 5, 5, 5],
      [1, 1, 1, 1],
      [3, 3, 3, 3],
      [4, 4, 4, 4],
      [2, 2, 2, 2],
    ];
    expect(cronbachAlpha(rows)!).toBeGreaterThan(0.95);
  });

  it("문항이 따로 놀면 낮다", () => {
    const rows = [
      [1, 7, 2, 5],
      [7, 2, 6, 1],
      [4, 5, 1, 7],
      [2, 6, 7, 3],
      [6, 1, 4, 4],
      [3, 7, 5, 2],
    ];
    expect(cronbachAlpha(rows)!).toBeLessThan(0.5);
  });

  it("전원 총점이 같으면 계산할 수 없다고 낸다", () => {
    // 문항끼리 완전히 상쇄되면 총점 분산이 0이라 α가 정의되지 않는다
    expect(
      cronbachAlpha([
        [1, 7],
        [7, 1],
        [4, 4],
      ]),
    ).toBeNull();
  });

  it("사람이나 문항이 부족하면 내지 않는다 — 없는 값을 지어내지 않는다", () => {
    expect(cronbachAlpha([[1, 2, 3]])).toBeNull();
    expect(cronbachAlpha([[1], [2]])).toBeNull();
  });

  it("판정", () => {
    expect(alphaVerdict(null)).toBe("unknown");
    expect(alphaVerdict(0.55)).toBe("poor");
    expect(alphaVerdict(0.65)).toBe("fair");
    expect(alphaVerdict(0.85)).toBe("good");
  });
});
