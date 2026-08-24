import { describe, expect, it } from "vitest";
import { compareToResearch } from "./researchCompare";
import { getCell, loadResearchTable } from "@/lib/research/correlations";
import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import type { Correlation } from "./stats";

/** 연구값이 실제로 들어 있는 첫 칸을 찾아 그것으로 시험한다 */
function aStudiedCell() {
  const table = loadResearchTable();
  for (const scale of TRAIT_SCALES)
    for (const axis of ABILITY_AXES) {
      const c = getCell(table, scale, axis);
      if (c.kind === "value") return { scale, axis, value: c.value };
    }
  throw new Error("연구값이 하나도 없다");
}

const matrixOf = (entries: [string, Correlation][]) => ({
  cells: new Map(entries),
});

describe("compareToResearch", () => {
  it("연구값이 우리 구간 안에 들어오면 들어맞음", () => {
    const { scale, axis, value } = aStudiedCell();
    const m = matrixOf([
      [`${scale} ${axis}`, { r: value + 0.15, n: 44, ci: [value - 0.1, value + 0.4] }],
    ]);

    const out = compareToResearch(m);
    const row = out.rows.find((r) => r.scale === scale && r.axis === axis)!;

    expect(row.compatible).toBe(true);
    expect(out.comparable).toBe(1);
    expect(out.compatible).toBe(1);
  });

  it("구간 밖이면 어긋남 — 차이가 작아도 구간이 좁으면 걸린다", () => {
    const { scale, axis, value } = aStudiedCell();
    const m = matrixOf([
      [
        `${scale} ${axis}`,
        { r: value + 0.12, n: 400, ci: [value + 0.05, value + 0.19] },
      ],
    ]);

    expect(compareToResearch(m).rows[0].compatible).toBe(false);
  });

  it("차이가 커도 구간이 넓으면 어긋났다고 하지 않는다", () => {
    const { scale, axis, value } = aStudiedCell();
    const m = matrixOf([
      [`${scale} ${axis}`, { r: value + 0.4, n: 31, ci: [value - 0.2, value + 0.8] }],
    ]);

    const row = compareToResearch(m).rows[0];
    expect(Math.abs(row.diff)).toBeCloseTo(0.4, 5);
    expect(row.compatible).toBe(true);
  });

  it("우리 값이 없는 칸은 비교하지 않고 세기만 한다", () => {
    const out = compareToResearch(matrixOf([]));
    expect(out.comparable).toBe(0);
    expect(out.noResearch).toBe(TRAIT_SCALES.length * ABILITY_AXES.length);
  });

  it("차이가 큰 칸이 위로 온다", () => {
    const table = loadResearchTable();
    const studied: [string, Correlation][] = [];
    for (const scale of TRAIT_SCALES)
      for (const axis of ABILITY_AXES) {
        const c = getCell(table, scale, axis);
        if (c.kind !== "value") continue;
        // 칸마다 차이를 다르게 준다
        const gap = 0.05 * (studied.length + 1);
        studied.push([
          `${scale} ${axis}`,
          { r: c.value + gap, n: 44, ci: [c.value - 1, c.value + 1] },
        ]);
      }

    const rows = compareToResearch(matrixOf(studied)).rows;
    expect(rows.length).toBeGreaterThan(1);
    for (let i = 1; i < rows.length; i++)
      expect(Math.abs(rows[i - 1].diff)).toBeGreaterThanOrEqual(Math.abs(rows[i].diff));
  });
});
