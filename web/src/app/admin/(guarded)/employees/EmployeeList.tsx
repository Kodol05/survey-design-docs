"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { TraitBars } from "@/components/charts/TraitBars";
import { TraitRadar } from "@/components/charts/TraitRadar";
import { TraitStrip, TraitStripHeader } from "@/components/analysis/TraitStrip";
import { CHARACTER, TEMPERAMENT } from "@/components/charts/scale";
import { formatPhone } from "@/lib/auth/phone";

/**
 * 구성원 목록.
 *
 * **줄을 누르면 그 자리에서 펼쳐진다.** 상세 화면으로 넘어가지 않아도 다각형
 * 그래프와 세로 막대로 모양을 볼 수 있다. 50명을 훑을 때 한 명 볼 때마다
 * 화면을 오가면 흐름이 끊긴다. 더 자세한 것은 상세 화면에서 본다.
 */

export type Row = {
  id: string;
  name: string;
  phone: string | null;
  status: string | null;
  flag: string;
  traits: Record<string, number> | null;
  abilities: Record<string, number> | null;
};

const FLAG = {
  review: { label: "검토", color: "var(--status-warn)" },
  poor: { label: "미달", color: "var(--status-critical)" },
} as const;

const STATUS = { COMPLETED: "완료", IN_PROGRESS: "진행 중" } as const;

export function EmployeeList({ rows, open }: { rows: Row[]; open: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-axis text-ink-muted border-b border-[--border]">
            <th className="w-44 pb-2 text-left font-medium">이름</th>
            <th className="w-28 pb-2 text-left font-medium">번호</th>
            <th className="w-20 pb-2 text-left font-medium">상태</th>
            <th className="min-w-[22rem] pb-2 text-left font-medium">
              {open ? <TraitStripHeader /> : "성향"}
            </th>
            <th className="w-16 pb-2 text-left font-medium">품질</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flag = FLAG[r.flag as keyof typeof FLAG];
            const expanded = openId === r.id;
            const canExpand = open && Boolean(r.traits);
            return (
              <Fragment key={r.id}>
                <tr
                  onClick={() => canExpand && setOpenId(expanded ? null : r.id)}
                  className={`border-b border-[--border] ${
                    canExpand ? "cursor-pointer hover:bg-[--wash]" : ""
                  } ${expanded ? "bg-[--wash]" : ""}`}
                >
                  <td className="py-3">
                    <span className="font-medium">{r.name}</span>
                    {canExpand && (
                      <span className="text-ink-muted text-axis ml-2">
                        {expanded ? "▾" : "▸"}
                      </span>
                    )}
                  </td>
                  <td className="text-axis tabular text-ink-secondary py-3">
                    {r.phone ? formatPhone(r.phone) : "—"}
                  </td>
                  <td className="text-axis text-ink-secondary py-3">
                    {r.status ? STATUS[r.status as keyof typeof STATUS] : "미응시"}
                  </td>
                  <td className="py-3 pr-6">
                    {open ? (
                      <TraitStrip traits={r.traits} />
                    ) : (
                      <span className="text-axis text-ink-muted">공개 전</span>
                    )}
                  </td>
                  <td className="text-axis py-3" style={{ color: flag?.color }}>
                    {flag?.label ?? ""}
                  </td>
                </tr>

                {expanded && r.traits && (
                  <tr className="border-b border-[--border]">
                    <td colSpan={5} className="bg-[--wash] px-4 py-8">
                      <Panel row={r} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Panel({ row }: { row: Row }) {
  const traits = row.traits!;
  const ordered = [...TEMPERAMENT, ...CHARACTER]
    .filter((s) => typeof traits[s] === "number")
    .map((s) => ({ scale: s, percent: traits[s] }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <h3 className="text-section-title">{row.name}</h3>
        <Link
          href={`/admin/employees/${row.id}`}
          className="text-table text-ink-secondary underline"
        >
          상세 보기 — 하위척도 · 응답 품질 · 관련 성향 축
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <TraitRadar data={ordered} showValues />
        <TraitBars rows={ordered} />
      </div>

      {row.abilities && Object.keys(row.abilities).length > 0 && (
        <div className="mt-8 border-t border-[--border] pt-5">
          <p className="text-table text-ink-secondary mb-3">직무능력</p>
          <dl className="flex flex-wrap gap-x-10 gap-y-2">
            {Object.entries(row.abilities).map(([axis, v]) => (
              <div key={axis} className="flex items-baseline gap-2">
                <dt className="text-ink-secondary">{axis}</dt>
                <dd className="tabular text-lg font-medium">{Math.round(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
