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

/**
 * 기대 문항 수 — 00 D-07.
 *
 * 직무능력을 축당 셋에서 **다섯으로 늘렸다** (2026-08-25). 이 축들은
 * 형성적 지표라 **구성 요소를 빠짐없이 담는 것**이 중요한데, 셋으로는
 * 조율·약속·회복 같은 조각이 빠져 있었다 (`data/items/v1.yaml` 참고).
 */
/**
 * 세 능력을 묶은 값의 이름.
 *
 * **실제 축이 아니라 우리가 만든 값**이라 `ABILITY_AXES`에 넣지 않는다.
 * 대신 이름은 한 곳에서 정한다 — 전에는 네 군데에서 두 가지로 불렀다
 * (구성원 목록·예측은 「세 능력 평균」, 분포는 「세 능력 묶음」).
 * 같은 것이 화면마다 다른 이름으로 나오면 다른 값인 줄 안다.
 *
 * ⚠️ 이 상수가 **여기** 있는 이유 — 화면(클라이언트) 쪽에서도 쓴다.
 * 연구표를 읽는 모듈에 두었더니 그 모듈이 `node:fs`를 쓰는 바람에
 * **브라우저 번들로 끌려가 빌드가 깨졌다** (2026-08-26). 파일을 읽지 않는
 * 이 파일이 이런 이름들의 자리다.
 */
export const COMPOSITE_AXIS = "세 능력 평균";

export const EXPECTED = {
  trait: 105,
  ability: 15,
  total: 120,
  /** 능력 하나당 문항 수 */
  perAbility: 5,
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
