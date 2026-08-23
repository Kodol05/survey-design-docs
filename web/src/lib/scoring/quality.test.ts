import { describe, expect, it } from "vitest";
import { QUALITY, assessQuality, pairAgreement, type AntonymPair, type ResponseRecord } from "./quality";
import { loadItemFile } from "../items/load";

/** 결과가 매번 같아야 하므로 Math.random 대신 고정 난수를 쓴다 */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const resp = (code: string, value: number, elapsedMs = 4000): ResponseRecord => ({
  code,
  value,
  elapsedMs,
});

describe("짝 일치도", () => {
  it("정방향 7 · 역방향 1이면 완전히 일치한다", () => {
    // 역채점하면 1 → 7. 둘 다 7이므로 일치
    expect(pairAgreement(7, 1)).toBe(1);
  });

  it("둘 다 7이면 최대로 어긋난다", () => {
    // "새로운 것이 좋다"와 "익숙한 것이 좋다"에 둘 다 매우 그렇다
    expect(pairAgreement(7, 7)).toBe(0);
  });

  it("둘 다 중립이면 일치", () => {
    expect(pairAgreement(4, 4)).toBe(1);
  });
});

describe("응답시간", () => {
  const pairs: AntonymPair[] = [];
  const items = Array.from({ length: 20 }, (_, i) => `Q${i}`);

  it("정상 속도면 ok", () => {
    const r = assessQuality(items.map((c) => resp(c, 4, 5000)), pairs);
    expect(r.flag).toBe("ok");
    expect(r.fastCount).toBe(0);
  });

  it("전부 순식간에 답하면 poor", () => {
    const r = assessQuality(items.map((c) => resp(c, 4, 300)), pairs);
    expect(r.flag).toBe("poor");
    expect(r.fastRatio).toBe(1);
    expect(r.reasons[0]).toContain("1.5초");
  });

  it("5분 자리를 비워도 평균 때문에 걸리지는 않는다", () => {
    // 평균만 보면 왜곡되므로 판정은 빠른 문항 비율로 한다
    const rs = items.map((c, i) => resp(c, 4, i === 0 ? 300_000 : 5000));
    const r = assessQuality(rs, pairs);
    expect(r.flag).toBe("ok");
    expect(r.meanElapsedMs).toBeGreaterThan(10_000);
  });

  it("경계 — 20%면 review, 40%면 poor", () => {
    const mk = (fast: number) =>
      assessQuality(
        items.map((c, i) => resp(c, 4, i < fast ? 500 : 5000)),
        pairs,
      ).flag;
    expect(mk(3)).toBe("ok"); // 15%
    expect(mk(4)).toBe("review"); // 20%
    expect(mk(8)).toBe("poor"); // 40%
  });
});

describe("반대 문항", () => {
  const pairs: AntonymPair[] = [
    { a: "A1", b: "A2" },
    { a: "B1", b: "B2" },
    { a: "C1", b: "C2" },
  ];

  it("일관되게 답하면 ok", () => {
    const r = assessQuality(
      [resp("A1", 6), resp("A2", 2), resp("B1", 3), resp("B2", 5), resp("C1", 7), resp("C2", 1)],
      pairs,
    );
    expect(r.antonymAgreement).toBe(1);
    expect(r.contradictions).toBe(0);
    expect(r.flag).toBe("ok");
  });

  it("반대 문항에 똑같이 답하면 poor", () => {
    const r = assessQuality(
      [resp("A1", 7), resp("A2", 7), resp("B1", 7), resp("B2", 7), resp("C1", 7), resp("C2", 7)],
      pairs,
    );
    expect(r.antonymAgreement).toBe(0);
    expect(r.contradictions).toBe(3);
    expect(r.flag).toBe("poor");
  });

  it("사유에 몇 쌍이 어긋났는지 적는다", () => {
    const r = assessQuality(
      [resp("A1", 7), resp("A2", 7), resp("B1", 7), resp("B2", 7), resp("C1", 7), resp("C2", 7)],
      pairs,
    );
    expect(r.reasons.join()).toContain("3쌍");
  });

  it("짝 한쪽이 없으면 그 짝은 세지 않는다", () => {
    const r = assessQuality([resp("A1", 7), resp("A2", 1)], pairs);
    expect(r.pairCount).toBe(1);
    expect(r.antonymAgreement).toBe(1);
  });
});

describe("실제 문항 114개", () => {
  const file = loadItemFile("data/items/v1.yaml", { strictCount: true });
  const pairs: AntonymPair[] = file.items
    .filter((i) => i.antonymOf && !i.reverse)
    .map((i) => ({ a: i.code, b: i.antonymOf! }));
  const codes = file.items.map((i) => i.code);

  it("짝이 29쌍 잡힌다", () => {
    expect(pairs).toHaveLength(29);
  });

  it("성실하게 답한 사람은 ok", () => {
    // 짝마다 정확히 반대로, 나머지는 적당히
    const value = new Map<string, number>();
    for (const { a, b } of pairs) {
      value.set(a, 6);
      value.set(b, 2);
    }
    const rs = codes.map((c) => resp(c, value.get(c) ?? 4, 4500));
    const r = assessQuality(rs, pairs);
    expect(r.antonymAgreement).toBe(1);
    expect(r.flag).toBe("ok");
  });

  it("전부 4번만 찍은 사람은 짝으로는 안 걸린다 — 응답시간이 잡아야 한다", () => {
    // 중립으로 일관되게 답하면 짝 일치도는 완벽하다. 이게 이 지표의 한계다.
    const slow = assessQuality(codes.map((c) => resp(c, 4, 5000)), pairs);
    expect(slow.antonymAgreement).toBe(1);
    expect(slow.flag).toBe("ok");

    const fast = assessQuality(codes.map((c) => resp(c, 4, 400)), pairs);
    expect(fast.flag).toBe("poor");
  });

  it("무작위로 찍으면 일치도가 .6 근처로 나온다 — poor 기준선(.55)의 근거", () => {
    const rng = makeRng(42);
    const rs = codes.map((c) => resp(c, 1 + Math.floor(rng() * 7), 4000));
    const r = assessQuality(rs, pairs);
    expect(r.antonymAgreement).toBeGreaterThan(0.5);
    expect(r.antonymAgreement).toBeLessThan(0.72);
  });

  it("임계값은 전부 한곳에 모여 있다 — 실제 데이터 보고 조정할 자리", () => {
    expect(Object.keys(QUALITY).sort()).toEqual([
      "agreementPoor",
      "agreementReview",
      "contradictionGap",
      "fastItemMs",
      "fastRatioPoor",
      "fastRatioReview",
    ]);
  });
});
