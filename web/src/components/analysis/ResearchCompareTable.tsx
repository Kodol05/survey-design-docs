import { formatR } from "./correlationColor";
import { GradeTag } from "./GradeTag";
import type { CompareSummary } from "@/lib/admin/researchCompare";

/**
 * 연구값과 사내값이 얼마나 맞는지 — 연구 표 오른쪽에 붙는다.
 *
 * **두 값을 한 칸에 합치지 않는다.** 왼쪽 표는 그대로 두고 여기서 나란히
 * 놓기만 한다. 표본도 지표도 나라도 다른 값이라 평균을 내면 없는 숫자를
 * 만들어내는 셈이 된다 (11 §3.2, D-36).
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
      <h3 className="text-section-title mb-1">얼마나 맞는가</h3>
      <p className="text-ink-secondary mb-6">
        {off === 0 ? (
          <>
            맞대 볼 수 있는 <span className="tabular">{data.comparable}</span>칸
            모두 연구값이 우리 신뢰구간 안에 들어옵니다.
          </>
        ) : (
          <>
            <span className="tabular">{data.comparable}</span>칸 가운데{" "}
            <strong className="text-ink tabular">{off}</strong>칸이 어긋납니다.
          </>
        )}
      </p>

      {/* 좁은 화면에서 가로로 밀려나지 않게. 표는 줄일 수 없으므로 스크롤한다 */}
      <div className="overflow-x-auto">
        <table className="text-table w-full min-w-[30rem]">
          <thead>
            <tr className="text-axis text-ink-muted border-b border-[--border]">
              <th className="pb-2 text-left font-medium">성향 × 직무능력</th>
              <th className="w-16 pb-2 text-right font-medium">연구</th>
              <th className="w-32 pb-2 text-right font-medium">우리 회사</th>
              <th className="w-20 pb-2 text-right font-medium">판정</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr
                key={`${r.scale} ${r.axis}`}
                className="border-b border-[--border]"
              >
                <td className="py-2.5">
                  {r.scale} <span className="text-ink-muted">×</span> {r.axis}
                </td>
                <td className="tabular text-ink-secondary py-2.5 text-right">
                  {formatR(r.research)}
                </td>
                <td className="py-2.5 text-right whitespace-nowrap">
                  <span className="tabular">{formatR(r.ours)}</span>
                  <GradeTag r={r.ours} ci={r.ci} className="ml-2" />
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

      {data.directions.length > 0 && (
        <div className="mt-8 border-t border-[--border] pt-6">
          <h4 className="text-table mb-1 font-medium">방향만 예상한 칸</h4>
          <p className="text-axis text-ink-muted mb-4">
            직접 잰 연구가 없어 쪼개서 부호만 세운 것입니다. 숫자가 없으니{" "}
            <strong>방향이 맞았는지만</strong> 봅니다.
          </p>
          <ul className="flex flex-col">
            {data.directions.map((d) => (
              <li
                key={`${d.scale} ${d.axis}`}
                className="border-b border-[--border] py-2.5 last:border-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <span className="text-table">
                    {d.scale} <span className="text-ink-muted">×</span> {d.axis}
                  </span>
                  <span className="text-axis tabular">
                    <span className="text-ink-muted">
                      예상 {d.expected > 0 ? "+" : "−"}
                    </span>
                    <span className="ml-2">우리 {formatR(d.ours)}</span>
                    <span
                      className="ml-3"
                      style={{
                        color: d.uncertain
                          ? "var(--ink-muted)"
                          : d.matches
                            ? "var(--ink-secondary)"
                            : "var(--status-warn-ink)",
                        fontWeight: !d.uncertain && !d.matches ? 600 : 400,
                      }}
                    >
                      {d.uncertain ? "아직 확정 아님" : d.matches ? "방향 맞음" : "방향 반대"}
                    </span>
                  </span>
                </div>
                <p className="text-axis text-ink-muted mt-0.5 leading-snug">{d.basis}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        판정 기준은 한 줄로만 적는다. 처음에는 두 문단이었는데 표보다 길어져
        읽히지 않았다. 자세한 근거는 코드 주석과 11 §3.2에 있다.
      */}
      <p className="text-axis text-ink-muted mt-4">
        두 숫자의 차이가 아니라{" "}
        <strong>연구값이 우리 95% 구간 안에 드는지</strong>로 봅니다. 사람이
        늘면 구간이 좁아져 판정이 날카로워집니다.
        {data.noResearch > 0 && (
          <> 연구값이 없어 못 맞댄 칸이 {data.noResearch}개 있습니다.</>
        )}
      </p>
    </div>
  );
}
