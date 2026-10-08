"use client";

import { correlationFill, formatR } from "./correlationColor";
import { gradeOf, isUncertain } from "./correlationWords";

/**
 * 상관 표 — docs/11-ui-guide.md §3.2
 *
 * 지키는 것
 *  - 칸 안에 **숫자를 직접** 적는다. 색만으로는 값을 정확히 못 읽는다
 *  - 발산 색, 0이 가운데
 *  - `숫자` / `없음` / `—` **세 상태를 구분**. 색으로는 뒤 둘을 못 가르므로 글자로
 *  - 신뢰구간이 0을 걸치면 흐리게
 *
 * ## α로 열을 흐리게 하지 않는다 (2026-08-25 사용자와 함께 확인)
 *
 * 한때 α가 기준 아래인 열에 빗금을 치고 「아직 말할 수 없다」고 적었다.
 * **틀린 경고였다.** 협력 세 문항은 인내력과 셋 다 같은 방향이었고, 감쇠
 * 보정을 하면 1을 넘었다 — α가 이 척도의 신뢰도를 너무 낮게 잡고 있다는
 * 뜻이다. 직무능력 문항은 여러 요소가 **모여서 이루는** 것(형성적 지표)이라
 * 문항끼리 상관이 없어도 이상하지 않다.
 *
 * 칸을 누르면 그 쌍의 산점도가 옆에 뜬다. 표는 어디를 볼지 고르는 도구이고,
 * 실제로 보는 것은 산점도다 — 한두 명이 상관을 끌고 있는지는 점을 봐야 안다.
 *
 * ## 칸은 한 줄 — 숫자 크게, 등급 작게 (2026-10-07 사용자 결정)
 *
 * 칸 안에 등급·막대·숫자를 세 줄로 쌓았더니 칸이 100px이 넘어 표가 한
 * 화면에 안 들어왔고, 「표가 이상해 보인다」는 말을 들었다. 막대를 빼고
 * `+0.45 뚜렷함` 한 줄로 줄였다. 크기는 칸 색이 진하기로 말한다
 * (`correlationColor.ts`).
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
  groups,
}: {
  rows: string[];
  cols: string[];
  cell: (row: string, col: string) => Cell;
  selected?: Selected;
  onSelect?: (sel: { row: string; col: string }) => void;
  /**
   * 행을 묶어서 보여준다 — 기질 4 / 성격 3 (2026-08-25 사용자 요청).
   *
   * 이 검사의 뼈대가 타고나는 쪽과 만들어지는 쪽의 구분인데(Cloninger),
   * 평평하게 늘어놓으면 표에서 그게 사라진다. 묶어 두면 「직무능력과 관련
   * 있는 것은 어느 쪽인가」를 눈으로 답할 수 있다.
   *
   * 주지 않으면 `rows` 순서대로 평평하게 그린다.
   */
  groups?: { label: string; note?: string; rows: string[] }[];
}) {
  return (
    <div className="overflow-x-auto">
      {/*
        칸끼리 **3px씩 띄운 타일**로 그린다 (2026-10-07).

        한때 격자선으로 붙였는데(2026-08-24 — 칸마다 그림자 테두리를 흉내 내
        선이 끊겼던 것을 고치려고), 칸 안의 막대가 빠지고 칸이 색 하나가 되자
        굵은 격자가 색보다 먼저 보였다. 칸 사이를 바탕색으로 비우면 칸 하나하나가
        한 덩어리로 읽히고 행·열은 정렬로 따라간다.

        `table-fixed` — 자동 폭이면 열 이름 글자 수대로 폭이 갈려 `협력` 칸만
        좁아진다. 이름 열에만 폭을 주고 값 열은 남는 폭을 똑같이 나눈다.
      */}
      <table className="w-full table-fixed border-separate border-spacing-[3px]">
        <colgroup>
          <col style={{ width: "7.5rem" }} />
          {cols.map((c) => (
            <col key={c} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th
                key={c}
                scope="col"
                className="text-table px-1 pb-1 text-center font-medium"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        {(groups ?? [{ label: "", rows }]).map((g) => (
          <tbody key={g.label}>
            {g.label && (
              <tr>
                <th
                  scope="colgroup"
                  colSpan={cols.length + 1}
                  className="border-b border-(--border) px-1 pt-3 pb-1 text-left font-normal"
                >
                  <span className="text-axis text-ink-secondary font-semibold">
                    {g.label}
                  </span>
                  {g.note && (
                    <span className="text-axis text-ink-muted ml-2">
                      {g.note}
                    </span>
                  )}
                </th>
              </tr>
            )}
            {g.rows.map((r) => (
              <tr key={r}>
                <th
                  scope="row"
                  className="text-table truncate px-1 text-left font-normal"
                >
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
                        onClick={() =>
                          clickable && onSelect?.({ row: r, col: c })
                        }
                        aria-label={describe(r, c, v)}
                        aria-pressed={clickable ? on : undefined}
                        title={
                          v.kind === "value"
                            ? `${v.n}명 · 95% 구간 ${formatR(v.ci[0])}~${formatR(v.ci[1])}`
                            : undefined
                        }
                        className={`flex h-11 w-full items-center justify-center gap-1.5 overflow-hidden rounded-md px-1 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--ink) ${
                          clickable
                            ? "cursor-pointer hover:outline-1 hover:outline-offset-[-1px] hover:outline-(--ink-muted)"
                            : "cursor-default"
                        }`}
                        style={{
                          /*
                            값이 있는 칸은 언제나 칠한다. 안 칠하면 0에 가까운
                            칸이 「연구된 적 없음」 칸과 같아 보인다. 방향이 확정
                            안 된 칸은 투명도가 아니라 색으로 옅게 만든다 —
                            투명도를 걸면 숫자까지 흐려진다.
                          */
                          backgroundColor:
                            v.kind === "value"
                              ? correlationFill(v.r, isUncertain(v.ci))
                              : "transparent",
                          color: v.kind === "value" ? "var(--ink)" : undefined,
                          /*
                            **고른 칸에는 2px 테두리를 두른다** (2026-10-07 사용자
                            결정). 한때(2026-08-25) 검은 네모가 칸 안의 막대보다
                            먼저 보인다고 빼고 채도만 올렸는데, 막대가 빠진 지금은
                            채도 차이로는 어느 칸이 오른쪽 그림인지 안 보였다.
                          */
                          outline: on ? "2px solid var(--ink)" : undefined,
                          outlineOffset: on ? -2 : undefined,
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
        ))}
      </table>
    </div>
  );
}

function Body({ cell }: { cell: Cell }) {
  if (cell.kind === "unstudied")
    return <span className="text-ink-muted">—</span>;
  if (cell.kind === "none")
    return <span className="text-axis text-ink-muted">없음</span>;
  if (cell.kind === "tooFew")
    return <span className="text-axis text-ink-muted">n 부족</span>;

  const grade = gradeOf(cell.r);
  /*
    방향이 아직 확정 안 된 칸 — 숫자를 한 단 흐린 잉크로, 등급 뒤에 `?`.
    「없음」에는 `?`를 달지 않는다 (`GradeTag`와 같은 규칙 — 「없음?」은
    「없는 것이 확실치 않다」로 뒤집혀 읽힌다).
  */
  const soft = isUncertain(cell.ci);
  return (
    <>
      <span
        className="tabular text-[1.0625rem] leading-none font-semibold"
        style={{ color: soft ? "var(--ink-secondary)" : undefined }}
      >
        {formatR(cell.r)}
      </span>
      {/*
        폰 폭에서는 칸이 60px 남짓이라 숫자와 등급 말이 겹쳤다 (2026-10-08 점검).
        좁을 때는 숫자만 둔다 — 등급은 칸 색과 아래 범례가 말한다.
      */}
      <span
        className="hidden text-[0.8125rem] leading-none sm:inline"
        style={{ opacity: soft ? 0.7 : 0.85 }}
      >
        {grade}
        {soft && grade !== "없음" && <span aria-hidden>?</span>}
      </span>
    </>
  );
}

function describe(row: string, col: string, c: Cell) {
  if (c.kind === "unstudied") return `${row} × ${col}, 값 없음`;
  if (c.kind === "none") return `${row} × ${col}, 관련 없음`;
  if (c.kind === "tooFew") return `${row} × ${col}, 표본 부족`;
  return `${row} × ${col}, ${gradeOf(c.r) + (isUncertain(c.ci) ? " 아직 확정 아님" : "")}, 상관 ${formatR(c.r)}, ${c.n}명, 신뢰구간 ${formatR(
    c.ci[0],
  )}에서 ${formatR(c.ci[1])}`;
}

/**
 * 표 아래 범례 — **한두 줄** (2026-08-25 사용자 요청, 2026-10-07 다시 줄임).
 *
 * 범례는 표를 읽는 열쇠지 읽을 거리가 아니다. 칸 안 막대를 뺀 뒤로
 * 「막대 길이」 항목도 뺐다. 색 띠는 실제 칸과 같은 함수로 칠한다 — 숫자로
 * 박아 두면 토큰을 바꿀 때 범례만 옛 색으로 남는다.
 */
export function CorrelationLegend({
  nRange,
}: {
  /** 칸마다 인원이 다를 때만 `[최소, 최대]`. 다 같으면 머리줄의 N명으로 충분하다 */
  nRange?: [number, number] | null;
}) {
  return (
    <div className="text-axis text-ink-muted mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
      <span className="flex items-center gap-2">
        <span>음</span>
        <span
          className="h-2.5 w-16 rounded-sm"
          style={{
            background: `linear-gradient(90deg, ${correlationFill(-0.5)}, var(--diverge-mid), ${correlationFill(0.5)})`,
          }}
        />
        <span>양</span>
      </span>
      <span>흐린 칸 · ? = 방향 아직 확정 아님</span>
      <span>
        <span className="tabular">0.10</span> 약함 ·{" "}
        <span className="tabular">0.20</span> 어느 정도 ·{" "}
        <span className="tabular">0.30</span> 뚜렷함 ·{" "}
        <span className="tabular">0.50</span> 매우 뚜렷함
      </span>
      {nRange && (
        <span>
          칸마다 인원{" "}
          <span className="tabular">
            {nRange[0]}~{nRange[1]}
          </span>
          명
        </span>
      )}
    </div>
  );
}
