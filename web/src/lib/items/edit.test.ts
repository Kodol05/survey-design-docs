import { describe, expect, it } from "vitest";
import { itemUpdateData, validateItemPatch, type ItemPatch } from "./edit";

/*
  문항 수정값 검사 (관리자 문항 수정).

  이 검사는 화면과 서버가 함께 쓰는 관문이라, 규칙이 조용히 무너지면 잘못된
  축·구간이 DB 에 들어가 채점이 어긋난다. 그래서 통과/거절 양쪽을 못 박는다.
*/

const trait: ItemPatch = {
  content: "나는 새로운 일에 쉽게 끌린다",
  section: 1,
  isReverse: false,
  status: "ACTIVE",
  scale: "자극추구",
  subscale: "탐색적 흥분",
};

const ability: ItemPatch = {
  content: "맡은 일을 끝까지 해낸다",
  section: 2,
  isReverse: false,
  status: "ACTIVE",
  abilityAxis: "COOPERATION",
  isDirect: true,
};

describe("문항 수정값 검사", () => {
  it("올바른 성향 문항은 통과한다", () => {
    expect(validateItemPatch("TRAIT", trait)).toBeNull();
  });

  it("올바른 직무능력 문항은 통과한다", () => {
    expect(validateItemPatch("ABILITY", ability)).toBeNull();
  });

  it("내용이 비면 걸린다", () => {
    expect(validateItemPatch("TRAIT", { ...trait, content: " " })).toBeTruthy();
  });

  it("묶음이 범위를 벗어나면 걸린다", () => {
    expect(validateItemPatch("TRAIT", { ...trait, section: 0 })).toBeTruthy();
    expect(validateItemPatch("TRAIT", { ...trait, section: 8 })).toBeTruthy();
    expect(validateItemPatch("TRAIT", { ...trait, section: 2.5 })).toBeTruthy();
  });

  it("없는 상태 값은 걸린다", () => {
    expect(validateItemPatch("TRAIT", { ...trait, status: "SOMETHING" })).toBeTruthy();
  });

  it("성향 축이 7축 밖이면 걸린다", () => {
    expect(validateItemPatch("TRAIT", { ...trait, scale: "친화력" })).toBeTruthy();
  });

  it("성향 문항인데 세부 항목이 비면 걸린다", () => {
    expect(validateItemPatch("TRAIT", { ...trait, subscale: "" })).toBeTruthy();
  });

  it("직무능력 축이 셋 밖이면 걸린다", () => {
    expect(
      validateItemPatch("ABILITY", { ...ability, abilityAxis: "LEADERSHIP" }),
    ).toBeTruthy();
  });

  it("직무능력인데 직접/간접이 없으면 걸린다", () => {
    expect(
      validateItemPatch("ABILITY", {
        ...ability,
        isDirect: undefined as unknown as boolean,
      }),
    ).toBeTruthy();
  });
});

describe("쓰기 데이터는 종류에 맞는 필드만 담는다", () => {
  it("성향은 축·세부를 담고 직무능력 필드를 넣지 않는다", () => {
    const d = itemUpdateData("TRAIT", trait) as Record<string, unknown>;
    expect(d.scale).toBe("자극추구");
    expect(d.subscale).toBe("탐색적 흥분");
    expect(d).not.toHaveProperty("abilityAxis");
    expect(d).not.toHaveProperty("isDirect");
  });

  it("직무능력은 축·직접여부를 담고 성향 필드를 넣지 않는다", () => {
    const d = itemUpdateData("ABILITY", ability) as Record<string, unknown>;
    expect(d.abilityAxis).toBe("COOPERATION");
    expect(d.isDirect).toBe(true);
    expect(d).not.toHaveProperty("scale");
    expect(d).not.toHaveProperty("subscale");
  });

  it("내용의 앞뒤 공백은 다듬는다", () => {
    const d = itemUpdateData("TRAIT", {
      ...trait,
      content: "  다듬기 전  ",
    }) as Record<string, unknown>;
    expect(d.content).toBe("다듬기 전");
  });
});
