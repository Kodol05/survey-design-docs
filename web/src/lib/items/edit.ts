import { ABILITY_AXIS_DB, TRAIT_SCALES } from "./types";

/**
 * 문항 편집값 검사 (Task — 관리자 문항 수정).
 *
 * 이 파일은 **DB도 서버도 모른다.** 순수 검사라 화면(즉시 피드백)과 서버
 * 액션(마지막 방어)이 같은 규칙을 나눠 쓴다. 화면에서만 막으면 우회할 수
 * 있으므로 저장 직전 서버에서 한 번 더 이 함수를 통과시킨다.
 *
 * ⚠️ 무엇을 안 바꾸나 — `code`·`orderNo`·`antonymPairId`·`kind` 는 여기서
 * 손대지 않는다. 코드와 순서는 문항의 신원이자 유일 제약이 걸린 값이고,
 * 반대짝과 종류를 바꾸면 채점 구조가 통째로 흔들린다. 문구와 채점에 쓰는
 * 값(축·세부·역채점·묶음·상태)만 고친다.
 */

export type ItemKind = "TRAIT" | "ABILITY";

/** 스키마 enum 이름 (한글이 아니라 DB 값) */
export const ABILITY_AXIS_NAMES = Object.values(ABILITY_AXIS_DB);

/** 문항 상태 — prisma enum ItemStatus 와 같은 값이어야 한다 */
export const ITEM_STATUSES = ["DRAFT", "REVIEW", "ACTIVE", "RETIRED"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const SECTION_MIN = 1;
export const SECTION_MAX = 7;

export type ItemPatch = {
  content: string;
  section: number;
  isReverse: boolean;
  status: string;
  /** TRAIT 일 때 */
  scale?: string | null;
  subscale?: string | null;
  /** ABILITY 일 때 (abilityAxis 는 DB enum 이름) */
  abilityAxis?: string | null;
  isDirect?: boolean | null;
};

/**
 * 검사에 걸리면 사람에게 보일 문장을, 통과하면 null 을 준다.
 * 첫 번째로 걸리는 것 하나만 돌려준다 — 한 번에 하나씩 고치는 편이 낫다.
 */
export function validateItemPatch(
  kind: ItemKind,
  patch: ItemPatch,
): string | null {
  if (!patch.content || patch.content.trim().length < 2)
    return "문항 내용을 입력해 주세요.";

  if (
    !Number.isInteger(patch.section) ||
    patch.section < SECTION_MIN ||
    patch.section > SECTION_MAX
  )
    return `묶음은 ${SECTION_MIN}~${SECTION_MAX} 사이여야 합니다.`;

  if (!ITEM_STATUSES.includes(patch.status as ItemStatus))
    return "상태 값이 올바르지 않습니다.";

  if (typeof patch.isReverse !== "boolean")
    return "역채점 값이 올바르지 않습니다.";

  if (kind === "TRAIT") {
    if (!patch.scale || !TRAIT_SCALES.includes(patch.scale as never))
      return "성향 축을 골라 주세요.";
    if (!patch.subscale || patch.subscale.trim().length < 1)
      return "세부 항목을 입력해 주세요.";
  } else {
    if (!patch.abilityAxis || !ABILITY_AXIS_NAMES.includes(patch.abilityAxis))
      return "직무능력 축을 골라 주세요.";
    if (typeof patch.isDirect !== "boolean")
      return "직접/간접을 골라 주세요.";
  }

  return null;
}

/**
 * 검사를 통과한 값을 prisma 가 쓰기 좋은 모양으로 추린다.
 * **종류에 맞는 필드만** 담는다 — TRAIT 에 abilityAxis 를 함께 보내지 않는다.
 */
export function itemUpdateData(kind: ItemKind, patch: ItemPatch) {
  const base = {
    content: patch.content.trim(),
    section: patch.section,
    isReverse: patch.isReverse,
    status: patch.status,
  };
  if (kind === "TRAIT")
    return {
      ...base,
      scale: patch.scale!,
      subscale: patch.subscale!.trim(),
    };
  return {
    ...base,
    abilityAxis: patch.abilityAxis!,
    isDirect: patch.isDirect!,
  };
}
