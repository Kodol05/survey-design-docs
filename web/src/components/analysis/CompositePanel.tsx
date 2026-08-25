import Link from "next/link";
import { formatR } from "./correlationColor";
import { SplitHeadline, SplitList } from "./SplitPanel";
import type { Split } from "@/lib/admin/split";
import { abilityColorAt } from "../charts/scale";
import { DivergingBar } from "./DivergingBar";
import type { Composite } from "@/lib/admin/composite";

/**
 * 세 능력을 묶은 값이 **무엇과 가장 연관되는가** (2026-08-25 사용자 요청).
 *
 * ## 이 화면이 답하는 것
 *
 * 위쪽 표는 「협력은 무엇과」, 「조직생활은 무엇과」를 따로 말한다. 그런데
 * 실제로 궁금한 것은 그다음이다 — **「전반적으로 일이 되는 사람은 어떤
 * 사람인가」.** 축 하나하나로는 그 답이 안 나온다.
 *
 * ## 묶어도 된다는 근거를 먼저 보여준다
 *
 * 서로 다른 것을 재는 축을 더하면 총합은 아무 뜻도 없어진다. 그래서 축끼리의
 * 상관과 묶었을 때의 α를 **결과보다 먼저** 둔다. 근거가 약하면 아래 그래프를
 * 읽지 말라는 뜻이고, 근거가 있으면 마음 놓고 읽으라는 뜻이다.
 *
 * 우리 데이터에서는 셋이 `+.33 ~ +.36`으로 묶여 α가 `.60`이 나온다 —
 * **개별 축보다 총합이 더 안정적이다.** 협력 하나는 `.08`이라 못 쓰는데,
 * 평균을 내면 각 축의 잡음이 상쇄되고 셋이 공유하는 부분만 남는다.
 */
export function CompositePanel({
  c,
  splits,
}: {
  c: Composite;
  splits: Split[];
}) {
  const shaky = c.verdict === "poor";

  return (
    <div>
      {/* ── 결론부터 ── */}
      <SplitHeadline splits={splits} />

      {/* ── 일곱 축 전부 ── */}
      <div className="mt-10">
        <div className="text-axis text-ink-muted mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span>일곱 축 전부 — 차이가 큰 순</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="block size-2.5 rounded-full"
                style={{ background: "var(--ink-muted)" }}
              />
              높은 무리
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="block size-2.5 rounded-full"
                style={{ outline: "2px solid var(--ink-muted)", outlineOffset: -2 }}
              />
              낮은 무리
            </span>
            <span>
              무리마다 <span className="tabular">{splits[0]?.groupN ?? 0}</span>명
            </span>
            <span>눈금 40·60·80점</span>
          </span>
        </div>
        <SplitList splits={splits} dim={shaky} />
      </div>

      {/* ── 묶어도 되는가 ── */}
      <div className="mt-10 grid gap-x-14 gap-y-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:items-start">
        <ul className="flex flex-col gap-1.5">
          {c.pairs.map((p) => (
            <li key={`${p.a}${p.b}`} className="text-axis flex items-center gap-3">
              <span className="text-ink-secondary w-[11rem] shrink-0">
                {p.a} <span className="text-ink-muted">×</span> {p.b}
              </span>
              <span className="block w-full max-w-[7rem] shrink">
                <DivergingBar r={p.r} height={11} />
              </span>
              <span className="tabular w-11 shrink-0 text-right">
                {formatR(p.r)}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-axis text-ink-secondary max-w-[44rem] leading-relaxed">
          <strong>평균을 낼 만한가</strong> — 세 능력이 서로 같이 움직여야
          평균이 뜻을 갖습니다. 셋을 묶으면{" "}
          {c.alpha !== null && (
            <strong
              className="tabular"
              style={{ color: shaky ? "var(--status-critical)" : undefined }}
            >
              α {c.alpha.toFixed(2).replace(/^0/, "")}
            </strong>
          )}
          {shaky ? (
            <>
              {" "}
              — <strong>아직 묶을 만하지 않습니다.</strong>
            </>
          ) : (
            <>
              {" "}
              입니다. 뜻밖에도 <strong>개별 축보다 안정적입니다</strong> — 평균을
              내면 각 축의 잡음이 서로 상쇄되기 때문입니다.
            </>
          )}{" "}
          <span className="text-ink-muted">
            세 축이 다 있는 <span className="tabular">{c.values.length}</span>
            명의 평균이고, 눈금은 그대로 0~100입니다.
          </span>
        </p>
      </div>

      {/* ── 사람 ── */}
      <Ranking c={c} />
    </div>
  );
}

/**
 * 총합이 높은 사람부터 (2026-08-25 사용자 결정).
 *
 * ## 「순위」 탭을 없애 놓고 왜 여기에 사람을 줄 세우는가
 *
 * 없앤 것은 **성향으로 직무능력을 가르던 화면**이다 — 상위·하위 3분의 1의
 * 평균 차이는 상관이 이미 말하는 것을 덜 정확하게 말하는 그림이었다.
 * 여기는 다르다. **직무능력 값 그 자체로 사람을 줄 세우는 것**이고,
 * 「종합적으로 잘하는 사람이 누구인가」에는 이 값 말고 답할 것이 없다.
 *
 * ## 두 줄로 나눈다
 *
 * 마흔 명을 한 줄로 세우면 1,000px가 넘어 화면 끝까지 스크롤해야 한다.
 * 왼쪽에 위쪽 절반, 오른쪽에 아래쪽 절반을 두면 **한 화면에 다 들어온다.**
 * 순서는 왼쪽 위에서 아래로, 그다음 오른쪽이다.
 */
function Ranking({ c }: { c: Composite }) {
  const sorted = [...c.values].sort(
    (a, b) => b.value - a.value || a.name.localeCompare(b.name, "ko"),
  );
  const half = Math.ceil(sorted.length / 2);
  const cols = [sorted.slice(0, half), sorted.slice(half)];
  const shaky = c.verdict === "poor";

  return (
    <div className="border-t border-[--border] pt-8">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-section-title">종합이 높은 사람부터</h3>
        <span className="text-axis text-ink-muted tabular">
          {sorted.length}명
        </span>
      </div>

      <p className="text-axis text-ink-secondary mb-5 max-w-[52rem] leading-relaxed">
        세 능력의 <strong>평균</strong>입니다. 축 하나가 유별난 사람보다{" "}
        <strong>셋이 고르게 높은 사람</strong>이 위로 옵니다.
        {shaky ? (
          <span style={{ color: "var(--status-critical)" }}>
            {" "}
            ⚠ 지금은 묶음이 안정적이지 않아 순서를 그대로 믿기 어렵습니다.
          </span>
        ) : (
          <span className="text-ink-muted">
            {" "}
            ⚠ 가까운 순위끼리는 몇 점 차이라 다시 재면 뒤바뀝니다. 위쪽 무리와
            아래쪽 무리를 가르는 정도로만 보십시오.
          </span>
        )}
      </p>

      <div className="grid gap-x-14 gap-y-1 lg:grid-cols-2">
        {cols.map((col, ci) => (
          <ul key={ci} className="flex flex-col">
            {col.map((p, i) => {
              const rank = ci * half + i + 1;
              return (
                <li
                  key={p.employeeId}
                  className="text-axis grid grid-cols-[2rem_minmax(0,7rem)_minmax(0,1fr)_2.75rem] items-center gap-3 border-b border-[--border] py-1.5 last:border-0"
                >
                  <span className="text-ink-muted tabular text-right">
                    {rank}
                  </span>
                  <Link
                    href={`/admin/employees/${p.employeeId}`}
                    // 밑줄을 늘 그으면 서른여덟 줄이 시끄럽다. 올렸을 때만
                    className="text-table truncate hover:underline"
                  >
                    {p.name}
                  </Link>
                  <span
                    className="block h-2.5 rounded-full"
                    style={{ background: "var(--grid)" }}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(2, Math.min(100, p.value))}%`,
                        background: abilityColorAt(p.value),
                      }}
                    />
                  </span>
                  <span className="tabular text-right font-medium">
                    {Math.round(p.value)}
                  </span>
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </div>
  );
}

/**
 * 한 줄 결론.
 *
 * ## 붙어 있으면 하나로 단정하지 않는다 (2026-08-25 화면에서 확인)
 *
 * 실제 데이터가 `−.32 / +.32 / +.31`로 나왔는데 「가장 크게 연관된 것은
 * 위험회피」라고 적혀 있었다. **`.01` 차이로 순위를 매긴 셈**이다 —
 * 40명 남짓에서 그 차이는 다시 재면 뒤집힌다.
 *
 * 그래서 맨 위와 사실상 같은 것들을 묶어 **여럿이면 여럿으로** 말한다.
 *
 * ## 기질인가 성격인가도 같이 말한다
 *
 * 위 표를 기질·성격으로 나눠 둔 이유가 「타고나는 쪽인가 만들어지는 쪽인가」
 * 였다. 총합에서도 그 답이 나오므로 한 마디로 적는다.
 */
