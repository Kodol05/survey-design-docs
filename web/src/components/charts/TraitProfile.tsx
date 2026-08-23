/**
 * 성향 프로필 — TCI 결과지 형식
 *
 * 축마다 상자를 따로 두지 않는다. **하나의 눈금 위에 일곱 축을 얹어**
 * 어느 축이 튀는지 세로로 훑어보게 한다. 상자를 나누면 축끼리 비교가 안 된다.
 *
 * 기질과 성격을 나눠 보여준다. 08의 첫 문장이 "타고난 기질과 살면서 형성된
 * 성격을 나눠 재고"이므로 화면에서도 갈라져 있어야 한다.
 *
 * 눈금은 **범위 대비 %**다. 전 문항 최저가 0, 중립이 50, 최고가 100이다.
 * 백분위가 아니다 — 사내 상대위치는 개인 화면에 표시하지 않는다 (00 D-09).
 */

import { BAND } from "@/lib/scoring/score";

export type ProfileRow = {
  scale: string;
  percent: number;
  band: "lower" | "middle" | "upper";
};

/** 기질(타고난 것) 4축 · 성격(형성된 것) 3축 — 00 §2.9 */
export const TEMPERAMENT = ["자극추구", "위험회피", "사회적민감성", "인내력"];
export const CHARACTER = ["자율성", "연대감", "자기초월"];

const BAND_LABEL = { lower: "낮은 편", middle: "보통", upper: "높은 편" } as const;

function Row({ row }: { row: ProfileRow }) {
  const x = Math.max(0, Math.min(100, row.percent));
  return (
    <div className="grid grid-cols-[7.5rem_1fr_5.5rem] items-center gap-4 py-3">
      <span className="text-table font-medium">{row.scale}</span>

      <div className="relative h-9">
        {/* 눈금 배경 — 구간 경계를 옅게 깔아 어디가 보통인지 보이게 한다 (D-26) */}
        <div className="absolute inset-y-3 left-0 right-0 flex overflow-hidden rounded-full">
          <div style={{ width: `${BAND.lower}%`, background: "var(--grid)" }} />
          <div
            style={{
              width: `${BAND.upper - BAND.lower}%`,
              background: "var(--diverge-mid)",
            }}
          />
          <div style={{ width: `${100 - BAND.upper}%`, background: "var(--grid)" }} />
        </div>

        {/* 값 표시 */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${x}%` }}
        >
          <span
            className="block size-5 rounded-full ring-4"
            style={{
              background: "var(--series-1)",
              ["--tw-ring-color" as string]: "var(--surface)",
            }}
          />
        </div>
      </div>

      <span className="text-table tabular text-right">
        {Math.round(row.percent)}
        <span className="text-ink-muted ml-2 text-axis">{BAND_LABEL[row.band]}</span>
      </span>
    </div>
  );
}

export function TraitProfile({ rows }: { rows: ProfileRow[] }) {
  const byScale = new Map(rows.map((r) => [r.scale, r]));
  const group = (names: string[]) =>
    names.map((n) => byScale.get(n)).filter((r): r is ProfileRow => Boolean(r));

  return (
    <div>
      {/* 눈금 머리 — 한 번만 둔다. 축마다 반복하면 화면이 시끄러워진다 */}
      <div className="grid grid-cols-[7.5rem_1fr_5.5rem] items-end gap-4 border-b border-[--border] pb-2">
        <span className="text-axis text-ink-muted">성향 축</span>
        <div className="text-axis text-ink-muted relative flex justify-between">
          <span>낮음</span>
          <span>보통</span>
          <span>높음</span>
        </div>
        <span className="text-axis text-ink-muted text-right">점수</span>
      </div>

      <section>
        <h3 className="text-table text-ink-secondary mt-6 mb-1 font-medium">
          기질 <span className="text-ink-muted font-normal">— 타고난 부분</span>
        </h3>
        <div className="divide-y divide-[--border]">
          {group(TEMPERAMENT).map((r) => (
            <Row key={r.scale} row={r} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-table text-ink-secondary mt-8 mb-1 font-medium">
          성격 <span className="text-ink-muted font-normal">— 살면서 형성된 부분</span>
        </h3>
        <div className="divide-y divide-[--border]">
          {group(CHARACTER).map((r) => (
            <Row key={r.scale} row={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
