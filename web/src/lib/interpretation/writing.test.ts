import { describe, expect, it } from "vitest";
import { APPLY } from "./apply";
import { BAND_TEXT } from "./bands";
import { PAIRS } from "./pairs";
import { POLES } from "./poles";
import { TRAIT_SCALES } from "@/lib/items/types";

/**
 * 사람에게 보이는 서술문의 **말투 규칙**을 기계가 지킨다 (Task 26).
 *
 * 문장 하나하나가 좋은지는 사람이 읽어야 안다. 그런데 **하지 말자고 정한
 * 말투**는 기계가 볼 수 있다. 문장을 고치거나 더할 때 규칙이 조용히
 * 무너지는 것을 막는 것이 목적이다.
 *
 * 근거 — `00` §5(라벨링 금지) · `07`(단일 상황 예측은 .18~.37에 그친다) ·
 * `08` 기타(잘한다/못한다로 쓰지 않는다).
 */

/** 화면에 나가는 모든 문장을 한 자리에 모은다 */
function allSentences(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const [scale, p] of Object.entries(POLES)) {
    out.push({ where: `poles ${scale} low`, text: p.low });
    out.push({ where: `poles ${scale} high`, text: p.high });
  }
  for (const [scale, b] of Object.entries(BAND_TEXT))
    for (const [band, text] of Object.entries(b))
      out.push({ where: `bands ${scale} ${band}`, text });
  for (const pair of PAIRS) {
    out.push({ where: `pairs ${pair.title} why`, text: pair.why });
    for (const [k, text] of Object.entries(pair.text))
      out.push({ where: `pairs ${pair.title} ${k}`, text });
  }
  for (const [scale, b] of Object.entries(APPLY))
    for (const [band, a] of Object.entries(b))
      for (const [field, text] of Object.entries(a))
        out.push({ where: `apply ${scale} ${band} ${field}`, text });
  return out;
}

const BANNED: [string, RegExp][] = [
  // 잘한다/못한다 — 능력 판정
  ["능력 판정", /특히 강|잘합니다|뛰어나|유능|탁월|못합니다|부족합니다|우수/],
  // "이런 일에서 잘 맞는다" — 단일 상황 예측 (07: .18~.37에 그친다)
  ["상황 예측", /[일자리]에서 (특히 )?(잘 맞|힘을 냅|강)/],
  // 남이 어떻게 볼지를 단정
  ["남의 평가 단정", /신뢰하는 편|믿음을 얻|인정받/],
  // 처방 — 이렇게 하라
  ["처방", /있으면 잘 맞|편이 도움이 됩니다|주면 오해가/],
  // 유형 이름 (00 §5)
  ["유형 라벨", /유형입니다|형입니다|타입/],
];

describe("서술문 말투", () => {
  it.each(BANNED)("%s 표현을 쓰지 않는다", (_label, pattern) => {
    const bad = allSentences().filter((s) => pattern.test(s.text));
    expect(bad.map((b) => `${b.where}: ${b.text.slice(0, 40)}`)).toEqual([]);
  });

  it("모든 문장이 '~합니다/입니다' 또는 '~편'으로 끝난다", () => {
    // 반말이나 명령형이 섞이면 화면에서 튄다
    const bad = allSentences().filter(
      (s) => !/(다\.|다|편|것)$/.test(s.text.trim()),
    );
    expect(bad.map((b) => b.where)).toEqual([]);
  });
});

describe("빠짐없이 있는가", () => {
  it("일곱 축 모두 양극 서술이 있다", () => {
    for (const s of TRAIT_SCALES) {
      expect(POLES[s]?.low, s).toBeTruthy();
      expect(POLES[s]?.high, s).toBeTruthy();
    }
  });

  it("일곱 축 모두 세 구간 서술이 있다", () => {
    for (const s of TRAIT_SCALES)
      for (const b of ["lower", "middle", "upper"] as const)
        expect(BAND_TEXT[s]?.[b], `${s} ${b}`).toBeTruthy();
  });

  it("짝은 네 칸이 다 차 있다", () => {
    for (const p of PAIRS)
      for (const k of ["HH", "HL", "LH", "LL"] as const)
        expect(p.text[k], `${p.title} ${k}`).toBeTruthy();
  });

  it("일곱 축 모두 세 구간의 힘·살필·결이 다 차 있다", () => {
    for (const s of TRAIT_SCALES)
      for (const b of ["lower", "middle", "upper"] as const) {
        expect(APPLY[s]?.[b]?.lift, `${s} ${b} lift`).toBeTruthy();
        expect(APPLY[s]?.[b]?.watch, `${s} ${b} watch`).toBeTruthy();
        expect(APPLY[s]?.[b]?.work, `${s} ${b} work`).toBeTruthy();
      }
  });

  it("짝에 쓰인 축 이름이 실제 축이다", () => {
    for (const p of PAIRS) {
      expect(TRAIT_SCALES).toContain(p.a);
      expect(TRAIT_SCALES).toContain(p.b);
    }
  });
});

describe("가운데 구간", () => {
  it("축 이름을 넣어 말한다", () => {
    /*
      가운데(40~60)는 「이런 사람이다」가 아니라 「이 축으로는 설명하기
      어렵다」는 뜻이다. 어느 축 이야기인지가 문장 안에 있어야 한다.
    */
    for (const s of TRAIT_SCALES) expect(BAND_TEXT[s].middle, s).toContain(s);
  });

  it("일곱 개가 같은 말로 시작하지 않는다", () => {
    /*
      한때 전부 「이 축은 두드러지지 않습니다」로 열었다. 여러 축이 가운데인
      사람은 같은 문장을 예닐곱 번 연달아 읽게 된다 — **기계가 찍어낸 것처럼
      보이는 순간 나머지 문장까지 안 믿게 된다.**

      축 이름 뒤 첫 대여섯 글자가 서로 겹치는지 본다. 이름은 당연히 다르므로
      이름을 뺀 나머지로 비교한다.
    */
    const openings = TRAIT_SCALES.map((s) =>
      BAND_TEXT[s].middle.replace(s, "").trim().slice(0, 8),
    );
    expect(new Set(openings).size).toBe(TRAIT_SCALES.length);
  });

  it("양끝보다 짧다", () => {
    for (const s of TRAIT_SCALES) {
      const m = BAND_TEXT[s].middle.length;
      expect(m, s).toBeLessThan(BAND_TEXT[s].lower.length);
      expect(m, s).toBeLessThan(BAND_TEXT[s].upper.length);
    }
  });
});

describe("양쪽 균형", () => {
  it("낮은 쪽과 높은 쪽 분량이 크게 벌어지지 않는다", () => {
    /*
      한쪽만 길면 그쪽이 '진짜' 설명처럼 읽힌다. 어느 쪽도 좋고 나쁜 것이
      아니라는 원칙(00 §5)은 분량에서도 지켜져야 한다.
    */
    for (const s of TRAIT_SCALES) {
      const lo = BAND_TEXT[s].lower.length;
      const hi = BAND_TEXT[s].upper.length;
      expect(Math.abs(lo - hi) / Math.max(lo, hi), s).toBeLessThan(0.35);
    }
  });
});
