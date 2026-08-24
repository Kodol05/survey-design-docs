"use client";

import { useState } from "react";
import Link from "next/link";
import type { PersonQuality } from "@/lib/admin/analysis";
import { QUALITY } from "@/lib/scoring/quality";

/**
 * 사람별 응답 품질 — **문항 품질(α)과는 다른 이야기다.**
 *
 * α는 「문항이 잘 만들어졌는가」, 이쪽은 「이 사람 답을 믿을 수 있는가」.
 * 척도 α가 아무리 높아도 서둘러 넘긴 응답의 값은 쓰기 어렵다. 두 가지를 같은
 * 화면에 두되 절을 나눠 둔다.
 *
 * 잣대는 **반대 문항 일치도**다. 서로 반대인 문항에 같은 방향으로 답했는지를
 * 재는데, 무작위로 답하면 .60 근처가 나온다 (모의로 확인, 00 §2.3).
 */

const BAR = { low: 50, high: 100 };

/** 55~100을 0~100%로 편다. 0부터 그리면 모든 막대가 오른쪽 끝에 몰린다 */
const widthOf = (a: number) =>
  Math.max(2, Math.min(100, ((a * 100 - BAR.low) / (BAR.high - BAR.low)) * 100));

const toneOf = (a: number) =>
  a >= QUALITY.agreementReview
    ? "var(--series-1)"
    : a >= QUALITY.agreementPoor
      ? "var(--status-warn)"
      : "var(--status-critical)";

/*
  이름을 어떻게 붙일지가 이 화면에서 제일 조심스러운 부분이다.

  「걸린 사람」이라고 썼다가 고쳤다. 잘못한 사람을 잡아냈다는 말로 읽힌다.
  여기서 낮게 나온 것은 **그 사람이 아니라 그 응답**이다 — 서둘러 넘겼거나
  문항을 반대로 읽었을 수도 있다. 그래서 사람을 가리키는 말 대신
  「신뢰도 위험」처럼 값을 가리키는 말을 쓴다.

  같은 이유로 「미달」·「성실」 같은 낱말도 화면에서 뺐다.
*/

/** 오른쪽 칸 — 위험 표시가 붙은 사람만 짧게 */
export function LowQualityList({ rows }: { rows: PersonQuality[] }) {
  const flagged = rows.filter((r) => r.flag !== "ok");

  if (flagged.length === 0)
    return (
      <div>
        <h3 className="text-section-title mb-1">신뢰도 위험</h3>
        <p className="text-ink-secondary">
          없습니다. 응답이 전부 기준 안에 들어옵니다.
        </p>
      </div>
    );

  return (
    <div>
      <h3 className="text-section-title mb-1">신뢰도 위험</h3>
      <p className="text-axis text-ink-muted mb-5">
        {flagged.length}명 · 분석에서 뺄지 정하실 수 있습니다
      </p>

      <ul className="flex flex-col">
        {flagged.map((r) => {
          const bySpeed = r.agreement !== null && r.agreement >= QUALITY.agreementReview;
          return (
            <li
              key={r.employeeId}
              className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-[--border] py-3 last:border-0"
            >
              <Link href={`/admin/employees/${r.employeeId}`} className="text-table underline">
                {r.name}
              </Link>
              <span className="text-axis tabular text-right">
                <span className="font-medium" style={{ color: toneOf(r.agreement ?? 0) }}>
                  {r.agreement === null ? "—" : Math.round(r.agreement * 100)}
                </span>
              </span>
              <span className="text-axis text-ink-muted col-span-2 leading-snug">
                {bySpeed
                  ? `일치도는 괜찮지만 ${r.fastCount ?? 0}문항을 1.5초 안에 넘겼습니다`
                  : `반대 문항에 서로 어긋나게 답한 곳이 많습니다`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 처음에 보여줄 인원. 37명을 다 늘어놓으면 화면 두 개를 넘어간다 */
const HEAD = 8;

/**
 * 아래 절 — 사람별 순위.
 *
 * **전원을 펼쳐 두지 않는다.** 이 목록에서 실제로 볼 일이 있는 것은 양 끝이다.
 * 낮은 쪽 몇 명은 값을 쓸지 정해야 하고, 높은 쪽 몇 명은 기준선이 된다.
 * 가운데 스무 명은 스크롤만 잡아먹는다.
 */
export function QualityRanking({ rows }: { rows: PersonQuality[] }) {
  const [all, setAll] = useState(false);

  if (rows.length === 0)
    return <p className="text-ink-muted">아직 응시를 끝낸 사람이 없습니다.</p>;

  const scored = rows.filter((r) => r.agreement !== null);
  const mean = scored.length
    ? scored.reduce((n, r) => n + (r.agreement ?? 0), 0) / scored.length
    : null;

  // rows는 낮은 순으로 들어온다. 화면에는 높은 쪽부터 세운다
  const high = [...rows].reverse();
  const hidden = high.length - HEAD * 2;
  const shown = all || hidden <= 0
    ? high.map((r, i) => ({ r, rank: i + 1, gap: false }))
    : [
        ...high.slice(0, HEAD).map((r, i) => ({ r, rank: i + 1, gap: false })),
        ...high.slice(-HEAD).map((r, i) => ({
          r,
          rank: high.length - HEAD + i + 1,
          gap: i === 0,
        })),
      ];

  return (
    <div>
      <p className="text-ink-secondary mb-6">
        {mean !== null && (
          <>
            평균 <strong className="tabular">{Math.round(mean * 100)}</strong>점.{" "}
          </>
        )}
        위가 앞뒤가 맞게 답한 쪽입니다.
      </p>

      <ul className="flex flex-col">
        {shown.map(({ r, rank, gap }) => (
          <li key={r.employeeId}>
            {gap && (
              <p className="text-axis text-ink-muted border-t border-[--border] py-2 text-center">
                가운데 {hidden}명 접힘 ·{" "}
                <button type="button" onClick={() => setAll(true)} className="underline">
                  전부 보기
                </button>
              </p>
            )}
            <div className="grid grid-cols-[2.5rem_9rem_1fr_3.5rem] items-center gap-4 border-b border-[--border] py-2">
              <span className="tabular text-axis text-ink-muted text-right">{rank}</span>
              <Link
                href={`/admin/employees/${r.employeeId}`}
                className="text-axis truncate"
              >
                {r.name}
              </Link>
              <span className="h-2 rounded-full" style={{ background: "var(--grid)" }}>
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${r.agreement === null ? 0 : widthOf(r.agreement)}%`,
                    background: toneOf(r.agreement ?? 0),
                  }}
                />
              </span>
              <span className="tabular text-axis text-right font-medium">
                {r.agreement === null ? "—" : Math.round(r.agreement * 100)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {all && hidden > 0 && (
        <p className="text-axis text-ink-muted mt-3 text-center">
          <button type="button" onClick={() => setAll(false)} className="underline">
            가운데 접기
          </button>
        </p>
      )}
    </div>
  );
}
