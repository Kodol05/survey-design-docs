import Link from "next/link";
import type { PersonQuality } from "@/lib/admin/analysis";
import { QUALITY } from "@/lib/scoring/quality";

/**
 * 사람별 응답 품질 — **문항 품질(α)과는 다른 이야기다.**
 *
 * α는 「문항이 잘 만들어졌는가」, 이쪽은 「이 사람 답을 믿을 수 있는가」.
 * 척도 α가 아무리 높아도 대충 찍은 사람의 값은 못 쓴다. 두 가지를 같은
 * 화면에 두되 절을 나눠 둔다.
 *
 * 잣대는 **반대 문항 일치도**다. 서로 반대인 문항에 같은 방향으로 답했는지를
 * 재는데, 무작위로 찍으면 .60 근처가 나온다 (모의로 확인, 00 §2.3).
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

/** 오른쪽 칸 — 걸린 사람만 짧게 */
export function LowQualityList({ rows }: { rows: PersonQuality[] }) {
  const flagged = rows.filter((r) => r.flag !== "ok");

  if (flagged.length === 0)
    return (
      <div>
        <h3 className="text-section-title mb-1">걸린 사람</h3>
        <p className="text-ink-secondary">
          없습니다. 응답이 전부 기준 안에 들어옵니다.
        </p>
      </div>
    );

  return (
    <div>
      <h3 className="text-section-title mb-1">걸린 사람</h3>
      <p className="text-axis text-ink-muted mb-5">
        {flagged.length}명 · 이 사람들을 상관에서 뺄지 정하실 수 있습니다
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

/** 아래 절 — 전원 순위 */
export function QualityRanking({ rows }: { rows: PersonQuality[] }) {
  if (rows.length === 0)
    return <p className="text-ink-muted">아직 응시를 끝낸 사람이 없습니다.</p>;

  const scored = rows.filter((r) => r.agreement !== null);
  const mean =
    scored.length
      ? scored.reduce((n, r) => n + (r.agreement ?? 0), 0) / scored.length
      : null;

  return (
    <div>
      <p className="text-ink-secondary mb-6">
        {mean !== null && (
          <>
            평균 <strong className="tabular">{Math.round(mean * 100)}</strong>점.{" "}
          </>
        )}
        아래로 갈수록 성실하게 답한 쪽입니다.
      </p>

      <ul className="flex flex-col">
        {[...rows].reverse().map((r, i) => (
          <li
            key={r.employeeId}
            className="grid grid-cols-[2.5rem_10rem_1fr_4rem] items-center gap-4 border-b border-[--border] py-2.5 last:border-0"
          >
            <span className="tabular text-axis text-ink-muted text-right">{i + 1}</span>
            <Link href={`/admin/employees/${r.employeeId}`} className="text-table truncate">
              {r.name}
            </Link>
            <span className="h-2.5 rounded-full" style={{ background: "var(--grid)" }}>
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${r.agreement === null ? 0 : widthOf(r.agreement)}%`,
                  background: toneOf(r.agreement ?? 0),
                }}
              />
            </span>
            <span className="tabular text-table text-right font-medium">
              {r.agreement === null ? "—" : Math.round(r.agreement * 100)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
