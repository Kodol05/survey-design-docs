/**
 * 프로필 한 장 — 실제 TCI 결과지 1페이지에 해당
 *
 * **바와 숫자만 둔다.** 요점은 "한눈에 모양"이라 일곱 축이 한 화면에 들어와야
 * 한다. 축마다 설명을 붙이면 세로로 길어져서 그게 안 된다. 설명은 아래
 * 축별 상세로 내린다.
 */

export type OverviewRow = {
  scale: string;
  percent: number;
  band: "lower" | "middle" | "upper";
};

export const TEMPERAMENT = ["자극추구", "위험회피", "사회적민감성", "인내력"];
export const CHARACTER = ["자율성", "연대감", "자기초월"];

const STOPS: [number, string][] = [
  [0, "#8b7ad6"],
  [20, "#b6abe3"],
  [38, "#ded9ec"],
  [50, "#eceae4"],
  [62, "#f3decb"],
  [80, "#eec091"],
  [100, "#e5904e"],
];
export const GRADIENT = `linear-gradient(90deg, ${STOPS.map(([p, c]) => `${c} ${p}%`).join(", ")})`;
export const LOW_INK = "#5f4fb8";
export const HIGH_INK = "#99551a";

/** 눈금 위 그 자리의 색 */
export function colorAt(pct: number): string {
  const x = Math.max(0, Math.min(100, pct));
  let i = 0;
  while (i < STOPS.length - 2 && x > STOPS[i + 1][0]) i++;
  const [p0, c0] = STOPS[i];
  const [p1, c1] = STOPS[i + 1];
  const t = p1 === p0 ? 0 : (x - p0) / (p1 - p0);
  const mix = (a: string, b: string, k: number) =>
    Math.round(parseInt(a, 16) + (parseInt(b, 16) - parseInt(a, 16)) * k)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(c0.slice(1, 3), c1.slice(1, 3), t)}${mix(c0.slice(3, 5), c1.slice(3, 5), t)}${mix(c0.slice(5, 7), c1.slice(5, 7), t)}`;
}

export function Marker({ percent, size = 24 }: { percent: number; size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full ring-4"
      style={{
        width: size,
        height: size,
        background: "var(--ink)",
        ["--tw-ring-color" as string]: "var(--page)",
      }}
    >
      <span
        className="block rounded-full"
        style={{ width: size * 0.5, height: size * 0.5, background: colorAt(percent) }}
      />
    </span>
  );
}

function Line({ row }: { row: OverviewRow }) {
  const x = Math.max(0, Math.min(100, row.percent));
  return (
    <div className="grid grid-cols-[8rem_1fr_3rem] items-center gap-5 py-2.5">
      <span className="text-table font-medium">{row.scale}</span>
      <div className="relative h-6">
        <div
          className="absolute inset-y-2 left-0 right-0 rounded-full"
          style={{ background: GRADIENT }}
        />
        <div
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${x}%` }}
        >
          <Marker percent={row.percent} size={24} />
        </div>
      </div>
      <span className="tabular text-right font-medium">{Math.round(row.percent)}</span>
    </div>
  );
}

export function TraitOverview({ rows }: { rows: OverviewRow[] }) {
  const by = new Map(rows.map((r) => [r.scale, r]));
  const group = (names: string[]) =>
    names.map((n) => by.get(n)).filter((r): r is OverviewRow => Boolean(r));

  return (
    <div>
      <div className="grid grid-cols-[8rem_1fr_3rem] items-end gap-5 border-b border-[--border] pb-2">
        <span />
        <div className="flex justify-between font-medium">
          <span style={{ color: LOW_INK }}>낮음</span>
          <span style={{ color: HIGH_INK }}>높음</span>
        </div>
        <span />
      </div>

      <p className="text-axis text-ink-muted mt-5 mb-1">기질 — 타고난 부분</p>
      {group(TEMPERAMENT).map((r) => (
        <Line key={r.scale} row={r} />
      ))}

      <p className="text-axis text-ink-muted mt-6 mb-1">성격 — 살면서 형성된 부분</p>
      {group(CHARACTER).map((r) => (
        <Line key={r.scale} row={r} />
      ))}
    </div>
  );
}
