import { ABILITY_AXES } from "@/lib/items/types";

/**
 * 직무능력 값을 **어디서 가져올지**.
 *
 * 같은 사람의 「협력」에 값이 둘이다 — 본인이 설문에서 답한 것과 대표님이
 * 매긴 것. 화면마다 하나를 골라 쓰고, 제목을 눌러 바꾼다.
 *
 * ## 평균이 항상 나은 값은 아니다
 *
 * 성향과 직무능력이 **둘 다 같은 사람이 같은 날 쓴 자기보고**다. 이러면
 * 상관이 실제보다 부풀어 오른다 (Podsakoff 2003, 00 §2.6).
 *
 * 대표님 평가는 그 편향이 없는 **별개 출처**라 대조축으로는 오히려 더
 * 믿을 만하다. 평균을 내면 그 장점이 반쯤 희석된다. 그래서 평균은
 * 훑어보기용으로 두고, 화면에 이 차이를 한 줄로 적어 둔다.
 */
export const ABILITY_SOURCES = ["self", "boss", "mean"] as const;
export type AbilitySource = (typeof ABILITY_SOURCES)[number];

export const SOURCE_LABEL: Record<AbilitySource, string> = {
  self: "직원 설문 직무능력",
  boss: "대표님 평가 직무능력",
  mean: "두 값 평균",
};

export const SOURCE_NOTE: Record<AbilitySource, string> = {
  self: "본인이 설문에서 답한 값입니다. 성향과 같은 설문이라 관련도가 실제보다 높게 나올 수 있습니다.",
  boss: "대표님이 1~10으로 매긴 값을 0~100으로 옮긴 것입니다. 성향과 출처가 달라 대조축으로는 이쪽이 낫습니다.",
  mean: "두 값을 반씩 섞은 것입니다. 훑어볼 때 쓰고, 관련도를 따질 때는 한쪽만 보는 편이 낫습니다.",
};

/** 주소에 붙는 이름. `?src=boss` */
export const SOURCE_PARAM = "src";

export function parseSource(v: string | undefined): AbilitySource {
  return ABILITY_SOURCES.includes(v as AbilitySource) ? (v as AbilitySource) : "self";
}

/**
 * 평가자 이름.
 *
 * `대표`는 대표님이 화면에서 직접 매긴 것, `데모`는 확인용으로 심은 것이다.
 * **섞으면 "평가한 적 없는데 기록이 있다"가 된다** — 실제로 한 번 그렇게 됐다.
 *
 * 입력 화면은 `대표`만 보여주고, 분석 화면은 둘 다 읽되 `대표`를 우선한다.
 */
export const RATER = { real: "대표", demo: "데모" } as const;

/** 대표님 평가 눈금 — 1~10 (2026-08-24 사용자 결정) */
export const RATING = { min: 1, max: 10 } as const;

/**
 * 1~10을 0~100으로 옮긴다.
 *
 * `1 → 0`, `5.5 → 50`, `10 → 100`. 직원 설문 직무능력이 이미 0~100이라
 * **세 소스가 같은 자로 잰 값**이 된다. 그래야 평균도 비교도 말이 된다.
 */
export function ratingToPercent(score: number): number {
  return ((score - RATING.min) / (RATING.max - RATING.min)) * 100;
}

export function isValidRating(score: number): boolean {
  return Number.isInteger(score) && score >= RATING.min && score <= RATING.max;
}

/**
 * 고른 소스대로 한 사람의 직무능력 값을 만든다.
 *
 * **한쪽이 없으면 그 축은 빼 버린다.** 0으로 채우거나 있는 쪽으로 때우면
 * "대표님이 아직 안 매긴 사람"이 "낮게 평가받은 사람"으로 보인다.
 * 값이 없는 것과 낮은 것은 다르다.
 *
 * @param self  설문에서 나온 0~100
 * @param boss  대표님이 매긴 1~10 (축 이름 → 점수)
 */
export function resolveAbilities(
  source: AbilitySource,
  self: Record<string, number>,
  boss: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const axis of ABILITY_AXES) {
    const a = self[axis];
    const b = typeof boss[axis] === "number" ? ratingToPercent(boss[axis]) : undefined;

    if (source === "self") {
      if (typeof a === "number") out[axis] = a;
    } else if (source === "boss") {
      if (b !== undefined) out[axis] = b;
    } else {
      if (typeof a === "number" && b !== undefined) out[axis] = (a + b) / 2;
    }
  }
  return out;
}
