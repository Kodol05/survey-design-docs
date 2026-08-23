/**
 * 큐브 해석 — docs/00-design-notes.md §2.2
 *
 * 이수진·Cloninger·채한(2014)의 모델. 기질 3축과 성격 3축을 각각 고/저로
 * 나눠 2³ = 8유형씩, **합 16개**다.
 *
 *   기질 큐브 : 자극추구 × 위험회피 × 사회적민감성   (인내력은 큐브에 안 들어감)
 *   성격 큐브 : 자율성 × 연대감 × 자기초월
 *
 * ⚠️ **두 큐브를 곱하지 않는다.** 8×8=64는 원 논문에 없는 확장이었다.
 *    기질에서 하나, 성격에서 하나를 뽑아 나란히 보여준다.
 *
 * ⚠️ **유형 이름을 붙이지 않는다.** 논문에는 "폭발적", "무관심" 같은 라벨이
 *    있지만 그런 말이 사내에 한번 돌면 되돌릴 수 없다 (00 §5 라벨링 금지).
 *    코드에 유형명 필드 자체를 두지 않는다 — 서술문만 있다.
 *
 * ⚠️ 성격 축의 낮은 쪽(자율성·연대감)은 임상 문헌에서 부정적 함의로 쓰이지만,
 *    사내 검사에서는 그 함의를 옮기지 않는다. 어느 쪽도 흠으로 읽히지 않게 썼다.
 */

/** 대문자 = 높음, 소문자 = 낮음 */
export type CubeKey = string;

export const TEMPERAMENT_AXES = ["자극추구", "위험회피", "사회적민감성"] as const;
export const CHARACTER_AXES = ["자율성", "연대감", "자기초월"] as const;

export const TEMPERAMENT_CUBE: Record<CubeKey, string> = {
  NHR: "새로운 것에 끌리면서도 앞일을 미리 걱정하고, 사람들 반응을 민감하게 살핍니다. 해보고 싶은 마음과 조심스러운 마음이 같이 커서 시작하기 전에 주변 의견을 많이 구하는 편입니다.",
  NHr: "새로운 것에 끌리지만 위험도 같이 봅니다. 다만 남의 반응에는 덜 좌우돼서, 판단이 서면 주위를 크게 의식하지 않고 밀고 나갑니다.",
  NhR: "새로운 일에 부담이 적고 사람들과 어울리는 것을 좋아합니다. 먼저 움직이면서 주변을 끌어들이는 자리에서 편하게 일합니다.",
  Nhr: "새로운 것에 거리낌이 없고 남의 시선도 크게 의식하지 않습니다. 혼자 판단해서 빠르게 움직이는 쪽입니다.",
  nHR: "익숙한 방식을 지키고 앞일을 미리 살피며, 사람들 기분에 민감합니다. 아는 사람들과 안정된 관계 안에서 꾸준히 일하는 쪽입니다.",
  nHr: "변화를 서두르지 않고 하나씩 확인하며, 남의 반응에는 덜 흔들립니다. 혼자 차분히 정확도를 챙기는 일에 잘 맞습니다.",
  nhR: "서두르지도 불안해하지도 않으면서 사람들과의 관계를 중요하게 봅니다. 주변 분위기를 고르게 유지하는 쪽입니다.",
  nhr: "새로운 자극에 크게 끌리지도, 앞일을 크게 걱정하지도 않고, 남의 반응에도 덜 좌우됩니다. 자기 속도로 일하는 쪽입니다.",
};

export const CHARACTER_CUBE: Record<CubeKey, string> = {
  SCT: "스스로 정하고 그 결과를 감당하면서 남도 잘 받아들이고, 설명되지 않는 것에도 열려 있습니다. 방향은 스스로 잡되 사람과 넓은 시야를 같이 챙기는 쪽입니다.",
  SCt: "스스로 정하고 남과도 잘 어울리며, 판단은 눈에 보이고 확인되는 것을 기준으로 합니다. 현실적으로 일을 굴려 가는 쪽입니다.",
  ScT: "자기 기준이 뚜렷하고 선을 분명히 두면서, 설명되지 않는 것에는 열려 있습니다. 남에게 기대지 않고 자기 방식으로 넓게 보는 쪽입니다.",
  Sct: "스스로 정하고 감당하며, 사람 사이의 선이 분명하고 확인되는 것을 기준으로 봅니다. 맡기면 알아서 하되 거리는 두는 쪽입니다.",
  sCT: "정할 때 주변을 많이 고려하고 남을 잘 받아들이며, 큰 흐름을 느끼는 편입니다. 여럿이 함께 정하는 자리에서 편하게 일합니다.",
  sCt: "주변의 뜻을 많이 고려하고 사람들과 잘 어울리며, 확인되는 것을 기준으로 봅니다. 정해진 틀 안에서 사람들과 맞춰 가는 쪽입니다.",
  scT: "정할 때 주변을 고려하면서도 사람 사이의 선은 분명하고, 설명되지 않는 것에는 열려 있습니다. 겉으로 드러내지 않고 자기 생각을 갖는 쪽입니다.",
  sct: "주변 상황을 많이 고려하고 선이 분명하며, 확인되는 것을 기준으로 봅니다. 나서지 않고 자기 몫을 조용히 하는 쪽입니다.",
};

/**
 * 고/저를 가르는 기준은 **50**이다. 눈금의 한가운데이자 전 문항 중립 응답값이다.
 *
 * 다만 50 근처는 어느 쪽이라고 하기 어렵다. 그래서 구간이 `middle`인 축은
 * **뚜렷하지 않다고 같이 표시한다.** 51점을 "높음"이라고만 말하면 없는 특징을
 * 있다고 말하는 셈이 된다.
 */
export const CUBE_SPLIT = 50;

export type AxisInput = { percent: number; band: "lower" | "middle" | "upper" };

export type CubeResult = {
  key: CubeKey;
  text: string;
  /** 어느 쪽이라고 하기 어려운 축. 비어 있으면 셋 다 뚜렷하다 */
  unclear: string[];
};

function buildKey(axes: readonly string[], scores: Record<string, AxisInput>) {
  const letters = ["N", "H", "R"];
  const charLetters = ["S", "C", "T"];
  const set = axes[0] === "자극추구" ? letters : charLetters;
  let key = "";
  const unclear: string[] = [];
  for (const [i, axis] of axes.entries()) {
    const s = scores[axis];
    if (!s) return null;
    key += s.percent >= CUBE_SPLIT ? set[i] : set[i].toLowerCase();
    if (s.band === "middle") unclear.push(axis);
  }
  return { key, unclear };
}

export function temperamentCube(
  scores: Record<string, AxisInput>,
): CubeResult | null {
  const b = buildKey(TEMPERAMENT_AXES, scores);
  if (!b || !TEMPERAMENT_CUBE[b.key]) return null;
  return { key: b.key, text: TEMPERAMENT_CUBE[b.key], unclear: b.unclear };
}

export function characterCube(scores: Record<string, AxisInput>): CubeResult | null {
  const b = buildKey(CHARACTER_AXES, scores);
  if (!b || !CHARACTER_CUBE[b.key]) return null;
  return { key: b.key, text: CHARACTER_CUBE[b.key], unclear: b.unclear };
}
