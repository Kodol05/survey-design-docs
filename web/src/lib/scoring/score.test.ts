import { describe, expect, it } from "vitest";
import {
  BAND,
  ScoringError,
  reverseValue,
  scoreAssessment,
  toBand,
  toPercent,
  type Answer,
  type ScorableItem,
} from "./score";

const trait = (
  code: string,
  scale: string,
  subscale: string,
  isReverse = false,
): ScorableItem => ({ code, kind: "TRAIT", scale, subscale, isReverse });

const ability = (
  code: string,
  abilityAxis: string,
  isReverse = false,
): ScorableItem => ({ code, kind: "ABILITY", abilityAxis, isReverse });

const answerAll = (items: ScorableItem[], value: number): Answer[] =>
  items.map((i) => ({ code: i.code, value }));

describe("역채점", () => {
  it("7점 척도이므로 8에서 뺀다", () => {
    expect(reverseValue(1)).toBe(7);
    expect(reverseValue(7)).toBe(1);
    expect(reverseValue(4)).toBe(4);
  });

  it("역채점 문항은 정방향과 정확히 반대로 합산된다", () => {
    const items = [trait("A", "자율성", "책임감"), trait("B", "자율성", "책임감", true)];
    const r = scoreAssessment(items, [
      { code: "A", value: 7 },
      { code: "B", value: 1 },
    ]);
    // 7 + (8-1) = 14 → 만점 14 → 100%
    expect(r.traits["자율성"].raw).toBe(14);
    expect(r.traits["자율성"].percent).toBe(100);
  });
});

describe("만점 대비 %", () => {
  it("중립(4점)으로 일관되게 답하면 57.1%가 나온다 — D-26의 기준점", () => {
    const items = [trait("A", "인내력", "근면"), trait("B", "인내력", "끈기")];
    const r = scoreAssessment(items, answerAll(items, 4));
    expect(r.traits["인내력"].percent).toBeCloseTo(57.14, 1);
  });

  it("중립 응답은 middle 구간에 들어온다 — 이게 D-26 경계값의 근거", () => {
    expect(toBand(toPercent(4, 7))).toBe("middle");
  });

  it("최저·최고 응답", () => {
    const items = [trait("A", "연대감", "공감")];
    expect(scoreAssessment(items, answerAll(items, 1)).traits["연대감"].percent).toBeCloseTo(14.3, 1);
    expect(scoreAssessment(items, answerAll(items, 7)).traits["연대감"].percent).toBe(100);
  });
});

describe("구간 경계 (D-26)", () => {
  it("50 미만은 lower, 65 초과는 upper", () => {
    expect(toBand(49.9)).toBe("lower");
    expect(toBand(65.1)).toBe("upper");
  });

  it("경계값 자체는 middle에 들어간다", () => {
    expect(toBand(BAND.lower)).toBe("middle");
    expect(toBand(BAND.upper)).toBe("middle");
  });
});

describe("축 합산", () => {
  const items: ScorableItem[] = [
    trait("N1", "자극추구", "탐색적 흥분"),
    trait("N2", "자극추구", "충동성"),
    trait("H1", "위험회피", "예기불안"),
    ability("C1", "협력"),
    ability("O1", "조직생활"),
  ];

  it("축마다 자기 문항만 더한다", () => {
    const r = scoreAssessment(items, [
      { code: "N1", value: 7 },
      { code: "N2", value: 7 },
      { code: "H1", value: 1 },
      { code: "C1", value: 5 },
      { code: "O1", value: 3 },
    ]);
    expect(r.traits["자극추구"].raw).toBe(14);
    expect(r.traits["자극추구"].itemCount).toBe(2);
    expect(r.traits["위험회피"].raw).toBe(1);
    expect(r.abilities["협력"].raw).toBe(5);
    expect(r.abilities["조직생활"].raw).toBe(3);
  });

  it("직무능력은 성향과 섞이지 않는다", () => {
    const r = scoreAssessment(items, answerAll(items, 4));
    expect(Object.keys(r.traits).sort()).toEqual(["위험회피", "자극추구"]);
    expect(Object.keys(r.abilities).sort()).toEqual(["조직생활", "협력"]);
  });

  it("하위척도 점수도 따로 낸다 — 관리자 문항분석용 (U-05)", () => {
    const r = scoreAssessment(items, answerAll(items, 6));
    expect(r.traits["자극추구"].facets["탐색적 흥분"].raw).toBe(6);
    expect(r.traits["자극추구"].facets["충동성"].raw).toBe(6);
  });
});

describe("잘못된 입력은 채점하지 않는다", () => {
  const items = [trait("A", "자율성", "책임감"), trait("B", "자율성", "목적의식")];

  it("응답이 빠지면 던진다 — 0으로 메우면 그 축만 조용히 낮아진다", () => {
    expect(() => scoreAssessment(items, [{ code: "A", value: 4 }])).toThrow(ScoringError);
  });

  it("빠진 문항 코드를 알려준다", () => {
    expect(() => scoreAssessment(items, [{ code: "A", value: 4 }])).toThrow(/B/);
  });

  it("범위 밖 값은 던진다", () => {
    expect(() =>
      scoreAssessment(items, [
        { code: "A", value: 0 },
        { code: "B", value: 4 },
      ]),
    ).toThrow(ScoringError);
    expect(() =>
      scoreAssessment(items, [
        { code: "A", value: 8 },
        { code: "B", value: 4 },
      ]),
    ).toThrow(ScoringError);
  });

  it("정수가 아니면 던진다", () => {
    expect(() =>
      scoreAssessment(items, [
        { code: "A", value: 4.5 },
        { code: "B", value: 4 },
      ]),
    ).toThrow(ScoringError);
  });
});

// ── 실제 문항 114개로 한 번 돌려본다 ────────────────────────────────
// 단위 테스트가 다 통과해도 실제 문항 구성과 안 맞을 수 있다.
import { loadItemFile } from "../items/load";
import { ABILITY_AXIS_DB } from "../items/types";

describe("실제 문항 114개", () => {
  const file = loadItemFile("data/items/v1.yaml", { strictCount: true });
  const items: ScorableItem[] = file.items.map((i) =>
    i.kind === "trait"
      ? trait(i.code, i.scale, i.subscale, Boolean(i.reverse))
      : ability(i.code, i.axis, Boolean(i.reverse)),
  );

  it("7축 + 직무능력 3축이 모두 나온다", () => {
    const r = scoreAssessment(items, answerAll(items, 4));
    expect(Object.keys(r.traits)).toHaveLength(7);
    expect(Object.keys(r.abilities)).toHaveLength(3);
  });

  it("전 문항 중립이면 모든 축이 57.1% middle — 역채점이 한쪽으로 쏠리지 않았다는 뜻", () => {
    const r = scoreAssessment(items, answerAll(items, 4));
    for (const [, s] of Object.entries(r.traits)) {
      expect(s.percent).toBeCloseTo(57.14, 1);
      expect(s.band).toBe("middle");
    }
    for (const [, s] of Object.entries(r.abilities)) {
      expect(s.band).toBe("middle");
    }
  });

  it("성향은 축당 15문항, 직무능력은 축당 3문항", () => {
    const r = scoreAssessment(items, answerAll(items, 4));
    for (const [, s] of Object.entries(r.traits)) expect(s.itemCount).toBe(15);
    for (const [, s] of Object.entries(r.abilities)) expect(s.itemCount).toBe(3);
  });

  it("전 문항 최고점으로 답해도 역채점 문항 때문에 100%가 되지 않는다", () => {
    const r = scoreAssessment(items, answerAll(items, 7));
    // 역방향이 27%쯤 있으므로 모든 축이 100% 아래여야 한다
    for (const [, s] of Object.entries(r.traits)) expect(s.percent).toBeLessThan(100);
  });

  it("직무능력 축 이름이 DB enum 과 대응된다", () => {
    const r = scoreAssessment(items, answerAll(items, 4));
    for (const axis of Object.keys(r.abilities))
      expect(ABILITY_AXIS_DB[axis as keyof typeof ABILITY_AXIS_DB]).toBeTruthy();
  });
});
