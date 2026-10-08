/**
 * 검사 신뢰도(Cronbach's α)를 %로 적는다 (2026-10-07 사용자 결정).
 *
 * α는 「사람들 점수 차이 가운데 **실제 성향 차이에서 나온 몫**」을 어림한
 * 비율이다(고전 검사 이론의 신뢰도 = 참 점수 분산 / 관찰 점수 분산, α는 그
 * 하한). 그래서 관련도처럼 제곱할 필요 없이 그대로 백분율로 옮기면 된다 —
 * 0.93 → 93%, 나머지 7%가 측정 오차.
 *
 * 화면에는 `93%`만 적는다(사용자 결정). 「결과가 93% 맞는다」로 읽힐 수
 * 있어서 그 뜻풀이는 검사 신뢰도 탭의 접힌 설명에 둔다.
 *
 * α는 문항끼리 엇갈리면 음수도 나온다. 음수는 비율로 뜻이 없으니 「0% 미만」.
 */
export function reliabilityPct(alpha: number): number {
  return Math.round(Math.min(1, alpha) * 100);
}

export function formatReliability(alpha: number): string {
  return alpha < 0 ? "0% 미만" : `${reliabilityPct(alpha)}%`;
}
