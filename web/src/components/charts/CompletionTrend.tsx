import type { CompletionPoint } from "@/lib/admin/summary";

/**
 * 날짜별 누적 완료 — 응시가 언제 몰렸고 지금 멈춰 있는지.
 *
 * **평평한 구간이 이 차트의 요점이다.** 계단처럼 올라가다 멈춘 자리가
 * 독려가 필요했던 기간이고, 끝이 평평하면 지금 멈춰 있다는 뜻이다.
 * 그래서 응답이 없는 날도 x축에 자리를 준다 (`loadCompletionByDate`).
 *
 * 차트 규칙 (11 §3) — 선 2px, 격자 흐리게, 값 라벨은 골라서.
 * 계열이 하나뿐이라 범례를 두지 않는다.
 */

const W = 620;
const H = 176;
const PAD = { l: 4, r: 52, t: 18, b: 26 };

const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

/** "2026-08-01" → "8/1" */
function short(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function CompletionTrend({ points }: { points: CompletionPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="text-ink-muted text-table py-8">
        아직 완료된 응답이 없습니다. 첫 응시가 들어오면 여기에 쌓이는 모양이 나옵니다.
      </p>
    );
  }

  const n = points.length;
  const top = points[n - 1].cumulative;
  const max = Math.max(1, top);

  // 하루치뿐이면 그릴 선이 없다. 점 하나를 찍어두면 고장난 것처럼 보이므로
  // 숫자로 말하고 왜 선이 없는지 적는다. 데모 데이터가 이 상태다.
  if (n === 1) {
    return (
      <div className="py-6">
        <p className="tabular text-5xl font-semibold">{top}</p>
        <p className="text-axis text-ink-muted mt-2">
          {short(points[0].date)} 하루에 몰려 있어 아직 흐름이 그려지지 않습니다. 응시가
          이틀 이상으로 나뉘면 선이 나타납니다.
        </p>
      </div>
    );
  }

  const x = (i: number) => PAD.l + (n === 1 ? plotW : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.cumulative)}`).join("");
  const area = `${line}L${x(n - 1)},${PAD.t + plotH}L${x(0)},${PAD.t + plotH}Z`;

  // 격자 — 0과 꼭대기, 그리고 가운데 하나. 눈금이 촘촘하면 선이 안 읽힌다.
  const ticks = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);

  // x 라벨 — 처음·가운데·끝 셋. 날짜가 겹치면 읽히지 않는다.
  const labelIdx = n <= 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`${short(points[0].date)}부터 ${short(points[n - 1].date)}까지 누적 완료 ${top}명`}
      >
        {ticks.map((v) => (
          <line
            key={v}
            x1={PAD.l}
            x2={PAD.l + plotW}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--grid)"
            strokeWidth={1}
          />
        ))}

        <path d={area} fill="var(--series-1)" opacity={0.12} />
        <path
          d={line}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* 끝점만 찍는다 — 전부 찍으면 선이 사라진다. 점은 8px 이상 (11 §3) */}
        <circle cx={x(n - 1)} cy={y(top)} r={4.5} fill="var(--series-1)" />
        <text
          x={x(n - 1) + 12}
          y={y(top) + 5}
          fill="var(--ink)"
          fontSize={22}
          fontWeight={600}
          className="tabular"
        >
          {top}
        </text>

        {labelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 6}
            fill="var(--ink-muted)"
            fontSize={18}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
          >
            {short(points[i].date)}
          </text>
        ))}
      </svg>
    </figure>
  );
}
