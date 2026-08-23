import { describe, expect, it } from "vitest";
import {
  CHARACTER_AXES,
  CHARACTER_CUBE,
  TEMPERAMENT_AXES,
  TEMPERAMENT_CUBE,
  characterCube,
  temperamentCube,
  type AxisInput,
} from "./cube";

const at = (percent: number): AxisInput => ({
  percent,
  band: percent < 40 ? "lower" : percent > 60 ? "upper" : "middle",
});

const temper = (ns: number, ha: number, rd: number) =>
  ({ 자극추구: at(ns), 위험회피: at(ha), 사회적민감성: at(rd) });

describe("큐브", () => {
  it("기질 8개 · 성격 8개, 합 16개", () => {
    expect(Object.keys(TEMPERAMENT_CUBE)).toHaveLength(8);
    expect(Object.keys(CHARACTER_CUBE)).toHaveLength(8);
  });

  it("두 큐브를 곱하지 않는다 — 64가 아니라 16이다", () => {
    const total = Object.keys(TEMPERAMENT_CUBE).length + Object.keys(CHARACTER_CUBE).length;
    expect(total).toBe(16);
  });

  it("인내력은 기질 큐브에 들어가지 않는다", () => {
    expect(TEMPERAMENT_AXES).not.toContain("인내력");
    expect([...TEMPERAMENT_AXES, ...CHARACTER_AXES]).toHaveLength(6);
  });

  it("대문자가 높음, 소문자가 낮음", () => {
    expect(temperamentCube(temper(80, 80, 80))?.key).toBe("NHR");
    expect(temperamentCube(temper(20, 20, 20))?.key).toBe("nhr");
    expect(temperamentCube(temper(80, 20, 80))?.key).toBe("NhR");
  });

  it("50에서 갈린다", () => {
    expect(temperamentCube(temper(50, 20, 20))?.key).toBe("Nhr");
    expect(temperamentCube(temper(49, 20, 20))?.key).toBe("nhr");
  });

  it("보통 구간인 축은 뚜렷하지 않다고 표시한다 — 51을 높음이라고만 하면 없는 특징을 있다고 말하는 셈", () => {
    const r = temperamentCube(temper(51, 80, 20));
    expect(r?.unclear).toEqual(["자극추구"]);
  });

  it("셋 다 뚜렷하면 표시할 것이 없다", () => {
    expect(temperamentCube(temper(80, 80, 20))?.unclear).toEqual([]);
  });

  it("성격 큐브도 같은 방식", () => {
    const r = characterCube({ 자율성: at(80), 연대감: at(20), 자기초월: at(80) });
    expect(r?.key).toBe("ScT");
    expect(r?.text).toContain("자기 기준이 뚜렷");
  });

  it("축이 빠지면 아무것도 내지 않는다 — 없는 해석을 지어내지 않는다", () => {
    expect(temperamentCube({ 자극추구: at(80) })).toBeNull();
  });

  it("서술문에 유형 이름이 들어가지 않는다 (00 §5 라벨링 금지)", () => {
    const banned = ["폭발적", "무관심", "열정적", "독립적", "창의적", "유형"];
    for (const text of [...Object.values(TEMPERAMENT_CUBE), ...Object.values(CHARACTER_CUBE)])
      for (const w of banned) expect(text).not.toContain(w);
  });
});
