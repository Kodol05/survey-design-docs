/**
 * 문항 파일 포맷 — docs/00-design-notes.md §2.4, docs/07-job-ability.md
 *
 * 문항을 코드가 아니라 YAML 파일에 두는 이유:
 *  - 고칠 때 프로그램을 안 건드려도 된다
 *  - 무엇을 언제 왜 바꿨는지가 파일 이력으로 남는다
 *  - 근거 출처를 문항 옆에 같이 적을 수 있다 (저작권 대응, 00 §5)
 */

/** 성향 7축 (00 §2.9.3 — 한국판 TCI-RS 공식 명칭) */
export const TRAIT_SCALES = [
  "자극추구",
  "위험회피",
  "사회적민감성",
  "인내력",
  "자율성",
  "연대감",
  "자기초월",
] as const;
export type TraitScale = (typeof TRAIT_SCALES)[number];

/** 직무능력 3축 (00 D-31) */
export const ABILITY_AXES = ["협력", "조직생활", "자율적실행"] as const;
export type AbilityAxisName = (typeof ABILITY_AXES)[number];

/** 스키마의 enum 이름과 한글 이름의 대응 */
export const ABILITY_AXIS_DB: Record<AbilityAxisName, string> = {
  협력: "COOPERATION",
  조직생활: "ORG_LIFE",
  자율적실행: "AUTONOMY",
};

export type TraitItem = {
  kind: "trait";
  code: string;
  scale: TraitScale;
  subscale: string;
  content: string;
  reverse?: boolean;
  /** 근거 출처. 비어 있으면 검사에서 걸린다 */
  sourceRef: string;
  /** 반대 방향 문항의 code. 서로를 가리켜야 한다 */
  antonymOf?: string;
};

export type AbilityItem = {
  kind: "ability";
  code: string;
  axis: AbilityAxisName;
  /** 직접형이면 true. 능력당 직접형 1 + 간접형 2 (07) */
  direct: boolean;
  content: string;
  reverse?: boolean;
  sourceRef: string;
  antonymOf?: string;
};

export type Item = TraitItem | AbilityItem;

export type ItemFile = {
  version: number;
  title: string;
  items: Item[];
};

/** 기대 문항 수 — 00 D-07 */
export const EXPECTED = {
  trait: 105,
  ability: 9,
  total: 114,
  /** 능력 하나당 문항 수 */
  perAbility: 3,
  /** 역방향 비율 상·하한. 성격검사의 표준 관행 30~40% (00 §2.3) */
  reverseRatio: [0.25, 0.45] as [number, number],
} as const;

/** DB enum → 한글 축 이름. 채점 결과는 항상 한글 이름으로 저장한다 —
 *  화면과 통계가 전부 ABILITY_AXES 를 기준으로 돌기 때문이다. */
export const ABILITY_AXIS_FROM_DB: Record<string, AbilityAxisName> = {
  COOPERATION: "협력",
  ORG_LIFE: "조직생활",
  AUTONOMY: "자율적실행",
};
