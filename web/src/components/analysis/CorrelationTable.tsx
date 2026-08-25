"use client";

import { correlationFill, formatR } from "./correlationColor";
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
 *  - **척도가 안 맞물리면 그 열을 통째로 흐리게** (아래 참고)
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
  /**
   * 직접 잰 연구는 없지만 쪼개서 **방향만** 세운 칸 (조직생활).
   * 숫자가 없으므로 칠하지 않는다 — 칠하면 잰 값처럼 보인다.
   */
  | { kind: "expected"; direction: 1 | -1; basis: string; estimate?: number }
  /** 사내 데이터가 아직 모자란다 */
  | { kind: "tooFew"; n: number };

export type Selected = { row: string; col: string } | null;

/**
 * 열을 통째로 흐리게 하는 이유 — **α와 상관을 잇는다** (2026-08-25 사용자 결정).
 *
 * 그동안 「검사 신뢰도」 탭은 협력 α가 기준 아래라고 말하고, 이 표는 협력
 * 열을 다른 열과 **똑같이 진하게** 그렸다. 두 화면이 서로를 몰랐다.
 *
 * 척도가 안 맞물리면(α가 낮으면) 그 척도로 잰 상관은 **실제보다 작게**
 * 나온다 — 잰 값에 잡음이 섞여 있으니 어떤 관계든 희석된다(attenuation).
 * 그러니 「관련이 약하다」가 아니라 **「아직 말할 수 없다」**가 맞다.
 *
 * 숨기지는 않는다. 흐리게 하고 열 머리에 이유를 적는다 — 가려 버리면
 * 왜 없는지 묻게 되고, 그대로 두면 잘못 읽는다.
 */

export function CorrelationTable({
  rows,
  cols,
  cell,
  selected,
  onSelect,
  colNote,
  dimCol,
  groups,
}: {
  rows: string[];
  cols: string[];
  cell: (row: string, col: string) => Cell;
  selected?: Selected;
  onSelect?: (sel: { row: string; col: string }) => void;
  /** 열 이름 아래 한 줄 — 지금은 α를 적는다 */
  colNote?: (col: string) => React.ReactNode;
  /** 참이면 그 열의 칸을 통째로 흐리게 그린다 */
  dimCol?: (col: string) => boolean;
  /**
   * 행을 묶어서 보여준다 — 기질 4 / 성격 3 (2026-08-25 사용자 요청).
   *
   * 일곱 축을 평평하게 늘어놓으면 **어디까지가 타고나는 쪽이고 어디부터
   * 만들어지는 쪽인지**가 안 보인다. 이 검사의 뼈대가 그 구분인데
   * (Cloninger의 기질·성격 이론), 표에서는 그게 사라져 있었다.
   *
   * 묶어 두면 물음이 하나 더 생긴다 — **「직무능력과 관련 있는 것은 타고나는
   * 쪽인가, 만들어지는 쪽인가」.** 숫자를 더 만들지 않고 줄만 나눠서
   * 눈으로 답하게 한다.
   *
   * 주지 않으면 `rows` 순서대로 평평하게 그린다.
   */
  groups?: { label: string; note?: string; rows: string[] }[];
}) {
  return (
    <div className="overflow-x-auto">
      {/*
        `table-fixed`가 핵심이다. 자동 폭으로 두면 열 이름 글자 수대로 폭이
        갈린다 — `협력`(2자) 칸만 좁고 `자율적실행`(5자) 칸이 넓어졌다.
        칸 안에 든 값은 다 같은 종류인데 폭이 다르면 크기를 눈으로 비교할 수 없다.

        폭을 지정하지 않은 열은 고정 레이아웃에서 남는 폭을 **똑같이** 나눠 갖는다.
        그래서 성향 축 이름 열에만 폭을 주고 나머지는 비워 둔다.
      */}
      {/*
        칸 사이를 **띄우지 않고 선으로 나눈다** (2026-08-24).

        전에는 2px씩 벌리고 칸마다 안쪽 그림자로 테두리를 흉내 냈다. 그러면
        선이 칸마다 끊겨서 **가로세로로 쭉 이어지지 않는다** — 표를 훑을 때
        눈이 줄을 따라가지 못한다. `border-collapse`로 붙이고 1px 선을 그으면
        격자가 끝까지 이어진다.
      */}
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "10.5rem" }} />
          {cols.map((c) => (
            <col key={c} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {/*
              머리글 칸에도 **좌우 선**을 준다. 아래쪽 선만 주면 세로선이
              본문에서 끊겨 시작해서, 「협력」이 어느 열의 이름인지 눈으로
              따라가지지 않는다. 위쪽 선은 두지 않는다 — 표 바깥을 가두면
              감싸는 테두리가 된다 (11 §2).
            */}
            <th className="text-axis text-ink-muted border-r border-b border-[--border] px-2 pb-2 text-left font-medium">
              성향 축
            </th>
            {cols.map((c) => (
              <th
                key={c}
                className="text-table border-r border-b border-[--border] px-1 pb-2 text-center font-medium last:border-r-0"
              >
                <span className={dimCol?.(c) ? "text-ink-secondary" : undefined}>
                  {c}
                </span>
                {colNote?.(c)}
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
                className="text-axis border-b border-[--border] px-2 pt-5 pb-1 text-left font-medium"
              >
                <span className="text-ink-secondary">{g.label}</span>
                {g.note && <span className="text-ink-muted ml-2">{g.note}</span>}
              </th>
            </tr>
          )}
          {g.rows.map((r) => (
            <tr key={r}>
              <th
                scope="row"
                className="text-table border-r border-b border-[--border] px-2 text-left font-normal"
              >
                {r}
              </th>
              {cols.map((c) => {
                const v = cell(r, c);
                const on = selected?.row === r && selected?.col === c;
                // 열이 흐린 상태면 칸 하나하나의 확실성과 무관하게 흐리다
                const dim = Boolean(dimCol?.(c));
                const clickable = Boolean(onSelect) && v.kind === "value";
                return (
                  <td
                    key={c}
                    className="border-r border-b border-[--border] p-0 last:border-r-0"
                  >
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => clickable && onSelect?.({ row: r, col: c })}
                      aria-label={describe(r, c, v)}
                      className={`flex h-[6.25rem] w-full flex-col items-center justify-center transition ${
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
                            ? correlationFill(v.r, dim || crosses(v.ci))
                            : "transparent",
                        color: v.kind === "value" ? "var(--ink)" : undefined,
                        /*
                          **고른 칸에 테두리를 두르지 않는다** (2026-08-25).

                          전에는 `var(--ink)` 2px이라 밝은 화면에서는 검은
                          네모, 어두운 화면에서는 흰 네모가 칸 위에 씌워졌다.
                          칸 안의 막대·숫자보다 테두리가 먼저 보였다.

                          오른쪽에 고른 조합의 이름이 크게 나오므로 여기서
                          한 번 더 말할 필요가 없다. 대신 **칸을 살짝 들어
                          올려** 눌린 자리를 표시한다 — 테두리를 더하지 않고
                          이미 있는 색만 진하게 쓴다.
                        */
                        filter: on ? "saturate(1.45) brightness(0.97)" : undefined,
                      }}
                    >
                      <Body cell={v} dim={dim} />
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

const crosses = (ci: [number, number]) => ci[0] <= 0 && ci[1] >= 0;

/** 막대가 끝까지 차는 값. 실제 데이터에서 |r|이 1에 가는 일은 없다 */
const FULL = 0.7;

/**
 * 칸 안의 작은 막대 — 0을 가운데 두고 좌우로.
 *
 * 순위 화면·대시보드의 막대와 **같은 규칙**을 쓴다. 같은 값이 화면마다 다른
 * 모양으로 나오면 눈이 다시 배워야 한다.
 */
function CellBar({ r, faded }: { r: number; faded: boolean }) {
  /*
    ⚠️ **최소 폭과 시작점에 같은 값을 써야 한다.**

    전에는 시작점을 `50 - w`로 잡고 폭만 `max(2, w)`로 늘렸다. 그래서 값이
    아주 작은 음수(`−.01` 같은)에서 **왼쪽 막대가 가운데 선을 1.3%쯤
    넘어갔다.** 넘어간 자리에 가운데 선이 겹쳐 색이 하나 더 있는 것처럼
    보였다 — 실제로 그렇게 보인다는 지적을 받았다.

    한 번만 계산해서 양쪽에 같이 쓴다. 어떤 값이든 막대는 가운데에서
    한쪽으로만 뻗는다.
  */
  const w = Math.max(1.6, Math.min(50, (Math.abs(r) / FULL) * 50));
  return (
    // 배경색을 옅게 내린 만큼 막대는 굵고 넓게 — 이제 크기를 이쪽이 진다
    <span className="relative my-1.5 block h-3.5 w-[86%]">
      {/*
        가운데 선은 **막대 아래에 아주 옅게** 둔다. 진하게 두면 막대 끝에
        붙어 다른 색 조각처럼 보인다. 어두운 화면에서 `--ink`는 거의 흰색이라
        특히 눈에 걸렸다.
      */}
      <span
        className="absolute inset-y-0 left-1/2 w-px"
        style={{ background: "var(--ink)", opacity: 0.14 }}
      />
      <span
        className="absolute inset-y-0 rounded-sm"
        style={{
          left: r < 0 ? `${50 - w}%` : "50%",
          width: `${w}%`,
          background: r < 0 ? "var(--diverge-neg)" : "var(--diverge-pos)",
          opacity: faded ? 0.45 : 1,
        }}
      />
    </span>
  );
}

function Body({ cell, dim = false }: { cell: Cell; dim?: boolean }) {
  if (cell.kind === "unstudied") return <span className="text-ink-muted">—</span>;
  if (cell.kind === "expected")
    return (
      <span
        className="flex flex-col items-center rounded-md px-2 py-1"
        style={{
          color: "var(--ink-secondary)",
          outline: "1px dashed var(--border)",
        }}
        title={cell.basis}
      >
        <span className="tabular font-medium">
          {cell.estimate === undefined
            ? cell.direction > 0
              ? "+"
              : "−"
            : `≈${cell.estimate < 0 ? "−" : "+"}${Math.abs(cell.estimate)
                .toFixed(2)
                .replace(/^0/, "")}`}
        </span>
        <span className="text-axis leading-tight">추정</span>
      </span>
    );
  if (cell.kind === "none")
    return <span className="text-axis text-ink-muted">없음</span>;
  if (cell.kind === "tooFew")
    return <span className="text-axis text-ink-muted">n 부족</span>;
  return (
    <>
      <span className="tabular text-axis leading-tight" style={{ opacity: 0.75 }}>
        {gradeOf(cell.r)}
      </span>
      {/*
        **칸을 작은 그래프로 만든다.**

        전에는 색 하나로 방향과 크기를 다 지고 있었다. 색만으로는 `+.31`과
        `+.44`가 얼마나 다른지 눈으로 안 읽히고, 색을 못 보는 사람에게는
        아무것도 남지 않는다.

        0을 가운데 둔 막대를 깔면 **길이가 크기, 방향이 좌우**를 맡는다.
        그만큼 배경색은 옅게 물러난다 (`correlationColor.ts`).
      */}
      {/*
        **막대가 칸의 가운데다.** 숫자·등급은 위아래로 물리고 막대에 자리를
        내준다. 표를 훑을 때 먼저 잡히는 것이 「얼마나 큰가」여야 한다 —
        숫자는 그다음에 확인하는 것이다.
      */}
      <CellBar r={cell.r} faded={dim || crosses(cell.ci)} />
      <span
        className="tabular leading-tight"
        style={{ fontWeight: dim ? 400 : 500, color: dim ? "var(--ink-secondary)" : undefined }}
      >
        {formatR(cell.r)}
      </span>
      <span className="text-axis tabular leading-tight" style={{ opacity: 0.6 }}>
        n={cell.n}
      </span>
    </>
  );
}

function describe(row: string, col: string, c: Cell) {
  if (c.kind === "unstudied") return `${row} × ${col}, 연구된 적 없음`;
  if (c.kind === "expected")
    return `${row} × ${col}, 직접 잰 연구는 없고 방향만 ${
      c.direction > 0 ? "같은 쪽" : "반대 쪽"
    }으로 예상. ${c.basis}`;
  if (c.kind === "none") return `${row} × ${col}, 관련 없음`;
  if (c.kind === "tooFew") return `${row} × ${col}, 표본 부족`;
  return `${row} × ${col}, ${gradeOf(c.r) + (crosses(c.ci) ? " 아직 확정 아님" : "")}, 상관 ${formatR(c.r)}, ${c.n}명, 신뢰구간 ${formatR(
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
              "linear-gradient(90deg, #b3623f, #eae6de, #3a5fa0)",
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
      <span className="flex items-center gap-2">
        <span className="relative inline-block h-2 w-10">
          <span
            className="absolute inset-y-0 left-1/2 w-px"
            style={{ background: "var(--ink)", opacity: 0.3 }}
          />
          <span
            className="absolute inset-y-0 left-1/2 w-[35%] rounded-sm"
            style={{ background: "var(--diverge-pos)" }}
          />
        </span>
        막대 길이 = 관련도 크기 · 0이 가운데
      </span>
      <span>흐린 막대 = 신뢰구간이 0을 걸쳐 방향이 아직 확정되지 않음</span>
      {inHouse ? (
        <span>n 부족 = 30명 미만</span>
      ) : (
        <span>
          <span className="text-ink-secondary">없음</span> 연구했는데 관련 없음 ·{" "}
          <span className="text-ink-secondary">—</span> 연구된 적 없음 ·{" "}
          <span
            className="rounded px-1.5"
            style={{ outline: "1px dashed var(--border)", color: "var(--ink-secondary)" }}
          >
            ≈+.08 추정
          </span>{" "}
          직접 잰 연구가 없어 가까운 개념 둘을 섞어 <strong>계산</strong>한 값. 잰 값이
          아닙니다
        </span>
      )}
    </div>
  );
}
