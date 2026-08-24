"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { TraitBars } from "@/components/charts/TraitBars";
import { TraitRadar } from "@/components/charts/TraitRadar";
import {
  AbilityStrip,
  AbilityStripHeader,
  TraitStrip,
  TraitStripHeader,
} from "@/components/analysis/TraitStrip";
import { CHARACTER, TEMPERAMENT, abilityColorAt } from "@/components/charts/scale";
import { QuickRead } from "@/components/analysis/QuickRead";
import { ABILITY_AXES } from "@/lib/items/types";
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
  agreement: number | null;
  fastCount: number | null;
  completedLabel: string | null;
  traits: Record<string, number> | null;
  abilities: Record<string, number> | null;
};

const FLAG = {
  review: { label: "검토", color: "var(--status-warn)" },
  // 「미달」이라고 쓰지 않는다 — 사람을 깎는 말로 읽힌다. 낮은 것은 응답의 값이다
  poor: { label: "낮음", color: "var(--status-critical)" },
} as const;

const STATUS = { COMPLETED: "완료", IN_PROGRESS: "진행 중" } as const;

export function EmployeeList({ rows }: { rows: Row[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    /*
      폭 배분이 이 표의 핵심이다.

      전에는 이름·번호·상태·성향이 전부 고정폭이고 **마지막 품질 칸이 남는 폭을
      전부 흡수**했다. 1920 화면에서 성향과 품질 사이가 1,000px 가까이 벌어져
      품질만 오른쪽 끝에 홀로 떠 있었다 — "전체화면이라 애매하다"의 정체.

      고치는 방향은 폭을 줄이는 게 아니다. 11 §1.4가 관리자 표는 `max-width` 없이
      전체 폭을 쓴다고 정해뒀다. 대신 **남는 폭을 데이터가 가져가게** 한다 —
      성향(42%)과 직무능력(18%)에 퍼센트를 주면 넓어질수록 두 스트립이 벌어져
      숫자 간격이 편해지고, 빈 칸이 생기지 않는다.
    */
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-axis text-ink-muted border-b border-[--border]">
            <th className="w-44 pb-2 text-left font-medium">이름</th>
            <th className="w-36 pb-2 text-left font-medium">번호</th>
            <th className="w-20 pb-2 text-left font-medium">상태</th>
            <th className="w-24 pb-2 text-left font-medium">신뢰도</th>
            <th className="w-16 pb-2 text-left font-medium">완료</th>
            <th className="w-[42%] pb-2 pl-4 text-left font-medium">
              <TraitStripHeader />
            </th>
            <th className="w-[18%] pb-2 pl-4 text-left font-medium">
              <AbilityStripHeader />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const expanded = openId === r.id;
            const canExpand = Boolean(r.traits);
            return (
              <Fragment key={r.id}>
                <tr
                  onClick={() => canExpand && setOpenId(expanded ? null : r.id)}
                  className={`border-b border-[--border] ${
                    canExpand ? "cursor-pointer hover:bg-[--wash]" : ""
                  } ${expanded ? "bg-[--wash]" : ""}`}
                >
                  <td className="py-2.5">
                    <span className="font-medium">{r.name}</span>
                    {canExpand && (
                      <span className="text-ink-muted text-axis ml-2">
                        {expanded ? "▾" : "▸"}
                      </span>
                    )}
                  </td>
                  <td className="text-axis tabular text-ink-secondary py-2.5">
                    {r.phone ? formatPhone(r.phone) : "—"}
                  </td>
                  <td className="text-axis text-ink-secondary py-2.5">
                    {r.status ? STATUS[r.status as keyof typeof STATUS] : "미응시"}
                  </td>
                  <td className="py-2.5">
                    <Quality
                      flag={r.flag}
                      agreement={r.agreement}
                      fastCount={r.fastCount}
                    />
                  </td>
                  <td className="text-axis tabular text-ink-muted py-2.5">
                    {r.completedLabel ?? "—"}
                  </td>
                  <td className="py-2.5 pl-4 whitespace-nowrap">
                    <TraitStrip traits={r.traits} />
                  </td>
                  <td className="py-2.5 pl-4 whitespace-nowrap">
                    <AbilityStrip abilities={r.abilities} />
                  </td>
                </tr>

                {expanded && r.traits && (
                  <tr className="border-b border-[--border]">
                    <td colSpan={7} className="bg-[--wash] px-4 py-6">
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

/**
 * 응답 품질 — 등급만 있던 것을 **숫자와 같이** 보여준다.
 *
 * 종전에는 `검토`·`미달` 두 글자뿐이라, 아무것도 안 적힌 사람들 사이에서
 * 누가 아슬아슬하고 누가 넉넉한지 구분되지 않았다. `ok` 안에서도 편차가 크다.
 *
 * 숫자는 **반대 문항 일치도**를 쓴다. 저장된 값 중 "이 응답을 믿을 수 있는가"에
 * 가장 곧바로 답하는 값이다 — 서로 반대인 문항에 같은 방향으로 답했는지를 잰다.
 * 100이면 짝마다 완전히 일관됐고, 무작위로 답하면 60 근처가 나온다.
 *
 * ⚠️ 등급은 일치도만으로 정해지지 않는다. **너무 빨리 넘긴 문항 비율**도 같이
 *    본다(00 §2.3). 그래서 일치도가 높은데 `미달`인 사람이 있을 수 있고,
 *    그 경우가 헷갈리지 않도록 속도 쪽이 걸린 것이면 따로 표시한다.
 */
function Quality({
  flag,
  agreement,
  fastCount,
}: {
  flag: string;
  agreement: number | null;
  fastCount: number | null;
}) {
  if (agreement === null) return <span className="text-ink-muted text-axis">—</span>;

  const pct = Math.round(agreement * 100);
  const meta = FLAG[flag as keyof typeof FLAG];
  // 일치도는 멀쩡한데 등급이 걸렸다면 속도 쪽이 원인이다
  const bySpeed = Boolean(meta) && agreement >= 0.7;

  return (
    <span
      className="flex items-baseline gap-1.5"
      title={
        `반대 문항 일치도 ${pct}점` +
        (fastCount !== null ? ` · 1.5초 안에 답한 문항 ${fastCount}개` : "") +
        (meta ? ` · ${meta.label}` : "")
      }
    >
      <span
        className="tabular text-table font-medium"
        style={{ color: meta ? meta.color : "var(--ink-secondary)" }}
      >
        {pct}
      </span>
      {meta && (
        <span className="text-axis" style={{ color: meta.color }}>
          {bySpeed ? "속도" : meta.label}
        </span>
      )}
    </span>
  );
}

/**
 * 펼침 패널.
 *
 * **세로로 짧게 두는 것이 이 패널의 제약이다.** 목록 한가운데를 밀어내며
 * 열리기 때문에, 키가 크면 앞뒤 줄이 화면 밖으로 밀려 "50명을 훑는다"는
 * 목록의 목적이 깨진다.
 *
 * 그래서 두 가지를 지킨다.
 *  1. **한 줄 3단**으로 늘어놓는다 — 레이더·막대·직무능력을 세로로 쌓지 않는다.
 *  2. **레이더에 상한을 둔다.** `aspectRatio`가 걸려 있어 폭이 곧 높이다.
 *     상한이 없으면 넓은 화면일수록 패널이 커진다 (1920에서 806px까지 갔다).
 */
function Panel({ row }: { row: Row }) {
  const traits = row.traits!;
  const ordered = [...TEMPERAMENT, ...CHARACTER]
    .filter((s) => typeof traits[s] === "number")
    .map((s) => ({ scale: s, percent: traits[s] }));
  // 순서를 고정한다 — Object.entries는 저장된 순서를 따라가서 사람마다 뒤바뀔 수 있다
  const abilities = ABILITY_AXES.filter(
    (a) => typeof row.abilities?.[a] === "number",
  ).map((a) => [a, row.abilities![a]] as const);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-section-title">{row.name}</h3>
        <Link
          href={`/admin/employees/${row.id}`}
          className="inline-flex h-13 items-center rounded-lg px-6 font-medium"
          style={{ background: "var(--series-1)", color: "#fff" }}
        >
          상세 보기 →
        </Link>
      </div>

      {/* 폭을 고정한다. 늘어나게 두면 막대가 화면 끝까지 퍼져서 읽기 나쁘다 */}
      <div className="flex flex-wrap items-start gap-10">
        <div className="w-full max-w-[23rem]">
          <TraitRadar data={ordered} showValues />
        </div>

        <div className="w-full max-w-[31rem]">
          <TraitBars rows={ordered} height={280} />
        </div>

        {abilities.length > 0 && (
          <div className="w-full max-w-[19rem]">
            <p className="text-table text-ink-secondary mb-3">직무능력</p>
            <ul className="flex flex-col gap-3">
              {abilities.map(([axis, v]) => (
                <li key={axis}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-table">{axis}</span>
                    <span className="tabular font-medium">{Math.round(v)}</span>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--grid)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, Math.min(100, v))}%`,
                        background: abilityColorAt(v),
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="w-full max-w-[23rem]">
          <QuickRead traits={traits} />
          <p className="text-axis text-ink-muted mt-4">
            사내 위치와 관련 성향 축은 상세 보기에 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
