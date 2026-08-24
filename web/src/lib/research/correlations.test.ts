import { describe, expect, it } from "vitest";
import { getCell, loadResearchTable, relatedScales } from "./correlations";
import { ABILITY_AXES, TRAIT_SCALES } from "../items/types";

describe("연구 관련도 표", () => {
  const t = loadResearchTable();

  it("7축 × 3능력 = 21칸이 빠짐없이 있다", () => {
    expect(t.cells.size).toBe(TRAIT_SCALES.length * ABILITY_AXES.length);
  });

  it("08의 표와 값이 같다", () => {
    expect(getCell(t, "위험회피", "협력")).toMatchObject({ kind: "value", value: -0.25 });
    expect(getCell(t, "사회적민감성", "협력")).toMatchObject({ kind: "value", value: -0.34 });
    expect(getCell(t, "인내력", "협력")).toMatchObject({ kind: "value", value: 0.28 });
    expect(getCell(t, "자율성", "자율적실행")).toMatchObject({ kind: "value", value: 0.48 });
    expect(getCell(t, "연대감", "자율적실행")).toMatchObject({ kind: "value", value: 0.23 });
  });

  it("'없음'과 '—'를 구분해서 저장한다 — 이게 뭉개지면 화면에서 못 살린다", () => {
    // 이름이 "연대감"인데 협력과는 관련이 없었다 (연구함)
    expect(getCell(t, "연대감", "협력").kind).toBe("none");
    // 자극추구 × 협력은 아무도 안 봤다 (연구 안 함)
    expect(getCell(t, "자극추구", "협력").kind).toBe("unstudied");
  });

  it("조직생활에는 직접 잰 값이 하나도 없다", () => {
    /*
      2026-08-24에 「전부 unstudied」에서 바뀌었다. 07의 정의대로 쪼개서
      방향(expected)만 세운 칸이 생겼다. **숫자(value)는 여전히 하나도 없다** —
      이게 깨지면 어디선가 없는 계수를 지어넣은 것이다.
    */
    for (const s of TRAIT_SCALES)
      expect(getCell(t, s, "조직생활").kind).not.toBe("value");
  });

  it("방향만 세운 칸에는 부호·비중·근거·출처가 다 있다", () => {
    let found = 0;
    for (const cell of t.cells.values()) {
      if (cell.kind !== "expected") continue;
      found++;
      expect([1, -1]).toContain(cell.direction);
      expect(cell.weight).toBeGreaterThan(0);
      expect(cell.weight).toBeLessThanOrEqual(1);
      expect(cell.basis.length).toBeGreaterThan(5);
      expect(t.sources[cell.source]).toBeTruthy();
    }
    expect(found).toBeGreaterThan(0);
  });

  it("값이 있는 칸은 출처가 반드시 붙어 있다", () => {
    for (const cell of t.cells.values())
      if (cell.kind === "value") expect(t.sources[cell.source]).toBeTruthy();
  });

  it("관련 성향 축을 절댓값 큰 순으로 준다", () => {
    const r = relatedScales(t, "협력");
    expect(r[0]).toEqual({ scale: "사회적민감성", value: -0.34 });
    expect(r[1]).toEqual({ scale: "인내력", value: 0.28 });
    expect(relatedScales(t, "조직생활")).toHaveLength(0);
  });
});
