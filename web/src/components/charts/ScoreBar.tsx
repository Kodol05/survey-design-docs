/** 축 하나의 만점 대비 % 막대. 0~100 고정 (11 §3). */
export function ScoreBar({ percent }: { percent: number }) {
  const w = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full"
      style={{ background: "var(--grid)" }}
      aria-hidden
    >
      <div className="h-full rounded-full" style={{ width: `${w}%`, background: "var(--series-1)" }} />
    </div>
  );
}
