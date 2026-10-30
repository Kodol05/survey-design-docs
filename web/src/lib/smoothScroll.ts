/**
 * 부드러운 스크롤을 **직접** 그린다 (2026-10-30).
 *
 * `scrollIntoView({ behavior: "smooth" })`는 윈도우의 「애니메이션 효과」가
 * 꺼져 있으면 브라우저가 순간이동으로 바꿔 버린다. 이 사이트는 그 설정을
 * 따르지 않기로 했으므로(사용자 결정, globals.css) 움직임을 우리가 그린다.
 *
 * 도착 위치는 브라우저에게 맡긴다 — 한 번 순간이동시켜 도착점을 읽고 곧장
 * 제자리로 돌린 뒤(그리기 전이라 화면에는 안 보인다) 그 사이를 움직인다.
 * 그래서 `scroll-margin`과 화면 확대(`zoom`)가 그대로 맞는다.
 */

const DURATION_MS = 450;

let frame = 0;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** 창을 `to`까지 부드럽게 옮긴다. 앞의 움직임이 남아 있으면 끊고 새로 시작한다 */
export function smoothScrollTo(to: number) {
  cancelAnimationFrame(frame);
  const from = window.scrollY;
  const distance = to - from;
  if (Math.abs(distance) < 1) return;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / DURATION_MS);
    window.scrollTo({ top: from + distance * ease(t), behavior: "instant" });
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

/** `el`이 화면의 `block` 자리에 오도록 부드럽게 옮긴다 */
export function smoothScrollIntoView(
  el: Element,
  block: ScrollLogicalPosition = "center",
) {
  cancelAnimationFrame(frame);
  const from = window.scrollY;
  el.scrollIntoView({ behavior: "instant", block });
  const to = window.scrollY;
  window.scrollTo({ top: from, behavior: "instant" });
  smoothScrollTo(to);
}
