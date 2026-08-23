/**
 * 상관 표의 칸 색 — docs/11-ui-guide.md §1.1
 *
 * 상관은 −1에서 +1이고 **0이 의미 있는 가운데**다. 단색 계열을 쓰면 강한 음의
 * 상관이 그냥 "낮은 값"으로 보인다. 그래서 양쪽으로 갈라지는 색을 쓴다.
 *
 *   −1 ────── 0 ────── +1
 *   빨강     회색      파랑
 *
 * 성향 프로필의 보라↔주황과 다른 색인 것은 **다른 것을 재기 때문**이다.
 * 저쪽은 한 축에서의 위치, 이쪽은 관계의 부호다. 같은 색을 쓰면 오히려 섞인다.
 */

const NEG = [0xd0, 0x3b, 0x3b]; // #d03b3b
const MID = [0xf0, 0xef, 0xec]; // #f0efec
const POS = [0x2a, 0x78, 0xd6]; // #2a78d6

/**
 * 실제 데이터에서 |r|이 1에 가는 일은 없다. 0.7을 최대로 잡아야 칸에 색이 보인다.
 * 이 값을 1로 두면 표 전체가 거의 흰색으로 나온다.
 */
const FULL = 0.7;

export function correlationFill(r: number): string {
  const t = Math.min(1, Math.abs(r) / FULL);
  const end = r < 0 ? NEG : POS;
  // 옅게 깐다. 칸 안의 글자가 읽혀야 하므로 진하게 가지 않는다
  const k = t * 0.75;
  const mix = MID.map((m, i) => Math.round(m + (end[i] - m) * k));
  return `rgb(${mix.join(" ")})`;
}

/** 소수 둘째 자리, 앞의 0 생략, 부호 항상 — `+.28` (11 §3.2) */
export function formatR(r: number): string {
  return (r < 0 ? "−" : "+") + Math.abs(r).toFixed(2).replace(/^0/, "");
}
