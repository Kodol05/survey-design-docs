import { SCALE_MAX, SCALE_MIN, reverseValue } from "./score";

/**
 * 응답 품질 지표 — docs/00-design-notes.md §2.3
 *
 * 채택한 두 축만 본다.
 *   1) 문항별 응답시간 — 읽지도 않고 찍었는가
 *   2) 반대 문항 짝 일치도 — 서로 반대인 문항에 같은 방향으로 답했는가
 *
 * 쓰지 않는 것: longstring(동일응답 연속)은 연구에서 탐지력이 없는 것으로
 * 나왔고, Mahalanobis 거리는 표본 50명에서 불안정하다 (00 §2.3).
 *
 * ⚠️ 이 지표는 **성격에 대한 판정이 아니다.** "이 응답 데이터를 믿을 수
 *    있는가"에 대한 것이다 (01 §4.0). 자동으로 제외하지 않고 표시만 한다.
 */

/**
 * 임계값 — 전부 편의값이다.
 *
 * D-26(구간 경계)·D-24(30명)와 같은 성격으로, 통계적 근거가 있는 값이 아니라
 * "이 정도면 이상하다"는 상식선이다. 실제 응답이 쌓이면 분포를 보고 조정한다.
 * 조정하기 쉽도록 여기 한곳에 모아 둔다.
 */
export const QUALITY = {
  /** 문항 하나를 이 시간 안에 답했다면 읽지 않은 것으로 본다 */
  fastItemMs: 1500,
  /** 빠른 문항 비율이 이 이상이면 검토 / 미달 */
  fastRatioReview: 0.2,
  fastRatioPoor: 0.4,
  /** 짝 일치도가 이 아래면 검토 / 미달. 무작위로 찍으면 .6 근처가 나온다 */
  agreementReview: 0.7,
  agreementPoor: 0.55,
  /** 짝 하나에서 이만큼 어긋나면 "대놓고 모순"으로 센다 (7점 척도, 최대 6) */
  contradictionGap: 4,
} as const;

export type QualityFlag = "ok" | "review" | "poor";

export type ResponseRecord = {
  code: string;
  value: number;
  elapsedMs: number;
};

/** 역방향 짝. `a`가 정방향, `b`가 역방향이어야 한다. */
export type AntonymPair = { a: string; b: string };

export type QualityResult = {
  meanElapsedMs: number;
  /** 하한 미만으로 답한 문항 수 */
  fastCount: number;
  fastRatio: number;
  /** 0~1. 1이면 짝마다 완전히 일관되게 답한 것 */
  antonymAgreement: number;
  /** 대놓고 모순된 짝의 수 */
  contradictions: number;
  pairCount: number;
  flag: QualityFlag;
  /** 사람이 읽을 수 있는 사유. 화면에 그대로 쓴다 */
  reasons: string[];
};

/**
 * 짝 일치도.
 *
 * 역방향 문항에 역채점을 적용하면 두 값은 같은 방향을 가리켜야 한다.
 * 7점 척도에서 차이의 최대는 6이므로 `1 - 평균차이/6`으로 0~1에 맞춘다.
 */
export function pairAgreement(forward: number, reverseAnswer: number): number {
  const aligned = reverseValue(reverseAnswer);
  return 1 - Math.abs(forward - aligned) / (SCALE_MAX - SCALE_MIN);
}

export function assessQuality(
  responses: ResponseRecord[],
  pairs: AntonymPair[],
): QualityResult {
  const byCode = new Map(responses.map((r) => [r.code, r]));
  const reasons: string[] = [];

  // ── 응답시간 ──
  // 평균은 기록용으로만 쓴다. 중간에 자리를 비운 사람이 있으면 평균이 크게
  // 늘어나므로, 판정은 "빠른 문항 비율"로 한다.
  const total = responses.length;
  const meanElapsedMs = total
    ? Math.round(responses.reduce((s, r) => s + r.elapsedMs, 0) / total)
    : 0;
  const fastCount = responses.filter(
    (r) => r.elapsedMs < QUALITY.fastItemMs,
  ).length;
  const fastRatio = total ? fastCount / total : 0;

  // ── 짝 일치도 ──
  let sum = 0;
  let counted = 0;
  let contradictions = 0;
  for (const { a, b } of pairs) {
    const ra = byCode.get(a);
    const rb = byCode.get(b);
    if (!ra || !rb) continue;
    const agree = pairAgreement(ra.value, rb.value);
    sum += agree;
    counted++;
    const gap = Math.abs(ra.value - reverseValue(rb.value));
    if (gap >= QUALITY.contradictionGap) contradictions++;
  }
  const antonymAgreement = counted ? sum / counted : 1;

  // ── 판정 ──
  let flag: QualityFlag = "ok";

  if (fastRatio >= QUALITY.fastRatioPoor) {
    flag = "poor";
    reasons.push(`문항 ${Math.round(fastRatio * 100)}%를 1.5초 안에 답했습니다`);
  } else if (fastRatio >= QUALITY.fastRatioReview) {
    flag = "review";
    reasons.push(`문항 ${Math.round(fastRatio * 100)}%를 1.5초 안에 답했습니다`);
  }

  if (counted) {
    if (antonymAgreement < QUALITY.agreementPoor) {
      flag = "poor";
      reasons.push(
        `반대 문항 ${contradictions}쌍에서 서로 어긋나게 답했습니다 (일치도 ${antonymAgreement.toFixed(2)})`,
      );
    } else if (antonymAgreement < QUALITY.agreementReview) {
      if (flag !== "poor") flag = "review";
      reasons.push(
        `반대 문항 일치도가 ${antonymAgreement.toFixed(2)}입니다`,
      );
    }
  }

  return {
    meanElapsedMs,
    fastCount,
    fastRatio,
    antonymAgreement,
    contradictions,
    pairCount: counted,
    flag,
    reasons,
  };
}
