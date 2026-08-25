import { describe, expect, it } from "vitest";
import { splitByTrait, splitsFor } from "./split";
import type { Person } from "./analysis";

const P = (n: number, traits: Record<string, number>, v: number): Person => ({
  employeeId: `e${n}`,
  name: `사람${n}`,
  traits,
  abilities: { 협력: v, 조직생활: v, 자율적실행: v },
  quality: "ok",
});

/** 인내력이 높을수록 값도 높은 아홉 명 */
const rising = [10, 20, 30, 40, 50, 60, 70, 80, 90].map((t, i) =>
  P(i, { 인내력: t, 자극추구: [50, 20, 80, 40, 60, 30, 70, 45, 55][i] }, t),
);

describe("splitByTrait", () => {
  it("사람이 적어 무리가 둘이 안 되면 재지 않는다", () => {
    const few = [10, 50, 90].map((t, i) => P(i, { 인내력: t }, t));
    expect(splitByTrait(few, "인내력", (p) => p.abilities["협력"])).toBeNull();
  });

  it("3분의 1씩 떼어 양끝을 견준다", () => {
    const s = splitByTrait(rising, "인내력", (p) => p.abilities["협력"])!;
    expect(s.groupN).toBe(3);
    // 위 셋 70·80·90 = 80, 아래 셋 10·20·30 = 20
    expect(s.upperMean).toBeCloseTo(80);
    expect(s.lowerMean).toBeCloseTo(20);
    expect(s.diff).toBeCloseTo(60);
    expect(s.settled).toBe(true);
  });

  it("축이 낮은 쪽이 높으면 차이가 음수다 — 방향을 부호로 말한다", () => {
    const falling = [10, 20, 30, 40, 50, 60, 70, 80, 90].map((t, i) =>
      P(i, { 위험회피: t }, 100 - t),
    );
    const s = splitByTrait(falling, "위험회피", (p) => p.abilities["협력"])!;
    expect(s.diff).toBeLessThan(0);
    expect(s.upperMean).toBeLessThan(s.lowerMean);
  });

  it("값이 없는 사람은 빼고 센다", () => {
    const withGap = [...rising];
    const broken = P(99, { 인내력: 55 }, 50);
    delete broken.abilities["협력"];
    withGap.push(broken);
    const s = splitByTrait(withGap, "인내력", (p) => p.abilities["협력"])!;
    expect(s.groupN).toBe(3);
  });

  it("관계가 없으면 구간이 0을 걸쳐 확정되지 않는다", () => {
    /*
      축은 10부터 90까지 고르게 오르는데 값은 무리 안에서 크게 흩어진다.
      양쪽 무리의 평균이 같아 차이가 0이고, 퍼진 정도가 커서 구간이 넓다.
    */
    const traits = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const values = [10, 90, 50, 40, 50, 60, 90, 10, 50];
    const noise = traits.map((t, i) => P(i, { 인내력: t }, values[i]));
    const s = splitByTrait(noise, "인내력", (p) => p.abilities["협력"])!;
    expect(s.diff).toBeCloseTo(0);
    expect(s.settled).toBe(false);
  });
});

describe("splitsFor", () => {
  it("차이가 큰 순으로 줄 세운다 — 방향과 무관하게", () => {
    const out = splitsFor(rising, (p) => p.abilities["협력"]);
    expect(out[0].scale).toBe("인내력");
    expect(Math.abs(out[0].diff)).toBeGreaterThan(Math.abs(out[1].diff));
  });

  it("잴 수 있는 축만 남긴다", () => {
    const out = splitsFor(rising, (p) => p.abilities["협력"]);
    // 일곱 축 중 값이 있는 둘만 나온다
    expect(out.map((s) => s.scale).sort()).toEqual(["인내력", "자극추구"]);
  });
});
