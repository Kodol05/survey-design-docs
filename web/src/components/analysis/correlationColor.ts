/**
 * 상관 표의 칸 색 — docs/11-ui-guide.md §1.1
 *
 * 상관은 −1에서 +1이고 **0이 의미 있는 가운데**다. 단색 계열을 쓰면 강한 음의
 * 상관이 그냥 "낮은 값"으로 보인다. 그래서 양쪽으로 갈라지는 색을 쓴다.
 *
 *   −1 ─────── 0 ─────── +1
 *   테라코타   모래      청회색
 *
 * 성향 눈금과 같은 두 색을 쓰되 **방향이 반대**다. 저쪽은 낮음이 청회색,
 * 여기는 음의 관계가 테라코타다. 음의 관계를 따뜻한 색으로 두는 것이
 * 통계 도구의 관행이라 그쪽을 따랐고, 표 아래 범례에 방향을 적어 둔다.
 */

const NEG = [0xb3, 0x62, 0x3f]; // #b3623f 테라코타
const MID = [0xe8, 0xe5, 0xdd]; // #e8e5dd 모래 중립
const POS = [0x44, 0x61, 0x8d]; // #44618d 청회색

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
