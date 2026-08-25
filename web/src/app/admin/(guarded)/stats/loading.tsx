/**
 * 분석 화면 전용 대기 표시.
 *
 * 여기가 제일 오래 걸린다 — 사람 수십 명의 상관 21개, 예측 회귀, 척도별 α,
 * 사람별 응답 신뢰도를 한 번에 낸다. 위쪽 제목과 탭은 이미 자리를 잡고 있으니
 * **본문만 비워 두고 무엇을 기다리는지 적는다.**
 */
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <p className="text-ink-muted text-item" role="status" aria-live="polite">
        계산하는 중입니다…
      </p>
      <p className="text-axis text-ink-muted mt-2">
        사람이 늘수록 조금씩 오래 걸립니다
      </p>
    </div>
  );
}
