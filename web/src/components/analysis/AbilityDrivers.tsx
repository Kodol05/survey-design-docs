import { formatR } from "./correlationColor";
import { gradeOf } from "./correlationWords";
import { AlphaNote } from "./AlphaNote";
import { DivergingBar } from "./DivergingBar";
import type { RankRow, ScaleReliability } from "@/lib/admin/analysis";

/**
 * 능력 하나가 **무엇과 관련이 깊은지** 가로로 늘어놓는다 (2026-08-25 사용자 요청).
 *
 * ## 「순위」 탭을 여기로 옮겼다
 *
 * 전에는 별도 탭에서 능력을 하나 골라야 봤다. 그런데 이건 **표가 말하는 것을
 * 더 잘게 쪼갠 이야기**라 표 바로 아래가 제자리다. 셋을 한 화면에 세로로
 * 쌓으면 「협력은 이것, 조직생활은 저것」이 한눈에 견줘진다 — 고르고 다시
 * 고르는 수고도 없어진다.
 *
 * ## 축이 아니라 세부 항목으로
 *
 * 위 표가 이미 축 일곱 개를 보여준다. 여기서 같은 것을 다시 늘어놓으면
 * 새로 아는 것이 없다. **세부 항목**으로 쪼개야 「인내력 전체가 아니라 그
 * 안의 끈기」 같은 것이 나온다.
 *
 * ⚠️ 세부 항목 28개 × 능력 3개면 84개 상관이다. 관계가 없어도 네댓 개는
 *    우연히 높게 나오므로 **상위 몇 개에서 자른다** (11 §3.4).
 */

/** 능력마다 몇 개까지 보여줄지. 화면 폭이 아니라 다중비교가 정하는 수다 */
const TOP = 6;

export function AbilityDrivers({
  axes,
  reliability,
}: {
  /** 능력 이름 → 세부 항목별 상관 (큰 순으로 정렬돼 있어야 한다) */
  axes: { axis: string; rows: RankRow[] }[];
  reliability: Record<string, ScaleReliability>;
}) {
  return (
    <div className="flex flex-col gap-10">
      {axes.map(({ axis, rows }) => (
        <div key={axis}>
          <p className="mb-3 flex flex-wrap items-baseline gap-x-3 border-b border-[--border] pb-2">
            <span className="text-section-title">{axis}</span>
            <AlphaNote r={reliability[axis]} className="!mt-0 !inline" />
          </p>

          {rows.length === 0 ? (
            <p className="text-ink-muted text-axis">
              쪼개 볼 세부 항목이 없습니다.
            </p>
          ) : (
            /*
              **가로로 늘어놓는다.** 관련이 큰 것부터 왼쪽에 두고, 좁은
              화면에서는 옆으로 밀어 볼 수 있게 한다 — 줄을 바꿔 쌓으면
              「몇 번째로 큰가」가 눈으로 안 읽힌다.
            */
            <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {rows.slice(0, TOP).map((r, i) => (
                <Card key={r.label} rank={i + 1} row={r} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function Card({ rank, row }: { rank: number; row: RankRow }) {
  const settled = !(row.corr.ci[0] <= 0 && row.corr.ci[1] >= 0);
  return (
    <li
      className="w-[15rem] shrink-0 rounded-xl px-4 py-3"
      style={{ background: "var(--wash)" }}
      title={`${row.scale} · ${row.label} — ${formatR(row.corr.r)} (${row.corr.n}명, ${formatR(row.corr.ci[0])}~${formatR(row.corr.ci[1])})`}
    >
      <p className="text-axis text-ink-muted mb-0.5 flex items-baseline gap-1.5">
        <span className="tabular">{rank}</span>
        <span className="truncate">{row.scale}</span>
      </p>
      {/*
        세부 항목 이름은 「불확실성에 대한 두려움」처럼 길다. 한 줄로 자르면
        무엇인지 알 수 없으므로 **두 줄까지** 준다. 카드 폭이 고정이라
        두 줄 자리를 늘 비워 두면 카드 키가 서로 어긋나지 않는다.
      */}
      <p className="text-table mb-2 line-clamp-2 min-h-[2.6em] leading-snug font-medium">
        {row.label}
      </p>
      <DivergingBar r={row.corr.r} faded={!settled} height={12} />
      <p className="text-axis mt-1.5 flex items-baseline justify-between">
        <span className="tabular font-medium">{formatR(row.corr.r)}</span>
        <span
          className="text-ink-secondary"
          style={{ opacity: settled ? 1 : 0.6 }}
        >
          {gradeOf(row.corr.r)}
          {!settled && <span aria-hidden>?</span>}
        </span>
      </p>
    </li>
  );
}
