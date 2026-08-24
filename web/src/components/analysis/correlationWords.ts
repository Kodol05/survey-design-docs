/**
 * 상관을 말로 옮긴다.
 *
 * `+.62 n=37 · +.37~+.78` 은 통계를 아는 사람에게만 읽힌다. 이 시스템에서
 * 이 화면을 보는 사람은 대표님이고(00 D-15), 숫자 읽는 훈련을 전제할 수 없다.
 *
 * 그래서 **문장을 먼저 두고 숫자는 뒤에 작게** 둔다.
 * 숫자를 지우지는 않는다 — 지우면 근거를 확인할 방법이 사라지고,
 * n·신뢰구간 배지는 11 §2.2에서 필수로 못 박혀 있다.
 */

/** 받침이 있으면 `이`, 없으면 `가` */
function subjectParticle(word: string): string {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return "가";
  return (c - 0xac00) % 28 === 0 ? "가" : "이";
}

export type Strength = "뚜렷함" | "어느 정도" | "약함";

/**
 * 세기 구분 — **편의값이다.** D-26·D-24와 같은 성격으로 통계적 근거가 아니라
 * "이 정도면 뚜렷하다"는 상식선이다. 사회과학 관행(.1/.3/.5)을 따랐다.
 */
export function strengthOf(r: number): Strength {
  const a = Math.abs(r);
  if (a >= 0.5) return "뚜렷함";
  if (a >= 0.3) return "어느 정도";
  return "약함";
}

/**
 * "연대감이 높은 사람일수록 조직생활 점수도 높습니다"
 *
 * **"~일수록"으로 쓰고 "~때문에"로 쓰지 않는다.** 같이 움직인다는 것이지
 * 한쪽이 다른 쪽을 만든다는 뜻이 아니다. 화면 아래 주석에도 한 번 더 적는다.
 */
export function describeCorrelation(scale: string, axis: string, r: number): string {
  const p = subjectParticle(scale);
  return r >= 0
    ? `${scale}${p} 높은 사람일수록 ${axis} 점수도 높습니다`
    : `${scale}${p} 높은 사람일수록 ${axis} 점수는 낮습니다`;
}
