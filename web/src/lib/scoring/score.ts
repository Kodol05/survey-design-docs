/**
 * 채점 엔진 — docs/00-design-notes.md §3, D-08, D-09, D-26
 *
 * DB도 네트워크도 쓰지 않는 순수 함수다. 화면 없이 테스트로만 검증한다.
 * 채점이 틀리면 이 시스템의 모든 화면이 틀린 숫자를 보여주게 되므로,
 * 여기만큼은 계산 과정을 전부 드러내 둔다.
 */

export const SCALE_MIN = 1;
export const SCALE_MAX = 7;

/**
 * 구간 경계 (D-26). 편의값이지만 **중립(50)을 기준으로 대칭**이다.
 * 7점 척도에서 ±0.6점쯤에 해당한다. 응답 30건 후 재조정한다.
 */
export const BAND = { lower: 40, upper: 60 } as const;

export type Band = "lower" | "middle" | "upper";

/** 채점에 필요한 문항 정보만 추린 것. Prisma 모델에 묶이지 않게 따로 둔다. */
export type ScorableItem =
  | {
      code: string;
      kind: "TRAIT";
      scale: string;
      subscale: string;
      isReverse: boolean;
    }
  | {
      code: string;
      kind: "ABILITY";
      abilityAxis: string;
      isReverse: boolean;
    };

export type Answer = { code: string; value: number };

export type AxisScore = {
  /** 역채점을 적용한 뒤의 합 */
  raw: number;
  /** 이 축에서 받을 수 있는 최저 점수 (문항 수 × 1) */
  min: number;
  /** 이 축에서 받을 수 있는 최대 점수 (문항 수 × 7) */
  max: number;
  /** 범위 대비 % — 개인에게 보여주는 값 (D-09) */
  percent: number;
  band: Band;
  itemCount: number;
};

export type ScoreResult = {
  /** 7축 */
  traits: Record<string, AxisScore & { facets: Record<string, AxisScore> }>;
  /** 직무능력 3축 */
  abilities: Record<string, AxisScore>;
};

export class ScoringError extends Error {}

/**
 * 역채점.
 *
 * 7점 척도이므로 `8 - value`다. 5점 척도였다면 `6 - value`였다.
 * D-08에서 7점으로 확정되며 이 상수가 바뀌었으므로, 눈에 띄게 남겨 둔다.
 */
export function reverseValue(value: number): number {
  return SCALE_MIN + SCALE_MAX - value;
}

/**
 * 범위 대비 %.
 *
 * 7점 척도의 최저는 0이 아니라 문항 수 × 1이다. 만점으로만 나누면
 * 전 문항 최저로 답해도 14.3%가 나오고 **중립이 57.1%로 밀려서
 * 눈금의 가운데가 가운데가 아니게 된다.**
 *
 * 그래서 받을 수 있는 범위로 나눈다.
 *   전 문항 1점 → 0     전 문항 4점 → 50     전 문항 7점 → 100
 */
export function toPercent(raw: number, itemCount: number): number {
  const span = itemCount * (SCALE_MAX - SCALE_MIN);
  if (span <= 0) return 0;
  return ((raw - itemCount * SCALE_MIN) / span) * 100;
}

export function toBand(percent: number): Band {
  if (percent < BAND.lower) return "lower";
  if (percent > BAND.upper) return "upper";
  return "middle";
}

function makeAxisScore(raw: number, itemCount: number): AxisScore {
  const percent = toPercent(raw, itemCount);
  return {
    raw,
    min: itemCount * SCALE_MIN,
    max: itemCount * SCALE_MAX,
    percent,
    band: toBand(percent),
    itemCount,
  };
}

/**
 * 응답을 채점한다.
 *
 * 문항이 하나라도 비면 채점하지 않는다. 빠진 문항을 0으로 두거나 평균으로
 * 메우면 그 축만 조용히 낮게/높게 나오는데, 화면에서는 구별이 되지 않는다.
 */
export function scoreAssessment(
  items: ScorableItem[],
  answers: Answer[],
): ScoreResult {
  const byCode = new Map(answers.map((a) => [a.code, a.value]));

  const missing = items.filter((i) => !byCode.has(i.code)).map((i) => i.code);
  if (missing.length)
    throw new ScoringError(
      `응답하지 않은 문항이 ${missing.length}개 있습니다: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " 외" : ""}`,
    );

  for (const [code, v] of byCode) {
    if (!Number.isInteger(v) || v < SCALE_MIN || v > SCALE_MAX)
      throw new ScoringError(
        `${code}의 응답값이 ${v}입니다. ${SCALE_MIN}~${SCALE_MAX} 정수여야 합니다`,
      );
  }

  const traitRaw = new Map<string, number>();
  const traitCount = new Map<string, number>();
  const facetRaw = new Map<string, Map<string, number>>();
  const facetCount = new Map<string, Map<string, number>>();
  const abilityRaw = new Map<string, number>();
  const abilityCount = new Map<string, number>();

  const bump = (m: Map<string, number>, k: string, v: number) =>
    m.set(k, (m.get(k) ?? 0) + v);

  for (const item of items) {
    const answered = byCode.get(item.code)!;
    const value = item.isReverse ? reverseValue(answered) : answered;

    if (item.kind === "TRAIT") {
      bump(traitRaw, item.scale, value);
      bump(traitCount, item.scale, 1);
      if (!facetRaw.has(item.scale)) {
        facetRaw.set(item.scale, new Map());
        facetCount.set(item.scale, new Map());
      }
      bump(facetRaw.get(item.scale)!, item.subscale, value);
      bump(facetCount.get(item.scale)!, item.subscale, 1);
    } else {
      bump(abilityRaw, item.abilityAxis, value);
      bump(abilityCount, item.abilityAxis, 1);
    }
  }

  const traits: ScoreResult["traits"] = {};
  for (const [scale, raw] of traitRaw) {
    const facets: Record<string, AxisScore> = {};
    for (const [sub, fraw] of facetRaw.get(scale)!) {
      facets[sub] = makeAxisScore(fraw, facetCount.get(scale)!.get(sub)!);
    }
    traits[scale] = { ...makeAxisScore(raw, traitCount.get(scale)!), facets };
  }

  const abilities: ScoreResult["abilities"] = {};
  for (const [axis, raw] of abilityRaw) {
    abilities[axis] = makeAxisScore(raw, abilityCount.get(axis)!);
  }

  return { traits, abilities };
}
