import { formatR } from "./correlationColor";

/**
 * 관련도를 **「차이의 몇 %」로** 옮긴다 (2026-10-07 사용자 결정).
 *
 * `+0.39`만 놓으면 대표님은 그게 큰지 작은지 모른다. r²(결정계수)를 %로
 * 적으면 「협력 점수가 사람마다 다른 정도 가운데 15%가 인내력과 같이
 * 움직인다」로 읽힌다 — 무엇의 몇 분의 몇인지가 말로 선다.
 *
 * 부호는 r의 것을 그대로 단다. r²는 늘 양수라 부호를 떼면 「높을수록
 * 낮다」는 관계가 「높을수록 높다」와 똑같아 보인다.
 *
 * 원래 r도 괄호에 남긴다 — 위 상관표와 같은 값임을 확인할 수 있게.
 */

/** 부호 붙은 r² × 100 — 막대 길이에 쓴다. 반올림하지 않는다 */
export function shareOf(r: number): number {
  return Math.sign(r) * r * r * 100;
}

/** 화면에 적는 정수 % — 부호는 r을 따른다. 0%면 부호를 달지 않는다 */
export function sharePct(r: number): number {
  const p = Math.round(r * r * 100);
  return p === 0 ? 0 : Math.sign(r) * p;
}

/** `+15% (+0.39)` · `−4% (−0.19)` · `0% (+0.04)` */
export function formatShare(r: number): string {
  const p = sharePct(r);
  const head = p === 0 ? "0%" : `${p < 0 ? "−" : "+"}${Math.abs(p)}%`;
  return `${head} (${formatR(r)})`;
}

/**
 * 한 화면의 % 막대가 **끝까지 차는 값**.
 *
 * 화면에 있는 가장 큰 %를 10% 단위로 올려 잡는다. 고정 100%로 두면
 * 성향 연구에서 흔한 크기(5~20%)가 다 손톱만 해지고, 목록마다 따로 잡으면
 * 「협력의 15%」와 「직무능력의 17%」가 서로 다른 길이로 그려진다 —
 * **한 화면의 목록은 한 눈금을 쓴다.** 10% 단위로 올리는 것은 응답 몇 개가
 * 바뀔 때마다 눈금이 출렁이지 않게 하려는 것이다. 바닥은 10%.
 */
export function shareFull(rs: number[]): number {
  const top = Math.max(0, ...rs.map((r) => r * r * 100));
  return Math.max(10, Math.ceil(top / 10) * 10);
}

/**
 * |r|이 큰 순. 크기가 같으면 **들어온 순서를 지킨다** (`sort`는 안정 정렬) —
 * 같은 값에서 순서가 매번 바뀌면 「이전·다음」으로 넘기는 차례가 흔들린다.
 */
export function rankByAbs<T extends { r: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}
