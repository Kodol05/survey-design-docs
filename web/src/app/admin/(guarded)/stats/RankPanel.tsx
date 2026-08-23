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
        <p className="text-axis text-ink-muted mt-3 max-w-[34rem]">
          세부 항목 28개 × 능력 3개면 84개 상관입니다. 관계가 없어도 네댓 개는 우연히
          높게 나오므로 상위 {limit}개까지만 보여드립니다.
        </p>
      </section>

      <section>
        <h2 className="text-section-title mb-1">성향에서 능력 찾기</h2>
        <p className="text-ink-secondary mb-5">
          이 성향이 높은 사람들과 낮은 사람들의 직무능력을 견줍니다.
        </p>

        <Picker
          options={scales}
          picked={pickedScale}
          href={(v) => `/admin/stats?tab=rank&axis=${encodeURIComponent(pickedAxis)}&scale=${encodeURIComponent(v)}`}
        />

        {tercile.length === 0 ? (
          <p className="text-ink-muted mt-8">아직 나눠 볼 만큼 모이지 않았습니다.</p>
        ) : (
          <table className="text-table mt-6 w-full max-w-lg">
            <thead>
              <tr className="text-ink-secondary border-b border-[--border]">
                <th className="py-2 text-left font-medium">직무능력</th>
                <th className="py-2 text-right font-medium">
                  {pickedScale} 낮은 쪽
                </th>
                <th className="py-2 text-right font-medium">높은 쪽</th>
                <th className="py-2 text-right font-medium">차이</th>
              </tr>
            </thead>
            <tbody>
              {tercile.map((t) => (
                <tr key={t.axis} className="border-b border-[--border] last:border-0">
                  <th scope="row" className="py-2.5 text-left font-normal">
                    {t.axis}
                  </th>
                  <td className="tabular py-2.5 text-right">{Math.round(t.lower)}</td>
                  <td className="tabular py-2.5 text-right">{Math.round(t.upper)}</td>
                  <td
                    className="tabular py-2.5 text-right font-medium"
                    style={{
                      color:
                        Math.abs(t.diff) < 3 ? "var(--ink-muted)" : "var(--ink)",
                    }}
                  >
                    {t.diff >= 0 ? "+" : "−"}
                    {Math.abs(Math.round(t.diff))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tercile.length > 0 && (
          <p className="text-axis text-ink-muted mt-4 max-w-[34rem]">
            각 무리가 {tercile[0].upperN}명씩입니다. 사람이 적어 차이를 확정으로 읽으면
            안 됩니다. 몇 점 차이는 우연히도 나옵니다.
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
