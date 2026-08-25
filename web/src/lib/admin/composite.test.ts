import { describe, expect, it } from "vitest";
import { abilityComposite } from "./composite";
import type { Person } from "./analysis";

const P = (
  n: number,
  abil: [number, number, number],
  traits: Record<string, number> = {},
): Person => ({
  employeeId: `e${n}`,
  name: `사람${n}`,
  traits,
  abilities: { 협력: abil[0], 조직생활: abil[1], 자율적실행: abil[2] },
  quality: "ok",
});

describe("abilityComposite", () => {
  it("사람이 너무 적으면 만들지 않는다", () => {
    expect(abilityComposite([P(1, [50, 50, 50])])).toBeNull();
  });

  it("합이 아니라 평균이라 눈금이 0~100 그대로다", () => {
    const c = abilityComposite([
      P(1, [30, 60, 90]),
      P(2, [10, 20, 30]),
      P(3, [70, 80, 90]),
      P(4, [40, 50, 60]),
    ])!;
    expect(c.values[0].value).toBeCloseTo(60);
    expect(c.values[1].value).toBeCloseTo(20);
  });

  it("한 축이라도 없으면 그 사람은 뺀다", () => {
    const missing = P(9, [50, 50, 50]);
    delete missing.abilities["조직생활"];
    const c = abilityComposite([
      P(1, [30, 60, 90]),
      P(2, [10, 20, 30]),
      P(3, [70, 80, 90]),
      P(4, [40, 50, 60]),
      missing,
    ])!;
    expect(c.values.map((v) => v.name)).not.toContain("사람9");
    expect(c.values).toHaveLength(4);
  });

  it("축끼리의 상관을 세 쌍 다 준다 — 묶어도 되는지의 근거", () => {
    const c = abilityComposite([
      P(1, [30, 60, 90]),
      P(2, [10, 20, 30]),
      P(3, [70, 80, 90]),
      P(4, [40, 50, 60]),
    ])!;
    expect(c.pairs).toHaveLength(3);
    expect(c.pairs.map((p) => `${p.a}×${p.b}`)).toEqual([
      "협력×조직생활",
      "협력×자율적실행",
      "조직생활×자율적실행",
    ]);
  });

  it("세 축이 나란히 움직이면 α가 높다", () => {
    const c = abilityComposite([
      P(1, [10, 12, 11]),
      P(2, [30, 32, 29]),
      P(3, [50, 51, 49]),
      P(4, [70, 72, 71]),
      P(5, [90, 88, 91]),
    ])!;
    expect(c.alpha).toBeGreaterThan(0.9);
    expect(c.verdict).toBe("good");
  });

  it("세 축이 따로 놀면 α가 낮다", () => {
    const c = abilityComposite([
      P(1, [10, 90, 50]),
      P(2, [90, 10, 50]),
      P(3, [50, 50, 10]),
      P(4, [50, 10, 90]),
      P(5, [10, 50, 90]),
    ])!;
    expect(c.alpha!).toBeLessThan(0.5);
  });

  it("성향과 총합의 상관을 큰 순으로 준다", () => {
    // 인내력은 총합과 나란히 움직이고, 자극추구는 무관하게 둔다
    const rows = [10, 30, 50, 70, 90].map((v, i) =>
      P(i, [v, v, v], { 인내력: v, 자극추구: [50, 20, 80, 40, 60][i] }),
    );
    const c = abilityComposite(rows)!;
    expect(c.drivers[0].scale).toBe("인내력");
    expect(c.drivers[0].corr.r).toBeGreaterThan(0.95);
  });

  it("방향이 반대여도 크면 위로 온다 — 절댓값 순", () => {
    const rows = [10, 30, 50, 70, 90].map((v, i) =>
      P(i, [v, v, v], { 위험회피: 100 - v, 자극추구: [50, 20, 80, 40, 60][i] }),
    );
    const c = abilityComposite(rows)!;
    expect(c.drivers[0].scale).toBe("위험회피");
    expect(c.drivers[0].corr.r).toBeLessThan(-0.95);
  });
});

describe("topGroup", () => {
  const P2 = (n: number, v: number, traits: Record<string, number>) => ({
    employeeId: `e${n}`,
    name: `사람${n}`,
    traits,
    abilities: { 협력: v, 조직생활: v, 자율적실행: v },
    quality: "ok",
  });

  it("맨 위와 사실상 같은 크기면 같이 묶는다 — .01 차이로 순위를 매기지 않는다", () => {
    // 인내력과 연대감을 거의 같은 정도로 연관시킨다
    const vals = [10, 30, 50, 70, 90];
    const rows = vals.map((v, i) =>
      P2(i, v, {
        인내력: v,
        연대감: [12, 28, 52, 68, 92][i],
        자극추구: [50, 20, 80, 40, 60][i],
      }),
    );
    const c = abilityComposite(rows)!;
    expect(c.topGroup.length).toBeGreaterThanOrEqual(2);
    expect(c.topGroup.map((t) => t.scale)).toContain("연대감");
  });

  it("확실히 큰 것 하나뿐이면 하나만 묶인다", () => {
    const vals = [10, 30, 50, 70, 90];
    const rows = vals.map((v, i) =>
      P2(i, v, { 인내력: v, 자극추구: [50, 20, 80, 40, 60][i] }),
    );
    const c = abilityComposite(rows)!;
    expect(c.topGroup).toHaveLength(1);
    expect(c.topGroup[0].scale).toBe("인내력");
  });
});
