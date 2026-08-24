import { correlationFill, formatR } from "./correlationColor";
import { GradeTag } from "./GradeTag";

/**
 * 순위 막대 — docs/11-ui-guide.md §3.4
 *
 * 0을 가운데 두고 좌우로. 절댓값 큰 순.
 *
 * ⚠️ **상위 8개까지만 보여준다.** 세부 항목 28 × 능력 3 = 84개 상관인데,
 *    관계가 없어도 네댓 개는 우연히 높게 나온다. 전부 줄 세우면 노이즈를
 *    발견으로 읽게 된다.
 */

export type RankItem = {
  label: string;
  r: number;
  n: number;
  ci: [number, number];
};

const FULL = 0.7;

export function RankBars({ items }: { items: RankItem[] }) {
  if (!items.length)
    return <p className="text-ink-muted py-8 text-center">보여줄 값이 없습니다.</p>;

  return (
    <ul className="flex flex-col gap-1">
      {items.map((it) => {
        const w = Math.min(50, (Math.abs(it.r) / FULL) * 50);
        const uncertain = it.ci[0] <= 0 && it.ci[1] >= 0;
        return (
          <li
            key={it.label}
            className="grid grid-cols-[11rem_1fr_13rem] items-center gap-4 py-1.5"
            style={{ opacity: uncertain ? 0.5 : 1 }}
          >
            <span className="text-table truncate" title={it.label}>
              {it.label}
            </span>

            <div className="relative h-5">
              {/* 0 기준선 */}
              <div
                className="absolute inset-y-0 left-1/2 w-px"
                style={{ background: "var(--axis)" }}
              />
              <div
                className="absolute inset-y-1 rounded-sm"
                style={{
                  background: correlationFill(it.r),
                  left: it.r < 0 ? `${50 - w}%` : "50%",
                  width: `${w}%`,
                }}
              />
            </div>

            <span className="text-axis text-right">
              <span className="tabular">
                <span className="text-table font-medium">{formatR(it.r)}</span>
              </span>
              <GradeTag r={it.r} ci={it.ci} className="ml-2" />
              <span className="tabular text-ink-muted block leading-tight">
                {formatR(it.ci[0])}~{formatR(it.ci[1])}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
