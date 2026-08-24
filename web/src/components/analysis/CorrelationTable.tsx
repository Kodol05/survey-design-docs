"use client";

import { correlationFill, formatR } from "./correlationColor";
import { GradeTag } from "./GradeTag";
import { gradeOf } from "./correlationWords";

/**
 * 상관 표 — docs/11-ui-guide.md §3.2
 *
 * 지키는 것
 *  - 칸 안에 **숫자를 직접** 적는다. 색만으로는 값을 정확히 못 읽는다
 *  - 발산 색, 0이 가운데
 *  - **칸마다 n** — 같은 .30이라도 n=500과 n=37은 다르다
 *  - `숫자` / `없음` / `—` **세 상태를 구분**. 색으로는 뒤 둘을 못 가르므로 글자로
 *  - 신뢰구간이 0을 걸치면 흐리게
 *
 * 칸을 누르면 그 쌍의 산점도가 옆에 뜬다. 표는 어디를 볼지 고르는 도구이고,
 * 실제로 보는 것은 산점도다 — 한두 명이 상관을 끌고 있는지는 점을 봐야 안다.
 */

export type Cell =
  | { kind: "value"; r: number; n: number; ci: [number, number]; note?: string }
  /** 연구에서 봤는데 관련이 나오지 않았다 */
  | { kind: "none"; note?: string }
  /** 아무도 이 조합을 연구하지 않았다 */
  | { kind: "unstudied" }
  /** 사내 데이터가 아직 모자란다 */
  | { kind: "tooFew"; n: number };

export type Selected = { row: string; col: string } | null;

export function CorrelationTable({
  rows,
  cols,
  cell,
  selected,
  onSelect,
}: {
  rows: string[];
  cols: string[];
  cell: (row: string, col: string) => Cell;
  selected?: Selected;
  onSelect?: (sel: { row: string; col: string }) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th className="text-axis text-ink-muted w-32 pb-2 text-left font-medium">
              성향 축
            </th>
            {cols.map((c) => (
              <th key={c} className="text-table pb-2 text-center font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th scope="row" className="text-table pr-3 text-left font-normal">
                {r}
              </th>
              {cols.map((c) => {
                const v = cell(r, c);
                const on = selected?.row === r && selected?.col === c;
                const clickable = Boolean(onSelect) && v.kind === "value";
                return (
                  <td key={c} className="p-0">
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => clickable && onSelect?.({ row: r, col: c })}
                      aria-label={describe(r, c, v)}
                      className={`flex h-[4.75rem] w-full flex-col items-center justify-center rounded-md transition ${
                        clickable ? "cursor-pointer hover:brightness-95" : "cursor-default"
                      }`}
                      style={{
                        /*
                          값이 있는 칸은 언제나 칠한다. 안 칠하면 0에 가까운 칸이
                          "연구된 적 없음" 칸과 같아 보인다.
                          방향이 확정 안 된 칸은 투명도가 아니라 색으로 옅게 만든다 —
                          투명도를 걸면 안에 든 숫자까지 흐려져 안 읽힌다.
                        */
                        background:
                          v.kind === "value"
                            ? correlationFill(v.r, crosses(v.ci))
                            : "transparent",
                        color: v.kind === "value" ? "var(--ink)" : undefined,
                        boxShadow:
                          v.kind === "value"
                            ? "inset 0 0 0 1px rgb(34 32 29 / 0.08)"
                            : undefined,
                        outline: on ? "2px solid var(--ink)" : undefined,
                        outlineOffset: -2,
                      }}
                    >
                      <Body cell={v} />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const crosses = (ci: [number, number]) => ci[0] <= 0 && ci[1] >= 0;

function Body({ cell }: { cell: Cell }) {
  if (cell.kind === "unstudied")
    return <span className="text-ink-muted">—</span>;
  if (cell.kind === "none")
    return <span className="text-axis text-ink-muted">없음</span>;
  if (cell.kind === "tooFew")
    return <span className="text-axis text-ink-muted">n 부족</span>;
  return (
    <>
      <span className="tabular font-medium leading-tight">{formatR(cell.r)}</span>
      <GradeTag r={cell.r} ci={cell.ci} onFill className="mt-0.5 leading-tight" />
      <span className="text-axis tabular leading-tight" style={{ opacity: 0.7 }}>
        n={cell.n}
      </span>
    </>
  );
}

function describe(row: string, col: string, c: Cell) {
  if (c.kind === "unstudied") return `${row} × ${col}, 연구된 적 없음`;
  if (c.kind === "none") return `${row} × ${col}, 관련 없음`;
  if (c.kind === "tooFew") return `${row} × ${col}, 표본 부족`;
  return `${row} × ${col}, ${gradeOf(c.r, c.ci)}, 상관 ${formatR(c.r)}, ${c.n}명, 신뢰구간 ${formatR(
    c.ci[0],
  )}에서 ${formatR(c.ci[1])}`;
}

/** 표 아래에 한 번 두는 범례. 색만으로 읽게 두지 않는다. */
export function CorrelationLegend({ inHouse }: { inHouse?: boolean }) {
  return (
    <div className="text-axis text-ink-muted mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
      <span className="flex items-center gap-2">
        <span
          className="h-3 w-24 rounded-sm"
          style={{
            background:
              "linear-gradient(90deg, #b3623f, #ddd8ce, #44618d)",
          }}
        />
        음의 관계 ← → 양의 관계
      </span>
      <span className="text-ink-secondary">
        등급 <span className="tabular">.10</span> 약함 ·{" "}
        <span className="tabular">.20</span> 어느 정도 ·{" "}
        <span className="tabular">.30</span> 뚜렷함 ·{" "}
        <span className="tabular">.50</span> 매우 뚜렷함
      </span>
      <span>
        <span style={{ color: "var(--status-warn)" }}>불확실</span> = 신뢰구간이 0을
        걸쳐 방향조차 정해지지 않음
      </span>
      {inHouse ? (
        <span>n 부족 = 30명 미만</span>
      ) : (
        <span>
          <span className="text-ink-secondary">없음</span> 연구했는데 관련 없음 ·{" "}
          <span className="text-ink-secondary">—</span> 연구된 적 없음
        </span>
      )}
    </div>
  );
}
