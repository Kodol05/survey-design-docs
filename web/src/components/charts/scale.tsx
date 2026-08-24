/** 눈금 색과 표식 — 프로필 계열 화면이 공유한다 */

/*
  눈금 색을 **CSS 토큰에서 읽어 섞는다** (2026-08-24).

  전에는 hex를 상수로 두고 자바스크립트에서 보간했다. 그러면 다크 모드에서
  같이 못 바뀐다 — 어두운 바탕에 밝은 곳 색을 그대로 깔게 된다.
  `color-mix`는 브라우저가 그릴 때 계산하므로 `--scale-*` 토큰만 테마마다
  갈아 끼우면 알아서 따라온다.
*/
const STOPS = [0, 20, 38, 50, 62, 80, 100];

/** 왼쪽으로 갈수록 청회색, 오른쪽으로 갈수록 테라코타. 가운데는 바탕보다 한 단 어둡다.
 *  빨강↔초록을 쓰지 않는다 — 낮음이 틀린 것도 높음이 맞는 것도 아닌데
 *  빨강·초록은 오답·정답으로 읽힌다. */
export const GRADIENT = `linear-gradient(90deg, ${STOPS.map(
  (p) => `var(--scale-${p}) ${p}%`,
).join(", ")})`;

/** 라벨용 색은 바 색보다 진하다. 옅은 색을 작은 글자에 쓰면 대비가 모자란다. */
export const LOW_INK = "var(--scale-ink-low)";
export const HIGH_INK = "var(--scale-ink-high)";

export const TEMPERAMENT = ["자극추구", "위험회피", "사회적민감성", "인내력"];
export const CHARACTER = ["자율성", "연대감", "자기초월"];

/** 눈금 위 그 자리의 색 */
export function colorAt(pct: number): string {
  const x = Math.max(0, Math.min(100, pct));
  let i = 0;
  while (i < STOPS.length - 2 && x > STOPS[i + 1]) i++;
  const p0 = STOPS[i];
  const p1 = STOPS[i + 1];
  const t = p1 === p0 ? 0 : (x - p0) / (p1 - p0);
  return `color-mix(in oklab, var(--scale-${p1}) ${(t * 100).toFixed(1)}%, var(--scale-${p0}))`;
}

/** 바깥 검정 링 + 안쪽은 그 자리의 색. 색을 못 봐도 링 위치로 읽힌다. */
export function Marker({ percent, size = 24 }: { percent: number; size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full ring-4"
      style={{
        width: size,
        height: size,
        background: "var(--ink)",
        ["--tw-ring-color" as string]: "var(--page)",
      }}
    >
      <span
        className="block rounded-full"
        style={{ width: size * 0.5, height: size * 0.5, background: colorAt(percent) }}
      />
    </span>
  );
}

/*
  직무능력 색 — **성향과 다른 언어를 쓴다.**

  성향은 낮음도 높음도 틀린 게 아니라 양쪽으로 갈라지는 색을 쓴다. 직무능력은
  높을수록 좋은 값이라 갈라지면 안 된다 — 낮음이 곱게 보인다.

  그래서 **한 가지 색의 진하기**로만 말한다. 길이만으로도 값은 읽히지만,
  좁은 칸에서 62와 71을 길이로만 가르기는 어렵다. 진하기를 같이 얹으면
  훑을 때 눈에 먼저 들어온다.

  옅은 쪽을 배경보다 확실히 아래로 둔다 — 그러지 않으면 낮은 값이 빈 칸처럼
  보인다. 상관 표에서 겪은 것과 같은 문제다.
*/
const ABILITY_STOPS = [0, 35, 65, 100];

export function abilityColorAt(pct: number): string {
  const v = Math.max(0, Math.min(100, pct));
  for (let i = 1; i < ABILITY_STOPS.length; i++) {
    const p1 = ABILITY_STOPS[i - 1];
    const p2 = ABILITY_STOPS[i];
    if (v > p2) continue;
    const t = p2 === p1 ? 0 : (v - p1) / (p2 - p1);
    return `color-mix(in oklab, var(--ability-${p2}) ${(t * 100).toFixed(1)}%, var(--ability-${p1}))`;
  }
  return "var(--ability-100)";
}

/** 범례용 띠 */
export const ABILITY_GRADIENT = `linear-gradient(90deg, ${ABILITY_STOPS.map(
  (p) => `var(--ability-${p}) ${p}%`,
).join(", ")})`;
