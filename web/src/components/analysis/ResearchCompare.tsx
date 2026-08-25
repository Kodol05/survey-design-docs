import { formatR } from "./correlationColor";
import { DivergingBar } from "./DivergingBar";
import type { CompareSummary } from "@/lib/admin/researchCompare";

/**
 * **논문 값과 우리 값을 막대 두 개로 나란히** (2026-08-25 사용자 요청).
 *
 * ## 표를 그래프로 바꾼 이유
 *
 * 전에는 「연구 / 우리 회사 / 판정」 세 칸짜리 표였다. 숫자는 다 있는데
 * **얼마나 가까운지가 눈에 안 들어왔다** — `+.46`과 `+.38`이 가까운 값인지
 * 아닌지를 머릿속에서 재야 했다. 열여섯 줄쯤 되면 그걸 열여섯 번 한다.
 *
 * 막대 두 개를 위아래로 붙여 놓으면 **길이 차이가 곧 답**이다. 끝이 거의
 * 같으면 맞은 것이고, 한쪽이 훌쩍 길면 어긋난 것이다. 숫자는 옆에 그대로
 * 두어 정확한 값도 읽을 수 있게 한다.
 *
 * ## 원형 그래프를 쓰지 않는다
 *
 * 상관은 **부호가 있는 값**이다. 원형은 전체를 100%로 놓고 조각을 나누는
 * 그림이라 `−.29`를 그릴 자리가 없다. 「맞은 칸 12 / 어긋난 칸 3」 정도는
 * 원형으로 그릴 수 있지만, 조각 셋짜리 원형은 **그냥 문장 한 줄보다 읽기
 * 어렵다.** 그래서 그 부분은 문장으로 적는다.
 *
 * ## 한 칸에 합치지 않는다
 *
 * 두 값의 평균을 내지 않는다. 표본도 지표도 나라도 다른 값이라 합치면
 * 없는 숫자를 만들어내는 셈이다 (11 §3.2, D-36). 나란히 놓기만 한다.
 */

export function ResearchCompare({ data }: { data: CompareSummary }) {
  if (!data.comparable && !data.directions.length)
    return (
      <p className="text-ink-secondary">
        양쪽에 값이 다 있는 칸이 없어 맞대 볼 수 없습니다.
      </p>
    );

  const off = data.comparable - data.compatible;

  return (
    <div>
      <p className="text-item text-ink-secondary mb-8 max-w-[52rem]">
        {data.comparable === 0 ? (
          <>숫자로 맞대 볼 수 있는 칸이 없습니다.</>
        ) : off === 0 ? (
          <>
            맞대 볼 수 있는 <span className="tabular">{data.comparable}</span>
            칸이 <strong>모두 우리 신뢰구간 안에</strong> 들어옵니다. 논문과
            어긋나는 곳은 아직 없습니다.
          </>
        ) : (
          <>
            <span className="tabular">{data.comparable}</span>칸 가운데{" "}
            <strong className="text-ink tabular">{off}</strong>칸이 우리
            신뢰구간을 벗어납니다 — <strong>우리 회사가 논문과 다르거나</strong>,
            아직 사람이 적어 흔들리는 것입니다.
          </>
        )}
      </p>

      {data.comparable > 0 && (
        <ul className="grid gap-x-12 gap-y-7 xl:grid-cols-2">
          {data.rows.map((r) => (
            <li key={`${r.scale} ${r.axis}`}>
              <Head
                scale={r.scale}
                axis={r.axis}
                verdict={<Verdict ok={r.compatible} diff={r.diff} />}
              />
              <Bar label="논문" r={r.research} hollow />
              <Bar label="우리 회사" r={r.ours} n={r.n} ci={r.ci} />
            </li>
          ))}
        </ul>
      )}

      {data.directions.length > 0 && (
        <div className="mt-14">
          <h3 className="text-section-title mb-1">방향만 세운 칸</h3>
          <p className="text-ink-secondary mb-6 max-w-[52rem]">
            {/* D-46 같은 설계 기록 번호는 화면에 내보내지 않는다 (2026-08-25) */}
            직접 잰 연구가 없어 가까운 개념으로 <strong>방향만</strong> 세운
            칸입니다. 숫자가 없으니 부호가 맞았는지만 봅니다.
          </p>
          <ul className="grid gap-x-12 gap-y-5 xl:grid-cols-2">
            {data.directions.map((d) => (
              <li
                key={`${d.scale} ${d.axis}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4"
              >
                <div>
                  <p className="text-table mb-1.5">
                    {d.scale} <span className="text-ink-muted">×</span> {d.axis}
                    <span className="text-axis text-ink-muted ml-2">
                      논문 쪽 예상 {d.expected > 0 ? "+" : "−"}
                    </span>
                  </p>
                  <Bar label="우리 회사" r={d.ours} n={d.n} ci={d.ci} />
                </div>
                <span
                  className="text-axis"
                  style={{
                    color: d.uncertain
                      ? "var(--ink-muted)"
                      : d.matches
                        ? "var(--status-good)"
                        : "var(--status-critical)",
                  }}
                >
                  {d.uncertain ? "아직 모름" : d.matches ? "방향 맞음" : "반대"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * 막대 한 줄 — 이름 · 막대 · 숫자.
 *
 * 논문 값과 우리 값을 **다른 색으로 칠하지 않는다.** 색은 이 화면에서 이미
 * 「방향」을 뜻하고 있어서(파랑 +, 주황 −) 출처까지 색으로 말하면 두 뜻이
 * 겹친다. 출처는 **왼쪽 이름과 채움 방식**으로 가른다 — 논문은 테두리만,
 * 우리 값은 꽉 채운다.
 *
 * 우리 값에는 **신뢰구간을 막대 아래 가는 선으로** 깐다. 막대만 있으면
 * `+.38`이 얼마나 흔들리는 값인지 안 보이는데, 논문과 맞대는 자리에서는
 * 그게 바로 판정 근거다 — 논문 값이 이 선 안에 들어오면 「맞은 것」이다.
 * 선을 막대 **가운데**에 두면 막대의 일부처럼 보여서 아래로 내렸다.
 */
function Bar({
  label,
  r,
  hollow = false,
  n,
  ci,
}: {
  label: string;
  r: number;
  hollow?: boolean;
  n?: number;
  ci?: [number, number];
}) {
  return (
    <div className="text-axis flex items-center gap-3 py-[3px]">
      <span className="text-ink-muted w-[4.75rem] shrink-0 truncate">
        {label}
      </span>
      <span className="block w-full max-w-[19rem] shrink">
        <DivergingBar
          r={r}
          hollow={hollow}
          ci={ci}
          height={16}
          title={n ? `${n}명` : undefined}
        />
      </span>
      <span className="tabular w-[4.5rem] shrink-0 text-right">{formatR(r)}</span>
    </div>
  );
}

/**
 * 조합 이름 줄 — 판정을 **이름 바로 뒤에** 붙인다.
 *
 * 오른쪽 끝으로 밀어 봤더니 이름이 짧은 줄에서는 판정이 저 멀리 떠서
 * 어느 조합의 판정인지 눈으로 이어야 했다. 이름과 판정을 한 덩어리로 두면
 * 그 줄만 읽어도 결론이 난다.
 *
 * ## α로 판정을 막지 않는다 (2026-08-25 사용자와 함께 확인)
 *
 * 한때 α가 기준 아래인 축은 판정 자리에 `α .08 · 기준 아래`를 적고
 * 「어긋남」을 감췄다. **α를 잘못 댄 것이었다** — 직무능력은 여러 요소가
 * 모여 이루는 값이라 문항끼리 안 맞물려도 정상이고, 상관 자체는 실제
 * 응답으로 낸 사실이다 (D-92).
 */
function Head({
  scale,
  axis,
  verdict,
}: {
  scale: string;
  axis: string;
  verdict: React.ReactNode;
}) {
  return (
    <p className="text-table mb-1.5 flex flex-wrap items-baseline gap-x-2">
      <span>
        {scale} <span className="text-ink-muted">×</span> {axis}
      </span>
      {verdict}
    </p>
  );
}

function Verdict({ ok, diff }: { ok: boolean; diff: number }) {
  return (
    <span
      className="text-axis"
      style={{ color: ok ? "var(--status-good)" : "var(--status-critical)" }}
      title={`우리 값 − 논문 값 = ${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(2)}`}
    >
      {ok ? "들어맞음" : "어긋남"}
    </span>
  );
}
