/**
 * 화면을 기다리는 동안 (Task: 완성도 ①).
 *
 * 분석 화면은 사람 수십 명의 상관 21개와 예측·신뢰도를 서버에서 계산한다.
 * 그동안 **아무 반응이 없으면 화면이 죽은 것처럼 보인다** — 탭을 다시 누르게
 * 되고, 그러면 계산이 한 번 더 돈다.
 *
 * ## 뼈대를 흉내 내지 않는다
 *
 * 회색 상자로 표를 흉내 내는 방식(스켈레톤)은 쓰지 않는다. 화면마다 모양이
 * 달라서 맞출 수가 없고, 안 맞으면 **다 그려진 뒤 배치가 튄다.** 조용한
 * 글자 한 줄이면 「돌고 있다」는 것은 전해진다.
 */
export default function Loading() {
  return (
    <div className="page-column flex flex-1 items-center justify-center py-32">
      <p className="text-ink-muted text-item" role="status" aria-live="polite">
        불러오는 중입니다…
      </p>
    </div>
  );
}
