import {
  ABILITY_AXES,
  EXPECTED,
  TRAIT_SCALES,
  type AbilityItem,
  type Item,
  type ItemFile,
  type TraitItem,
} from "./types";

/**
 * 문항 파일 형식 검사 — seed 전에 반드시 통과해야 한다 (00 §2.4).
 *
 * 여기서 걸러내는 것들은 전부 "나중에 조용히 틀린 결과를 내는" 종류다.
 * 근거 출처가 비면 저작권 대응이 말로만 끝나고, 역방향 짝이 어긋나면
 * 응답 품질 지표 두 축 중 하나가 통째로 죽는다.
 */

export type Problem = { code: string; message: string };

const isTrait = (i: Item): i is TraitItem => i.kind === "trait";
const isAbility = (i: Item): i is AbilityItem => i.kind === "ability";

export function validateItemFile(
  file: ItemFile,
  opts: { strictCount?: boolean } = {},
): Problem[] {
  const problems: Problem[] = [];
  const add = (code: string, message: string) =>
    problems.push({ code, message });

  const items = file.items ?? [];

  // --- 코드 중복 ---
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.code)) add(it.code, "문항 코드가 중복됩니다");
    seen.add(it.code);
  }

  // --- 공통 필드 ---
  for (const it of items) {
    if (!it.content?.trim()) add(it.code, "문항 내용이 비어 있습니다");
    if (!it.sourceRef?.trim())
      add(it.code, "근거 출처(sourceRef)가 비어 있습니다");
  }

  // --- 성향 문항 ---
  for (const it of items.filter(isTrait)) {
    if (!TRAIT_SCALES.includes(it.scale))
      add(it.code, `알 수 없는 성향 축입니다: ${it.scale}`);
    if (!it.subscale?.trim()) add(it.code, "하위척도가 비어 있습니다");
  }

  // --- 직무능력 문항 ---
  const abilities = items.filter(isAbility);
  for (const it of abilities) {
    if (!ABILITY_AXES.includes(it.axis))
      add(it.code, `알 수 없는 직무능력 축입니다: ${it.axis}`);
    if (typeof it.direct !== "boolean")
      add(it.code, "direct(직접형 여부)가 없습니다");
  }

  for (const axis of ABILITY_AXES) {
    const inAxis = abilities.filter((a) => a.axis === axis);
    if (opts.strictCount && inAxis.length !== EXPECTED.perAbility)
      add(axis, `${axis} 문항이 ${inAxis.length}개입니다. ${EXPECTED.perAbility}개여야 합니다`);
    if (inAxis.length > 0) {
      const directs = inAxis.filter((a) => a.direct).length;
      // 직접형만 두면 거의 다 높게 답한다. 간접형이 반드시 섞여야 한다 (07)
      if (directs !== 1)
        add(axis, `${axis}의 직접형 문항이 ${directs}개입니다. 정확히 1개여야 합니다`);
    }
  }

  // --- 역방향 짝 ---
  const byCode = new Map(items.map((i) => [i.code, i]));
  for (const it of items) {
    if (!it.antonymOf) continue;
    const pair = byCode.get(it.antonymOf);
    if (!pair) {
      add(it.code, `짝 문항 ${it.antonymOf}이(가) 없습니다`);
      continue;
    }
    if (pair.antonymOf !== it.code)
      add(it.code, `짝 문항 ${it.antonymOf}이(가) 이 문항을 가리키지 않습니다`);
    if (Boolean(it.reverse) === Boolean(pair.reverse))
      add(it.code, `${it.antonymOf}과(와) 역방향 여부가 같습니다. 서로 반대여야 합니다`);
  }

  // --- 개수와 비율 ---
  if (opts.strictCount) {
    const traits = items.filter(isTrait).length;
    if (traits !== EXPECTED.trait)
      add("FILE", `성향 문항이 ${traits}개입니다. ${EXPECTED.trait}개여야 합니다`);
    if (abilities.length !== EXPECTED.ability)
      add("FILE", `직무능력 문항이 ${abilities.length}개입니다. ${EXPECTED.ability}개여야 합니다`);
    if (items.length !== EXPECTED.total)
      add("FILE", `전체 문항이 ${items.length}개입니다. ${EXPECTED.total}개여야 합니다`);

    const reverse = items.filter((i) => i.reverse).length;
    const ratio = items.length ? reverse / items.length : 0;
    const [lo, hi] = EXPECTED.reverseRatio;
    if (ratio < lo || ratio > hi)
      add(
        "FILE",
        `역방향 비율이 ${(ratio * 100).toFixed(0)}%입니다. ${lo * 100}~${hi * 100}% 범위여야 합니다`,
      );
  }

  return problems;
}
