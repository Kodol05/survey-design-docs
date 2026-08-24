"use client";

import Link from "next/link";
import { RankBars, type RankItem } from "@/components/analysis/RankBars";
import { WarningBadge } from "@/components/ui/WarningBadge";
import type { TercileCompare } from "@/lib/admin/analysis";

/**
 * 양방향 순위 화면.
 *
 *  · 능력을 고르면 → 관련 큰 세부 항목 순서대로 (상위 8개)
 *  · 성향을 고르면 → 그 축 상위 1/3과 하위 1/3의 직무능력 비교
 *
 * 뒤쪽이 실제로 배치나 채용을 검토할 때 쓰는 방향이다.
 */
export function RankPanel({
  abilities,
  scales,
  pickedAxis,
  pickedScale,
  limit,
  items,
  tercile,
}: {
  abilities: string[];
  scales: string[];
  pickedAxis: string;
  pickedScale: string;
  limit: number;
  items: RankItem[];
  tercile: TercileCompare[];
}) {
  return (
    <div className="grid gap-14 xl:grid-cols-2">
      <section>
        <h2 className="text-section-title mb-1">능력에서 성향 찾기</h2>
        <p className="text-ink-secondary mb-5">
          이 능력과 관련이 큰 세부 항목을 순서대로 봅니다.
        </p>

        <Picker
          options={abilities}
          picked={pickedAxis}
          href={(v) => `/admin/stats?tab=rank&axis=${encodeURIComponent(v)}&scale=${encodeURIComponent(pickedScale)}`}
        />

        <div className="mt-6">
          <RankBars items={items} />
        </div>

        <div className="mt-6">
          <WarningBadge kind="multipleComparison" />
        </div>
        <p className="text-axis text-ink-muted mt-3 max-w-[42rem]">
          세부 항목 28개 × 능력 3개면 84개 상관입니다. 관계가 없어도 네댓 개는 우연히
          높게 나오므로 상위 {limit}개까지만 보여드립니다.
        </p>
      </section>

      <section>
        <h2 className="text-section-title mb-1">성향에서 능력 찾기</h2>
        <p className="text-ink-secondary mb-5">
          이 성향 <strong>상위 3분의 1</strong>과 <strong>하위 3분의 1</strong>의 직무능력
          평균이 얼마나 벌어지는지 봅니다.
        </p>

        <Picker
          options={scales}
          picked={pickedScale}
          href={(v) => `/admin/stats?tab=rank&axis=${encodeURIComponent(pickedAxis)}&scale=${encodeURIComponent(v)}`}
        />

        {tercile.length === 0 ? (
          <p className="text-ink-muted mt-8">아직 나눠 볼 만큼 모이지 않았습니다.</p>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            {tercile.map((t) => (
              <TercileRow key={t.axis} row={t} scale={pickedScale} />
            ))}
          </div>
        )}

        {tercile.length > 0 && (
          <p className="text-axis text-ink-muted mt-8 max-w-[42rem]">
            각 무리가 {tercile[0].upperN}명씩입니다. <strong>차이만 보면 안 됩니다</strong> —
            12명씩이면 관계가 없어도 10점 안팎은 그냥 나옵니다. 아래 구간이 0을
            지나가면 방향조차 확정된 것이 아닙니다.
          </p>
        )}
      </section>
    </div>
  );
}

function Picker({
  options,
  picked,
  href,
}: {
  options: string[];
  picked: string;
  href: (v: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Link
          key={o}
          href={href(o)}
          className="text-table rounded-lg px-3 py-1.5"
          style={{
            background: o === picked ? "var(--ink)" : "var(--wash)",
            color: o === picked ? "var(--page)" : "var(--ink-secondary)",
            fontWeight: o === picked ? 600 : 400,
          }}
        >
          {o}
        </Link>
      ))}
    </div>
  );
}

/** 눈금을 0~100 전부 쓰지 않는다. 직무능력 값이 30~75에 몰려 있어 다 그리면 붙는다 */
const AXIS = { from: 25, to: 80 };
const posOf = (v: number) =>
  ((Math.max(AXIS.from, Math.min(AXIS.to, v)) - AXIS.from) / (AXIS.to - AXIS.from)) * 100;

/**
 * 한 직무능력 축의 두 무리 비교.
 *
 * **점 두 개와 그 사이를 잇는 선**으로 그린다. 표에 숫자만 늘어놓으면
 * "62와 48"이 붙어 있는 건지 벌어진 건지 감이 안 온다. 같은 자 위에
 * 올려두면 벌어진 정도가 바로 보인다.
 *
 * 아래에는 **차이의 신뢰구간**을 따로 그린다. 이게 0을 지나가면 위에서
 * 벌어져 보이는 것이 우연일 수 있다는 뜻이다.
 */
function TercileRow({ row, scale }: { row: TercileCompare; scale: string }) {
  const st = row.stat;
  const lo = posOf(row.lower);
  const hi = posOf(row.upper);
  const [from, to] = [Math.min(lo, hi), Math.max(lo, hi)];
  const solid = st ? !(st.ci[0] <= 0 && st.ci[1] >= 0) : false;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="text-table font-medium">{row.axis}</h3>
        <span className="text-axis tabular text-ink-secondary">
          차이{" "}
          <strong className="text-table" style={{ color: solid ? "var(--ink)" : "var(--ink-muted)" }}>
            {row.diff >= 0 ? "+" : "−"}
            {Math.abs(row.diff).toFixed(1)}
          </strong>
          {st && (
            <>
              <span className="text-ink-muted ml-3">
                95% 구간 {st.ci[0] >= 0 ? "+" : "−"}
                {Math.abs(st.ci[0]).toFixed(1)} ~ {st.ci[1] >= 0 ? "+" : "−"}
                {Math.abs(st.ci[1]).toFixed(1)}
              </span>
              <span className="text-ink-muted ml-3" title="퍼진 정도로 나눈 차이. 눈금이 달라도 크기를 견줄 수 있습니다">
                d {Math.abs(st.d).toFixed(2)}
              </span>
            </>
          )}
        </span>
      </div>

      {/* 두 무리를 같은 자 위에 */}
      <div className="relative h-8">
        <div
          className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
          style={{ background: "var(--grid)" }}
        />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{
            left: `${from}%`,
            width: `${to - from}%`,
            background: solid ? "var(--ink-secondary)" : "var(--grid)",
          }}
        />
        <Dot at={lo} label={`${scale} 낮은 쪽`} value={row.lower} tone="var(--series-2)" />
        <Dot at={hi} label={`${scale} 높은 쪽`} value={row.upper} tone="var(--series-1)" />
      </div>

      {/* 차이의 신뢰구간 — 0을 지나가는지가 핵심 */}
      {st && <DiffBar ci={st.ci} diff={row.diff} />}
    </div>
  );
}

function Dot({
  at,
  label,
  value,
  tone,
}: {
  at: number;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <span
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${at}%` }}
      title={`${label} 평균 ${value.toFixed(1)}`}
    >
      <span className="block size-4 rounded-full" style={{ background: tone, outline: "2px solid var(--page)" }} />
      <span className="text-axis tabular text-ink-muted absolute top-full left-1/2 mt-1 -translate-x-1/2">
        {Math.round(value)}
      </span>
    </span>
  );
}

/** 차이의 신뢰구간. 0 선을 지나가면 방향이 확정된 것이 아니다 */
function DiffBar({ ci, diff }: { ci: [number, number]; diff: number }) {
  const SPAN = 30; // −30 ~ +30점
  const at = (v: number) => ((Math.max(-SPAN, Math.min(SPAN, v)) + SPAN) / (SPAN * 2)) * 100;
  const crosses = ci[0] <= 0 && ci[1] >= 0;

  return (
    <div className="mt-7">
      <div className="relative h-5">
        <div
          className="absolute inset-y-0 left-1/2 w-px"
          style={{ background: "var(--axis)" }}
        />
        <div
          className="absolute inset-y-1.5 rounded-full"
          style={{
            left: `${at(ci[0])}%`,
            width: `${at(ci[1]) - at(ci[0])}%`,
            background: crosses ? "var(--grid)" : "var(--series-1)",
            opacity: crosses ? 1 : 0.5,
          }}
        />
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${at(diff)}%`, background: crosses ? "var(--ink-muted)" : "var(--series-1)" }}
        />
      </div>
      <p className="text-axis text-ink-muted mt-1">
        {crosses ? (
          <>구간이 <strong>0을 지나갑니다</strong> — 이 차이는 우연일 수 있습니다</>
        ) : (
          <>구간이 0을 벗어납니다 — 방향은 확정입니다</>
        )}
      </p>
    </div>
  );
}
