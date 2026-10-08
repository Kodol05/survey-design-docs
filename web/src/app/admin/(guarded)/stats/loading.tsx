/**
 * 분석 화면 전용 대기 표시.
 *
 * 여기가 제일 오래 걸린다 — 사람 수십 명의 상관 21개, 척도별 α, 사람별 응답
 * 신뢰도를 한 번에 낸다. 메뉴(위쪽 줄·사이드바)는 레이아웃이 이미 그려 두니
 * **본문 자리만 무엇을 기다리는지 적는다.**
 *
 * 「사람이 늘수록 조금씩 오래 걸립니다」 설명 줄은 지웠다 (2026-10-07 사용자
 * 결정 — 설명 문장은 줄인다). 「예측 대 실제」 탭이 지워져 예측 회귀도 이제
 * 여기서 계산하지 않는다.
 */
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <p className="text-ink-muted text-item" role="status" aria-live="polite">
        계산하는 중입니다…
      </p>
    </div>
  );
}
