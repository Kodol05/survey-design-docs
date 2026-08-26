import { describe, expect, it } from "vitest";
import { ratingToPercent } from "./abilitySource";

/**
 * 대조 화면의 계산 규칙.
 *
 * DB를 띄우지 않고 볼 수 있는 부분만 본다 — 두 값을 같은 자에 놓는 환산과,
 * 「갈렸다」를 판정하는 기준이다. 이 둘이 어긋나면 화면 전체가 틀린 말을 한다.
 */

/** 화면과 같은 기준. 100점 눈금에서 이만큼 벌어지면 갈린 것으로 본다 */
const NOTABLE = 15;

describe("두 값을 같은 자에 놓기", () => {
  it("관리자 1~10이 본인 0~100과 같은 눈금이 된다", () => {
    expect(ratingToPercent(1)).toBe(0);
    expect(ratingToPercent(10)).toBe(100);
  });

  it("같은 뜻이면 차이가 0이다", () => {
    /*
      대표님이 10점 만점에 10을 주고 본인이 100을 답했으면 두 사람이
      같은 말을 한 것이다. 환산이 어긋나면 여기서 차이가 생긴다.
    */
    expect(ratingToPercent(10) - 100).toBe(0);
    expect(ratingToPercent(1) - 0).toBe(0);
    expect(ratingToPercent(5.5) - 50).toBe(0);
  });

  it("한 칸 차이는 약 11점이다", () => {
    // 1~10을 0~100에 펴면 한 칸이 100/9다. 「15점 넘게 갈림」은 한 칸 반쯤
    expect(ratingToPercent(6) - ratingToPercent(5)).toBeCloseTo(100 / 9, 10);
    expect(NOTABLE / (100 / 9)).toBeGreaterThan(1);
  });
});

describe("갈렸다 판정", () => {
  const worstOf = (gaps: number[]) => Math.max(0, ...gaps.map(Math.abs));

  it("한 축만 크게 벌어져도 잡는다", () => {
    /*
      평균을 쓰면 +와 −가 상쇄된다. 협력에서 +20, 조직생활에서 −20이면
      평균은 0이지만 두 축 다 크게 갈린 사람이다.
    */
    expect(worstOf([20, -20, 0])).toBe(20);
    const mean = (20 - 20 + 0) / 3;
    expect(mean).toBe(0);
  });

  it("기준 아래는 안 잡는다", () => {
    expect(worstOf([5, -8, 3]) >= NOTABLE).toBe(false);
    expect(worstOf([5, -16, 3]) >= NOTABLE).toBe(true);
  });

  it("축이 하나도 없으면 0이다 — 빈 배열에서 -Infinity가 나오면 안 된다", () => {
    expect(worstOf([])).toBe(0);
  });
});
