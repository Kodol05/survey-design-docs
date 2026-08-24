import { formatR } from "./correlationColor";
import { GradeTag } from "./GradeTag";
import type { CompareSummary } from "@/lib/admin/researchCompare";

/**
 * 연구값과 사내값이 얼마나 맞는지 — 두 표 아래에 두는 절.
 *
 * **두 값을 한 칸에 합치지 않는다.** 위의 두 표는 그대로 두고, 여기서만
 * 나란히 놓는다. 서로 다른 표본·다른 지표에서 온 값이라 평균을 내거나
 * 하나로 합치면 없는 숫자를 만들어내는 셈이 된다 (11 §3.2).
 *
 * 차이가 큰 칸이 위로 온다. 볼 것이 먼저 보여야 한다.
 */
export function ResearchCompareTable({ data }: { data: CompareSummary }) {
  if (!data.comparable)
    return (
      <p className="text-ink-secondary">
        양쪽에 값이 다 있는 칸이 없어 맞대 볼 수 없습니다.
      </p>
    );

  const off = data.comparable - data.compatible;

  return (
    <div>
      <p className="text-ink-secondary mb-6 max-w-[46rem]">
        맞대 볼 수 있는 칸 <strong className="text-ink tabular">{data.comparable}</strong>개
        가운데 <strong className="text-ink tabular">{data.compatible}</strong>개는 연구값이
        우리 신뢰구간 안에 들어옵니다
        {off > 0 ? (
          <>
            . 나머지 <strong className="text-ink tabular">{off}</strong>개가 어긋납니다.
          </>
        ) : (
          <> — 어긋나는 칸은 없습니다.</>
        )}
        {data.noResearch > 0 && (
          <>
            {" "}
            연구값이 없어 비교하지 못한 칸이{" "}
            <span className="tabular">{data.noResearch}</span>개 있습니다.
          </>
        )}
      </p>

      <div className="overflow-x-auto">
        <table className="text-table w-full max-w-[52rem]">
          <thead>
            <tr className="text-axis text-ink-muted border-b border-[--border]">
              <th className="w-56 pb-2 text-left font-medium">성향 × 직무능력</th>
              <th className="w-32 pb-2 text-right font-medium">연구</th>
              <th className="w-40 pb-2 text-right font-medium">우리 회사</th>
              <th className="w-24 pb-2 text-right font-medium">차이</th>
              <th className="w-24 pb-2 text-right font-medium">판정</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={`${r.scale} ${r.axis}`} className="border-b border-[--border]">
                <td className="py-2.5">
                  {r.scale} <span className="text-ink-muted">×</span> {r.axis}
                </td>
                <td className="tabular py-2.5 text-right">{formatR(r.research)}</td>
                <td className="py-2.5 text-right">
                  <span className="tabular">{formatR(r.ours)}</span>
                  <GradeTag r={r.ours} ci={r.ci} className="ml-2" />
                </td>
                <td className="tabular text-ink-secondary py-2.5 text-right">
                  {Math.abs(r.diff).toFixed(2).replace(/^0/, "")}
                </td>
                <td className="text-axis py-2.5 text-right">
                  <span
                    style={{
                      color: r.compatible
                        ? "var(--ink-secondary)"
                        : "var(--status-warn-ink)",
                      fontWeight: r.compatible ? 400 : 600,
                    }}
                  >
                    {r.compatible ? "들어맞음" : "어긋남"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-axis text-ink-secondary mt-6 max-w-[46rem]">
        <p className="mb-2">
          <strong>판정 기준은 두 숫자의 차이가 아닙니다.</strong> 우리 값은 사람 수가
          적어 원래 흔들립니다. 그래서 <strong>연구값이 우리 95% 구간 안에 들어오는지</strong>로
          봅니다. 들어오면 어긋난 게 아니라 <strong>우리 데이터로는 아직 가릴 수 없다</strong>는
          뜻입니다.
        </p>
        <p>
          사람이 늘면 구간이 좁아져 이 판정이 날카로워집니다. 지금 대부분이
          「들어맞음」으로 나오는 것은 잘 맞았다는 뜻이라기보다 <strong>아직 따질 힘이
          없다</strong>는 뜻에 가깝습니다.
        </p>
      </div>
    </div>
  );
}
