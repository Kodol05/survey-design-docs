/** 눈금 색과 표식 — 프로필 계열 화면이 공유한다 */

const STOPS: [number, string][] = [
  [0, "#44618d"],
  [20, "#7f95b3"],
  [38, "#c3cdda"],
  [50, "#e8e5dd"],
  [62, "#e3cfbe"],
  [80, "#cb9a7c"],
  [100, "#b3623f"],
];

/** 왼쪽으로 갈수록 청회색, 오른쪽으로 갈수록 테라코타. 가운데는 바탕에 가깝다.
 *  빨강↔초록을 쓰지 않는다 — 낮음이 틀린 것도 높음이 맞는 것도 아닌데
 *  빨강·초록은 오답·정답으로 읽힌다. */
export const GRADIENT = `linear-gradient(90deg, ${STOPS.map(([p, c]) => `${c} ${p}%`).join(", ")})`;

/** 라벨용 색은 바 색보다 진하다. 옅은 색을 작은 글자에 쓰면 대비가 모자란다. */
export const LOW_INK = "#3a5479";
export const HIGH_INK = "#8f4c2d";

export const TEMPERAMENT = ["자극추구", "위험회피", "사회적민감성", "인내력"];
export const CHARACTER = ["자율성", "연대감", "자기초월"];

/** 눈금 위 그 자리의 색 */
export function colorAt(pct: number): string {
  const x = Math.max(0, Math.min(100, pct));
  let i = 0;
  while (i < STOPS.length - 2 && x > STOPS[i + 1][0]) i++;
  const [p0, c0] = STOPS[i];
  const [p1, c1] = STOPS[i + 1];
  const t = p1 === p0 ? 0 : (x - p0) / (p1 - p0);
  const mix = (a: string, b: string, k: number) =>
    Math.round(parseInt(a, 16) + (parseInt(b, 16) - parseInt(a, 16)) * k)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(c0.slice(1, 3), c1.slice(1, 3), t)}${mix(c0.slice(3, 5), c1.slice(3, 5), t)}${mix(c0.slice(5, 7), c1.slice(5, 7), t)}`;
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
