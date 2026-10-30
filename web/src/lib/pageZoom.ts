/**
 * 큰 모니터에서도 **같은 모양** (2026-10-28 사용자 결정 — 법무법인 정안 시안의 방식).
 *
 * 화면은 가로 1920px을 기준으로 짠다. 그보다 넓은 모니터(2560, 3840 …)에서는
 * 페이지 전체를 `zoom`으로 그 비율만큼 키운다 — 글자·카드·여백이 같이 커져서
 * 넓은 화면 가운데에 작은 화면이 덩그러니 떠 있는 일이 없다. 1920 이하에서는
 * 아무것도 하지 않고 지금처럼 폭에 맞춰 반응한다.
 *
 * `--z`에 같은 배율을 적어 둔다. `100vh` 같은 화면 높이는 zoom이 걸리면 그만큼
 * 커지므로, 화면 높이를 쓰는 자리는 `calc(100svh / var(--z, 1))`로 나눠 쓴다.
 *
 * 표준 `zoom`을 아는 브라우저(`currentCSSZoom`이 있는 곳)에서만 건다. 옛 방식의
 * zoom은 위치 계산이 어긋나 그래프의 마우스 위치가 틀어진다.
 */
export const DESIGN_WIDTH = 1920;

/** `<head>`에서 곧바로 돈다 — 첫 그림부터 맞는 크기로 */
export const ZOOM_SCRIPT = `
(function () {
  if (!("currentCSSZoom" in Element.prototype)) return;
  var root = document.documentElement.style;
  function apply() {
    var w = window.innerWidth;
    if (w > ${DESIGN_WIDTH}) {
      var z = String(Math.round((w / ${DESIGN_WIDTH}) * 10000) / 10000);
      root.setProperty("zoom", z);
      root.setProperty("--z", z);
    } else {
      root.removeProperty("zoom");
      root.removeProperty("--z");
    }
  }
  apply();
  window.addEventListener("resize", apply);
})();
`;

/** 지금 걸린 배율 — 화면 좌표(px)와 CSS 길이를 오갈 때 곱한다 */
export function currentZoom(): number {
  if (typeof document === "undefined") return 1;
  return parseFloat(document.documentElement.style.getPropertyValue("--z")) || 1;
}
